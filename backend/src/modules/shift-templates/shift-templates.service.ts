import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AssignmentEngineService } from '../assignment-engine/assignment-engine.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RequirementInput {
  employeeTypeId: string;
  requiredCount: number;
}

export interface MaterializedRequirementSummary {
  employeeTypeId: string;
  employeeTypeName: string;
  requiredCount: number;
  assignedEmployees: { employeeId: string; employeeName: string }[];
  pendingCount: number;
  pendingReasons: { employeeName: string; reasons: string[] }[];
}

export interface MaterializedShiftSummary {
  shiftId: string;
  departmentName: string;
  templateName: string;
  date: string;
  coverageStatus: string;
  requirements: MaterializedRequirementSummary[];
}

@Injectable()
export class ShiftTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentEngine: AssignmentEngineService,
  ) {}

  async findAll(tenantId?: string, departmentId?: string) {
    return this.prisma.shiftTemplate.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        department: true,
        shiftType: true,
        requirements: {
          include: { employeeType: true },
        },
      },
      orderBy: [{ departmentId: 'asc' }, { shiftType: { startTime: 'asc' } }],
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.shiftTemplate.findUnique({
      where: { id },
      include: {
        department: true,
        shiftType: true,
        requirements: { include: { employeeType: true } },
      },
    });
    if (!template) {
      throw new NotFoundException('Plantilla de turno no encontrada');
    }
    return template;
  }

  async create(data: { tenantId: string; departmentId: string; shiftTypeId: string }) {
    if (!data.tenantId || !data.departmentId) {
      throw new BadRequestException('El tenant y el área son obligatorios');
    }
    if (!data.shiftTypeId) {
      throw new BadRequestException('El bloque de turno es obligatorio');
    }

    const shiftType = await this.prisma.shiftType.findUnique({ where: { id: data.shiftTypeId } });
    if (!shiftType || shiftType.tenantId !== data.tenantId) {
      throw new BadRequestException('El bloque de turno no es válido');
    }

    const existing = await this.prisma.shiftTemplate.findFirst({
      where: { departmentId: data.departmentId, shiftTypeId: data.shiftTypeId },
    });
    if (existing) {
      throw new ConflictException('Ya existe un bloque de ese tipo para esta área');
    }

    return this.prisma.shiftTemplate.create({
      data: {
        tenantId: data.tenantId,
        departmentId: data.departmentId,
        shiftTypeId: data.shiftTypeId,
      },
      include: {
        department: true,
        shiftType: true,
        requirements: { include: { employeeType: true } },
      },
    });
  }

  async update(id: string, data: { active?: boolean; departmentId?: string }) {
    const template = await this.prisma.shiftTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException('Plantilla de turno no encontrada');
    }

    if (data.departmentId) {
      const duplicate = await this.prisma.shiftTemplate.findFirst({
        where: { departmentId: data.departmentId, shiftTypeId: template.shiftTypeId, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException('Ya existe un bloque de ese tipo para esta área');
      }
    }

    return this.prisma.shiftTemplate.update({
      where: { id },
      data: {
        active: data.active,
        departmentId: data.departmentId,
      },
      include: {
        department: true,
        shiftType: true,
        requirements: { include: { employeeType: true } },
      },
    });
  }

  async remove(id: string) {
    const template = await this.prisma.shiftTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException('Plantilla de turno no encontrada');
    }
    await this.prisma.shiftTemplate.delete({ where: { id } });
    return { ok: true };
  }

  async getRequirements(shiftTemplateId: string) {
    await this.findOne(shiftTemplateId);
    const requirements = await this.prisma.shiftTemplateRequirement.findMany({
      where: { shiftTemplateId },
      include: { employeeType: true },
    });
    return requirements.map((requirement) => ({
      id: requirement.id,
      employeeTypeId: requirement.employeeTypeId,
      employeeTypeName: requirement.employeeType.name,
      requiredCount: requirement.requiredCount,
    }));
  }

  async setRequirements(shiftTemplateId: string, requirements: RequirementInput[]) {
    const template = await this.findOne(shiftTemplateId);
    if (!Array.isArray(requirements)) {
      throw new BadRequestException('La lista de requerimientos no es válida');
    }

    const cleaned = requirements
      .filter((item) => item.employeeTypeId && Number(item.requiredCount) > 0)
      .map((item) => ({ employeeTypeId: item.employeeTypeId, requiredCount: Math.floor(Number(item.requiredCount)) }));

    await this.prisma.$transaction(async (tx) => {
      await tx.shiftTemplateRequirement.deleteMany({
        where: { shiftTemplateId, employeeTypeId: { notIn: cleaned.map((item) => item.employeeTypeId) } },
      });

      for (const item of cleaned) {
        await tx.shiftTemplateRequirement.upsert({
          where: { shiftTemplateId_employeeTypeId: { shiftTemplateId, employeeTypeId: item.employeeTypeId } },
          update: { requiredCount: item.requiredCount },
          create: {
            tenantId: template.tenantId,
            shiftTemplateId,
            employeeTypeId: item.employeeTypeId,
            requiredCount: item.requiredCount,
          },
        });
      }
    });

    return this.getRequirements(shiftTemplateId);
  }

  // ---------------------------------------------------------------------
  // Generación masiva de turnos a partir de plantillas
  // ---------------------------------------------------------------------

  async generate(data: { tenantId: string; startDate: string; endDate: string; departmentIds?: string[]; assignedBy?: string }) {
    if (!data.tenantId || !data.startDate || !data.endDate) {
      throw new BadRequestException('El tenant y el rango de fechas son obligatorios');
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      throw new BadRequestException('El rango de fechas no es válido');
    }

    const templates = await this.prisma.shiftTemplate.findMany({
      where: {
        tenantId: data.tenantId,
        active: true,
        ...(data.departmentIds?.length ? { departmentId: { in: data.departmentIds } } : {}),
      },
      include: { requirements: true, shiftType: true },
    });

    const startMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endMs = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

    const shiftsSummary: MaterializedShiftSummary[] = [];
    let skipped = 0;

    // Secuencial a propósito: autoAssign() debe ver las asignaciones que ya
    // creó el turno anterior del mismo loop (mismo empleado no puede quedar
    // doble-reservado el mismo día). Correrlo en paralelo rompería esa regla.
    for (let dayMs = startMs; dayMs <= endMs; dayMs += MS_PER_DAY) {
      const day = new Date(dayMs);

      for (const template of templates) {
        const existing = await this.prisma.shift.findFirst({
          where: { shiftTemplateId: template.id, date: day },
        });
        if (existing) {
          skipped += 1;
          continue;
        }

        const summary = await this.materializeShift(template, day, data.tenantId, data.assignedBy);
        shiftsSummary.push(summary);
      }
    }

    return {
      generated: shiftsSummary.length,
      skipped,
      fullyCovered: shiftsSummary.filter((item) => item.coverageStatus === 'COVERED').length,
      partiallyCovered: shiftsSummary.filter((item) => item.coverageStatus === 'PARTIALLY_COVERED').length,
      uncovered: shiftsSummary.filter((item) => item.coverageStatus === 'UNCOVERED').length,
      shifts: shiftsSummary,
    };
  }

  /**
   * Variante de generate() para el botón "Automatizar turnos": en vez de pedir un
   * rango de fechas, calcula sola la "próxima fecha sin cobertura" para cada
   * plantilla activa del área (el primer día, arrancando hoy, en el que todavía
   * no existe un Shift para esa plantilla) y genera un único turno por plantilla
   * en esa fecha. requirements permite pisar puntualmente el personal requerido
   * de esos turnos sin tocar ShiftTemplateRequirement de la plantilla base.
   */
  async generateNextUncovered(data: {
    tenantId: string;
    departmentId: string;
    requirements?: RequirementInput[];
    maxLookaheadDays?: number;
    assignedBy?: string;
  }) {
    if (!data.tenantId || !data.departmentId) {
      throw new BadRequestException('El tenant y el área son obligatorios');
    }

    const lookaheadDays = Math.min(Math.max(Math.floor(data.maxLookaheadDays ?? 60), 1), 180);

    const templates = await this.prisma.shiftTemplate.findMany({
      where: { tenantId: data.tenantId, departmentId: data.departmentId, active: true },
      include: { requirements: true, shiftType: true },
    });

    if (!templates.length) {
      throw new BadRequestException('El área no tiene bloques de turno configurados');
    }

    const today = new Date();
    const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const rangeEnd = new Date(todayMs + lookaheadDays * MS_PER_DAY);

    const shiftsSummary: MaterializedShiftSummary[] = [];
    const skippedTemplates: { templateId: string; shiftTypeName: string; reason: 'NO_FREE_DATE_IN_RANGE' }[] = [];

    // Secuencial por la misma razón que generate(): autoAssign() de un bloque
    // debe ver las asignaciones que ya hizo el bloque anterior del mismo loop.
    for (const template of templates) {
      const existingShifts = await this.prisma.shift.findMany({
        where: { shiftTemplateId: template.id, date: { gte: new Date(todayMs), lt: rangeEnd } },
        select: { date: true },
      });
      const occupiedDaysMs = new Set(existingShifts.map((shift) => shift.date.getTime()));

      let targetDayMs: number | null = null;
      for (let offset = 0; offset < lookaheadDays; offset += 1) {
        const candidateMs = todayMs + offset * MS_PER_DAY;
        if (!occupiedDaysMs.has(candidateMs)) {
          targetDayMs = candidateMs;
          break;
        }
      }

      if (targetDayMs === null) {
        // Los próximos `lookaheadDays` días ya tienen turno para esta plantilla:
        // dato mal configurado o generación repetida sin avanzar el horizonte.
        // Se informa en vez de loopear indefinidamente o romper el resto del área.
        skippedTemplates.push({ templateId: template.id, shiftTypeName: template.shiftType.name, reason: 'NO_FREE_DATE_IN_RANGE' });
        continue;
      }

      const summary = await this.materializeShift(template, new Date(targetDayMs), data.tenantId, data.assignedBy, data.requirements);
      shiftsSummary.push(summary);
    }

    return {
      generated: shiftsSummary.length,
      fullyCovered: shiftsSummary.filter((item) => item.coverageStatus === 'COVERED').length,
      partiallyCovered: shiftsSummary.filter((item) => item.coverageStatus === 'PARTIALLY_COVERED').length,
      uncovered: shiftsSummary.filter((item) => item.coverageStatus === 'UNCOVERED').length,
      shifts: shiftsSummary,
      skippedTemplates,
    };
  }

  /**
   * Crea el Shift real para (plantilla, día), aplica el personal requerido
   * (requirementsOverride si viene, si no el de la plantilla), corre
   * autoAssign() y arma el resumen enriquecido con asignados por rol (nombre)
   * y el motivo real de cada pendiente — resuelto acá con un refetch propio en
   * vez de tocar assignment-engine.service.ts, que se mantiene intacto.
   */
  private async materializeShift(
    template: {
      id: string;
      departmentId: string;
      shiftType: { name: string; startTime: string; endTime: string; nightShift: boolean };
      requirements: RequirementInput[];
    },
    day: Date,
    tenantId: string,
    assignedBy: string | undefined,
    requirementsOverride?: RequirementInput[],
  ): Promise<MaterializedShiftSummary> {
    const dayMs = day.getTime();
    const crossesMidnight = template.shiftType.nightShift || template.shiftType.endTime < template.shiftType.startTime;
    const endDateForShift = crossesMidnight ? new Date(dayMs + MS_PER_DAY) : day;

    const shift = await this.prisma.shift.create({
      data: {
        tenantId,
        departmentId: template.departmentId,
        // OJO: no seteamos shiftTypeId acá a propósito. evaluateEmployee()
        // exige Availability registrada cuando shift.shiftTypeId está
        // presente, y hoy no existe ninguna pantalla para que un empleado
        // cargue su disponibilidad — dejarlo activaría un filtro que
        // excluye a todo el mundo siempre. shiftTemplateId ya alcanza
        // para saber de qué bloque salió este turno.
        shiftTemplateId: template.id,
        date: day,
        startDate: day,
        endDate: endDateForShift,
        startTime: template.shiftType.startTime,
        endTime: template.shiftType.endTime,
        status: 'DRAFT',
      },
    });

    const requirementsToApply = requirementsOverride?.length ? requirementsOverride : template.requirements;

    let ineligible: { employeeId: string; employeeName: string; employeeTypeName: string | null; reasons: string[] }[] = [];

    if (requirementsToApply.length) {
      await this.prisma.shiftStaffRequirement.createMany({
        data: requirementsToApply.map((requirement) => ({
          tenantId,
          shiftId: shift.id,
          employeeTypeId: requirement.employeeTypeId,
          requiredCount: requirement.requiredCount,
        })),
      });
      // evaluateCandidates() exige al menos un ShiftStaffRequirement — una
      // plantilla sin personal requerido configurado no tiene nada que
      // auto-asignar, así que el turno queda creado en DRAFT/UNCOVERED.
      const autoAssignResult = await this.assignmentEngine.autoAssign(shift.id, assignedBy);
      ineligible = autoAssignResult.ineligible;
    }

    const finalShift = await this.prisma.shift.findUnique({
      where: { id: shift.id },
      include: {
        department: true,
        staffRequirements: { include: { employeeType: true } },
        assignments: {
          where: { status: { not: 'CANCELLED' } },
          include: { employee: { include: { user: true } } },
        },
      },
    });

    const assignedByType = new Map<string, { employeeId: string; employeeName: string }[]>();
    for (const assignment of finalShift?.assignments || []) {
      const typeId = assignment.employee.employeeTypeId;
      if (!typeId) continue;
      const list = assignedByType.get(typeId) || [];
      list.push({
        employeeId: assignment.employeeId,
        employeeName: `${assignment.employee.user?.firstName || ''} ${assignment.employee.user?.lastName || ''}`.trim() || 'Empleado',
      });
      assignedByType.set(typeId, list);
    }

    const requirementsSummary: MaterializedRequirementSummary[] = (finalShift?.staffRequirements || []).map((requirement) => {
      const assignedEmployees = assignedByType.get(requirement.employeeTypeId) || [];
      const pendingReasons = ineligible
        .filter((item) => item.employeeTypeName === requirement.employeeType.name)
        .map((item) => ({ employeeName: item.employeeName, reasons: item.reasons }));
      return {
        employeeTypeId: requirement.employeeTypeId,
        employeeTypeName: requirement.employeeType.name,
        requiredCount: requirement.requiredCount,
        assignedEmployees,
        pendingCount: Math.max(requirement.requiredCount - assignedEmployees.length, 0),
        pendingReasons,
      };
    });

    return {
      shiftId: shift.id,
      departmentName: finalShift?.department?.name || '',
      templateName: template.shiftType.name,
      date: day.toISOString().slice(0, 10),
      coverageStatus: finalShift?.coverageStatus || 'UNCOVERED',
      requirements: requirementsSummary,
    };
  }
}
