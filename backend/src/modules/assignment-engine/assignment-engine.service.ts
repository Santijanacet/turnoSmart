import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  getEligibleEmployees,
  type AssignmentRules,
  type EmployeeCandidate,
  type ExistingShiftEntry,
  type ShiftToCover,
} from './assignment-engine.logic';

const MS_PER_HOUR = 1000 * 60 * 60;

type EligibilityReasonCode =
  | 'INACTIVE'
  | 'TYPE_MISMATCH'
  | 'ALREADY_ASSIGNED'
  | 'OVERLAP'
  | 'MIN_REST'
  | 'MAX_HOURS_DAY'
  | 'MAX_HOURS_WEEK'
  | 'MAX_NIGHT_SHIFTS'
  | 'NOT_AVAILABLE'
  | 'DEPARTMENT_FULL';

export interface EligibilityResult {
  employeeId: string;
  employeeName: string;
  employeeTypeId: string | null;
  employeeTypeName: string | null;
  departmentId: string | null;
  eligible: boolean;
  availabilityStatus: 'AVAILABLE' | 'NOT_AVAILABLE' | 'UNKNOWN';
  reasons: string[];
  reasonCodes: EligibilityReasonCode[];
  metrics: {
    hoursThisWeek: number;
    hoursThisDay: number;
    nightShiftsInPeriod: number;
    totalAssignments: number;
    hoursSinceLastAssignment: number | null;
  };
}

@Injectable()
export class AssignmentEngineService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // Scheduling policy (configurable rules: max hours, min rest, max nights)
  // ---------------------------------------------------------------------

  async getPolicy(tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId es obligatorio');
    return this.prisma.schedulingPolicy.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId },
    });
  }

  async upsertPolicy(
    tenantId: string,
    data: Record<string, number | string | null | undefined>,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId es obligatorio');
    const sanitized: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || value === '') continue;
      const numeric = Number(value);
      if (Number.isNaN(numeric) || numeric <= 0) {
        throw new BadRequestException(`El valor de ${key} debe ser un número mayor a cero`);
      }
      sanitized[key] = numeric;
    }

    return this.prisma.schedulingPolicy.upsert({
      where: { tenantId },
      update: sanitized,
      create: { tenantId, ...sanitized },
    });
  }

  // ---------------------------------------------------------------------
  // Staff requirements per shift
  // ---------------------------------------------------------------------

  async getRequirements(shiftId: string) {
    const shift = await this.loadShift(shiftId);
    const requirements = await this.prisma.shiftStaffRequirement.findMany({
      where: { shiftId },
      include: { employeeType: true },
    });

    return requirements.map((requirement) => {
      const assignedCount = shift.assignments.filter(
        (assignment) => assignment.employee.employeeTypeId === requirement.employeeTypeId,
      ).length;
      return {
        id: requirement.id,
        employeeTypeId: requirement.employeeTypeId,
        employeeTypeName: requirement.employeeType.name,
        requiredCount: requirement.requiredCount,
        assignedCount,
        pendingCount: Math.max(requirement.requiredCount - assignedCount, 0),
      };
    });
  }

  async setRequirements(
    shiftId: string,
    requirements: { employeeTypeId: string; requiredCount: number }[],
  ) {
    const shift = await this.loadShift(shiftId);
    if (!Array.isArray(requirements)) {
      throw new BadRequestException('La lista de requerimientos no es válida');
    }

    const cleaned = requirements
      .filter((item) => item.employeeTypeId && Number(item.requiredCount) > 0)
      .map((item) => ({ employeeTypeId: item.employeeTypeId, requiredCount: Math.floor(Number(item.requiredCount)) }));

    await this.prisma.$transaction(async (tx) => {
      await tx.shiftStaffRequirement.deleteMany({
        where: { shiftId, employeeTypeId: { notIn: cleaned.map((item) => item.employeeTypeId) } },
      });

      for (const item of cleaned) {
        await tx.shiftStaffRequirement.upsert({
          where: { shiftId_employeeTypeId: { shiftId, employeeTypeId: item.employeeTypeId } },
          update: { requiredCount: item.requiredCount },
          create: {
            tenantId: shift.tenantId,
            shiftId,
            employeeTypeId: item.employeeTypeId,
            requiredCount: item.requiredCount,
          },
        });
      }
    });

    return this.getRequirements(shiftId);
  }

  // ---------------------------------------------------------------------
  // Candidate evaluation
  // ---------------------------------------------------------------------

  async evaluateCandidates(shiftId: string) {
    const shift = await this.loadShift(shiftId);
    const requirements = await this.prisma.shiftStaffRequirement.findMany({ where: { shiftId } });

    if (!requirements.length) {
      throw new BadRequestException('Define primero el personal requerido (tipos y cantidades) para este turno');
    }

    const policy = await this.getPolicy(shift.tenantId);
    const requiredTypeIds = requirements.map((requirement) => requirement.employeeTypeId);

    const employees = await this.prisma.employee.findMany({
      where: { tenantId: shift.tenantId, employeeTypeId: { in: requiredTypeIds } },
      include: { user: true, employeeType: true, department: true, availability: true },
    });

    const employeeIds = employees.map((employee) => employee.id);
    const otherAssignments = employeeIds.length
      ? await this.prisma.shiftAssignment.findMany({
          where: { employeeId: { in: employeeIds }, status: { not: 'CANCELLED' } },
          include: { shift: { include: { shiftType: true } } },
        })
      : [];

    const shiftWindow = this.getShiftWindow(shift);
    const shiftIsNight = this.isNightShift(shift);

    const results: EligibilityResult[] = employees.map((employee) => {
      const requirement = requirements.find((item) => item.employeeTypeId === employee.employeeTypeId);
      const employeeAssignments = otherAssignments.filter((assignment) => assignment.employeeId === employee.id);
      return this.evaluateEmployee(employee, shift, requirement!, policy, employeeAssignments, shiftWindow, shiftIsNight);
    });

    const eligible = results.filter((result) => result.eligible);
    const ineligible = results.filter((result) => !result.eligible);

    return { requirements: await this.getRequirements(shiftId), eligible, ineligible };
  }

  // ---------------------------------------------------------------------
  // Candidatos sugeridos (algoritmo real de asignación, usa la función pura
  // getEligibleEmployees para poder testearla de forma aislada de Prisma/Nest).
  // ---------------------------------------------------------------------

  async suggestCandidates(shiftId: string) {
    const shift = await this.loadShift(shiftId);
    const policy = await this.getPolicy(shift.tenantId);

    const employees = await this.prisma.employee.findMany({
      where: { tenantId: shift.tenantId },
      include: { user: true, employeeType: true, departments: true },
    });

    const employeeIds = employees.map((employee) => employee.id);

    const [assignments, approvedRequests] = await Promise.all([
      employeeIds.length
        ? this.prisma.shiftAssignment.findMany({
            where: { employeeId: { in: employeeIds }, status: { not: 'CANCELLED' } },
            include: { shift: { include: { shiftType: true } } },
          })
        : Promise.resolve([]),
      employeeIds.length
        ? this.prisma.shiftRequest.findMany({
            where: { employeeId: { in: employeeIds }, status: 'APPROVED' },
          })
        : Promise.resolve([]),
    ]);

    const shiftWindow = this.getShiftWindow(shift);
    const shiftIsNight = this.isNightShift(shift);

    const shiftToCover: ShiftToCover = {
      id: shift.id,
      departmentId: shift.departmentId,
      start: shiftWindow.start,
      end: shiftWindow.end,
      isNight: shiftIsNight,
    };

    const candidatePool: EmployeeCandidate[] = employees.map((employee) => {
      const certifiedDepartmentIds = [
        employee.departmentId,
        ...employee.departments.map((item) => item.departmentId),
      ].filter((id): id is string => Boolean(id));

      const pastDepartmentIds = assignments
        .filter((assignment) => assignment.employeeId === employee.id && assignment.shift.departmentId)
        .map((assignment) => assignment.shift.departmentId as string);

      return {
        id: employee.id,
        name: `${employee.user?.firstName || ''} ${employee.user?.lastName || ''}`.trim() || 'Empleado',
        active: Boolean(employee.active && employee.user?.active !== false),
        employeeTypeId: employee.employeeTypeId,
        certifiedDepartmentIds: [...new Set(certifiedDepartmentIds)],
        pastDepartmentIds: [...new Set(pastDepartmentIds)],
      };
    });

    const existingShifts: ExistingShiftEntry[] = [
      ...assignments.map((assignment) => {
        const window = this.getShiftWindow(assignment.shift);
        return {
          employeeId: assignment.employeeId,
          shiftId: assignment.shiftId,
          start: window.start,
          end: window.end,
          isNight: this.isNightShift(assignment.shift),
          kind: 'ASSIGNMENT' as const,
        };
      }),
      ...approvedRequests.map((request) => {
        const dayStart = new Date(request.requestedDate);
        dayStart.setHours(0, 0, 0, 0);
        return {
          employeeId: request.employeeId,
          shiftId: `leave-${request.id}`,
          start: dayStart,
          end: new Date(dayStart.getTime() + 24 * MS_PER_HOUR),
          isNight: false,
          kind: 'APPROVED_LEAVE' as const,
        };
      }),
    ];

    const rules: AssignmentRules = {
      minRestHours: policy.minRestHours,
      maxHoursPerWeek: policy.maxHoursPerWeek,
      maxNightShiftsPerPeriod: policy.maxNightShiftsPerPeriod,
      periodStart: this.getWeekStart(shiftWindow.start),
      periodEnd: new Date(this.getWeekStart(shiftWindow.start).getTime() + 7 * 24 * MS_PER_HOUR),
    };

    const evaluations = getEligibleEmployees(shiftToCover, candidatePool, existingShifts, rules);
    const employeeTypeNames = new Map(employees.map((employee) => [employee.id, employee.employeeType?.name || null]));

    return {
      shiftId,
      candidates: evaluations.map((evaluation) => ({
        ...evaluation,
        employeeTypeName: employeeTypeNames.get(evaluation.employeeId) || null,
        lastShiftEnd: evaluation.lastShiftEnd ? evaluation.lastShiftEnd.toISOString() : null,
      })),
    };
  }

  async autoAssign(shiftId: string, assignedBy?: string) {
    const shift = await this.loadShift(shiftId);
    const { eligible, ineligible } = await this.evaluateCandidates(shiftId);
    const requirements = await this.prisma.shiftStaffRequirement.findMany({ where: { shiftId } });

    const currentTotalAssigned = shift.assignments.length;
    let remainingDepartmentCapacity = shift.department?.maxStaff
      ? Math.max(shift.department.maxStaff - currentTotalAssigned, 0)
      : Infinity;

    const assignedEmployeeIds: string[] = [];
    const perType: Record<string, { employeeTypeId: string; employeeTypeName: string; required: number; alreadyAssigned: number; newlyAssigned: number }> = {};

    for (const requirement of requirements) {
      const employeeType = await this.prisma.employeeType.findUnique({ where: { id: requirement.employeeTypeId } });
      const alreadyAssigned = shift.assignments.filter(
        (assignment) => assignment.employee.employeeTypeId === requirement.employeeTypeId,
      ).length;
      const pending = Math.max(requirement.requiredCount - alreadyAssigned, 0);

      perType[requirement.employeeTypeId] = {
        employeeTypeId: requirement.employeeTypeId,
        employeeTypeName: employeeType?.name || 'Tipo desconocido',
        required: requirement.requiredCount,
        alreadyAssigned,
        newlyAssigned: 0,
      };

      if (pending === 0) continue;

      const candidates = this.prioritize(eligible.filter((result) => result.employeeTypeId === requirement.employeeTypeId));

      for (const candidate of candidates) {
        if (perType[requirement.employeeTypeId].newlyAssigned >= pending) break;
        if (remainingDepartmentCapacity <= 0) break;

        await this.createAssignment(shift, candidate.employeeId, assignedBy);
        assignedEmployeeIds.push(candidate.employeeId);
        perType[requirement.employeeTypeId].newlyAssigned += 1;
        remainingDepartmentCapacity -= 1;
      }
    }

    const perTypeSummary = Object.values(perType).map((item) => ({
      employeeTypeId: item.employeeTypeId,
      employeeTypeName: item.employeeTypeName,
      required: item.required,
      assigned: item.alreadyAssigned + item.newlyAssigned,
      pending: Math.max(item.required - (item.alreadyAssigned + item.newlyAssigned), 0),
      newlyAssigned: item.newlyAssigned,
    }));

    const totalRequired = perTypeSummary.reduce((sum, item) => sum + item.required, 0);
    const totalAssigned = perTypeSummary.reduce((sum, item) => sum + item.assigned, 0);
    const totalPending = perTypeSummary.reduce((sum, item) => sum + item.pending, 0);

    return {
      shiftId,
      coverage: totalPending === 0 ? 'COMPLETA' : 'INCOMPLETA',
      totalRequired,
      totalAssigned,
      totalPending,
      perType: perTypeSummary,
      assignedEmployeeIds,
      ineligible: ineligible.map((result) => ({
        employeeId: result.employeeId,
        employeeName: result.employeeName,
        employeeTypeName: result.employeeTypeName,
        reasons: result.reasons,
      })),
    };
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async loadShift(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        department: true,
        shiftType: true,
        assignments: {
          where: { status: { not: 'CANCELLED' } },
          include: { employee: true },
        },
      },
    });
    if (!shift) throw new NotFoundException('Turno no encontrado');
    return shift;
  }

  private getShiftWindow(shift: { startDate: Date; endDate: Date; startTime: string; endTime: string }) {
    const start = this.combineDateAndTime(shift.startDate, shift.startTime);
    const end = this.combineDateAndTime(shift.endDate, shift.endTime);
    return { start, end: end <= start ? new Date(end.getTime() + 24 * MS_PER_HOUR) : end };
  }

  private combineDateAndTime(date: Date, time: string) {
    const [hours, minutes] = (time || '00:00').split(':').map((part) => Number(part) || 0);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  private getWeekStart(date: Date) {
    const weekStart = new Date(date.getTime() - date.getDay() * MS_PER_HOUR * 24);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private isNightShift(shift: { shiftType?: { nightShift: boolean } | null; startTime: string; endTime: string }) {
    if (shift.shiftType) return shift.shiftType.nightShift;
    return shift.endTime < shift.startTime;
  }

  private overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    return aStart < bEnd && bStart < aEnd;
  }

  private evaluateEmployee(
    employee: any,
    shift: any,
    requirement: { requiredCount: number },
    policy: { maxHoursPerDay: number; maxHoursPerWeek: number; minRestHours: number; maxNightShiftsPerPeriod: number; nightShiftPeriodDays: number },
    employeeAssignments: any[],
    shiftWindow: { start: Date; end: Date },
    shiftIsNight: boolean,
  ): EligibilityResult {
    const reasons: string[] = [];
    const reasonCodes: EligibilityReasonCode[] = [];

    if (!employee.active || employee.user?.active === false) {
      reasons.push('El empleado se encuentra inactivo.');
      reasonCodes.push('INACTIVE');
    }

    const alreadyOnThisShift = employeeAssignments.some((assignment) => assignment.shiftId === shift.id);
    if (alreadyOnThisShift) {
      reasons.push('El empleado ya está asignado a este turno.');
      reasonCodes.push('ALREADY_ASSIGNED');
    }

    let hasOverlap = false;
    let restViolation = false;
    let hoursThisDay = 0;
    let hoursThisWeek = 0;
    let nightShiftsInPeriod = 0;
    let lastAssignmentEnd: Date | null = null;

    const dayStart = new Date(shiftWindow.start.getFullYear(), shiftWindow.start.getMonth(), shiftWindow.start.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * MS_PER_HOUR);
    const weekStart = new Date(shiftWindow.start.getTime() - shiftWindow.start.getDay() * MS_PER_HOUR * 24);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * MS_PER_HOUR);
    const nightPeriodStart = new Date(shiftWindow.start.getTime() - policy.nightShiftPeriodDays * 24 * MS_PER_HOUR);

    for (const assignment of employeeAssignments) {
      if (assignment.shiftId === shift.id) continue;
      const otherWindow = this.getShiftWindow(assignment.shift);
      const otherDuration = (otherWindow.end.getTime() - otherWindow.start.getTime()) / MS_PER_HOUR;

      if (this.overlaps(shiftWindow.start, shiftWindow.end, otherWindow.start, otherWindow.end)) {
        hasOverlap = true;
      } else {
        const gapHours = otherWindow.end <= shiftWindow.start
          ? (shiftWindow.start.getTime() - otherWindow.end.getTime()) / MS_PER_HOUR
          : (otherWindow.start.getTime() - shiftWindow.end.getTime()) / MS_PER_HOUR;
        if (gapHours >= 0 && gapHours < policy.minRestHours) {
          restViolation = true;
        }
      }

      if (this.overlaps(dayStart, dayEnd, otherWindow.start, otherWindow.end)) {
        hoursThisDay += otherDuration;
      }
      if (this.overlaps(weekStart, weekEnd, otherWindow.start, otherWindow.end)) {
        hoursThisWeek += otherDuration;
      }
      if (this.isNightShift(assignment.shift) && otherWindow.start >= nightPeriodStart && otherWindow.start <= shiftWindow.start) {
        nightShiftsInPeriod += 1;
      }
      if (!lastAssignmentEnd || otherWindow.end > lastAssignmentEnd) {
        lastAssignmentEnd = otherWindow.end;
      }
    }

    if (hasOverlap) {
      reasons.push('El empleado tiene un turno que se solapa con el horario solicitado.');
      reasonCodes.push('OVERLAP');
    }
    if (restViolation) {
      reasons.push(`El empleado no cumple el descanso mínimo de ${policy.minRestHours} horas.`);
      reasonCodes.push('MIN_REST');
    }

    const shiftDurationHours = (shiftWindow.end.getTime() - shiftWindow.start.getTime()) / MS_PER_HOUR;
    const projectedDayHours = hoursThisDay + shiftDurationHours;
    const projectedWeekHours = hoursThisWeek + shiftDurationHours;

    if (projectedDayHours > policy.maxHoursPerDay) {
      reasons.push(`El empleado superaría el máximo de horas permitido por día (${policy.maxHoursPerDay}h).`);
      reasonCodes.push('MAX_HOURS_DAY');
    }
    if (projectedWeekHours > policy.maxHoursPerWeek) {
      reasons.push(`El empleado superaría el máximo de horas permitido por semana (${policy.maxHoursPerWeek}h).`);
      reasonCodes.push('MAX_HOURS_WEEK');
    }

    if (shiftIsNight && nightShiftsInPeriod >= policy.maxNightShiftsPerPeriod) {
      reasons.push(`El empleado alcanzó el máximo de turnos nocturnos permitidos (${policy.maxNightShiftsPerPeriod}).`);
      reasonCodes.push('MAX_NIGHT_SHIFTS');
    }

    let availabilityStatus: 'AVAILABLE' | 'NOT_AVAILABLE' | 'UNKNOWN' = 'UNKNOWN';
    if (shift.shiftTypeId) {
      const dayOfWeek = shiftWindow.start.getDay();
      const availabilityRecord = (employee.availability as any[] | undefined)?.find(
        (item) => item.dayOfWeek === dayOfWeek && item.shiftTypeId === shift.shiftTypeId,
      );
      if (!availabilityRecord || !availabilityRecord.available) {
        availabilityStatus = 'NOT_AVAILABLE';
        reasons.push('El empleado no tiene disponibilidad registrada para este turno.');
        reasonCodes.push('NOT_AVAILABLE');
      } else {
        availabilityStatus = 'AVAILABLE';
      }
    }

    return {
      employeeId: employee.id,
      employeeName: `${employee.user?.firstName || ''} ${employee.user?.lastName || ''}`.trim(),
      employeeTypeId: employee.employeeTypeId,
      employeeTypeName: employee.employeeType?.name || null,
      departmentId: employee.departmentId,
      eligible: reasons.length === 0,
      availabilityStatus,
      reasons,
      reasonCodes,
      metrics: {
        hoursThisWeek,
        hoursThisDay,
        nightShiftsInPeriod,
        totalAssignments: employeeAssignments.length,
        hoursSinceLastAssignment: lastAssignmentEnd
          ? (shiftWindow.start.getTime() - lastAssignmentEnd.getTime()) / MS_PER_HOUR
          : null,
      },
    };
  }

  private prioritize(candidates: EligibilityResult[]) {
    return [...candidates].sort((a, b) => {
      if (a.metrics.hoursThisWeek !== b.metrics.hoursThisWeek) return a.metrics.hoursThisWeek - b.metrics.hoursThisWeek;
      if (a.metrics.totalAssignments !== b.metrics.totalAssignments) return a.metrics.totalAssignments - b.metrics.totalAssignments;
      if (a.metrics.nightShiftsInPeriod !== b.metrics.nightShiftsInPeriod) return a.metrics.nightShiftsInPeriod - b.metrics.nightShiftsInPeriod;
      const aSince = a.metrics.hoursSinceLastAssignment ?? Infinity;
      const bSince = b.metrics.hoursSinceLastAssignment ?? Infinity;
      if (aSince !== bSince) return bSince - aSince;
      return a.employeeId.localeCompare(b.employeeId);
    });
  }

  private async createAssignment(shift: { id: string; tenantId: string; date: Date }, employeeId: string, assignedBy?: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, include: { user: true } });
    if (!employee) return;

    await this.prisma.shiftAssignment.upsert({
      where: { shiftId_employeeId: { shiftId: shift.id, employeeId } },
      update: { status: 'ASSIGNED', assignedBy },
      create: {
        tenantId: shift.tenantId,
        shiftId: shift.id,
        employeeId,
        assignedBy,
        status: 'ASSIGNED',
      },
    });

    if (employee.user) {
      await this.prisma.notification.create({
        data: {
          tenantId: shift.tenantId,
          userId: employee.userId,
          title: 'Nuevo turno asignado automáticamente',
          message: `El motor de asignación automática te asignó un turno para el ${new Date(shift.date).toLocaleDateString()}.`,
        },
      });
    }
  }
}
