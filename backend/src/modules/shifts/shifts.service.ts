import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AssignmentEngineService } from '../assignment-engine/assignment-engine.service';

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentEngine: AssignmentEngineService,
  ) {}

  async findAll(tenantId?: string) {
    return this.prisma.shift.findMany({
      where: tenantId ? { tenantId } : undefined,
      select: {
        id: true,
        tenantId: true,
        departmentId: true,
        shiftTypeId: true,
        date: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        status: true,
        coverageStatus: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        shiftType: true,
        assignments: {
          where: { status: { not: 'CANCELLED' } },
          select: {
            employeeId: true,
            employee: {
              select: {
                userId: true,
                employeeTypeId: true,
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.shift.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        departmentId: true,
        shiftTypeId: true,
        date: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        status: true,
        coverageStatus: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        shiftType: true,
        assignments: {
          where: { status: { not: 'CANCELLED' } },
          select: {
            employeeId: true,
            employee: {
              select: {
                userId: true,
                employeeTypeId: true,
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
  }

  async create(data: any) {
    if (!data.startDate || !data.endDate || !data.startTime || !data.endTime) {
      throw new BadRequestException('Fechas y horas son obligatorias');
    }

    // El empleado es opcional: permite crear turnos "vacíos" que luego se cubren
    // con el motor de asignación automática, definiendo requerimientos de personal.
    let employee: any = null;
    if (data.employeeId) {
      employee = await this.prisma.employee.findUnique({
        where: { id: data.employeeId },
        include: { user: true },
      });
      if (!employee) {
        throw new NotFoundException('Empleado no encontrado');
      }
    }

    const tenantId = employee?.tenantId || data.tenantId;
    if (!tenantId) {
      throw new BadRequestException('El tenantId es obligatorio cuando no se indica un empleado');
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      throw new BadRequestException('El periodo de fechas no es válido');
    }

    const result = await this.prisma.$transaction(async (transaction) => {
      const shift = await transaction.shift.create({
        data: {
          tenantId,
          departmentId: data.departmentId || null,
          shiftTypeId: data.shiftTypeId || null,
          date: startDate,
          startDate,
          endDate,
          startTime: data.startTime,
          endTime: data.endTime,
          status: data.status || (employee ? 'PUBLISHED' : 'DRAFT'),
        },
      });

      if (employee) {
        await transaction.shiftAssignment.create({
          data: {
            tenantId,
            shiftId: shift.id,
            employeeId: employee.id,
            assignedBy: data.assignedBy,
          },
        });

        await transaction.notification.create({
          data: {
            tenantId,
            userId: employee.userId,
            type: 'SHIFT_ASSIGNED',
            shiftId: shift.id,
            title: 'Nuevo turno asignado',
            message: `Se te asignó un turno del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}, de ${data.startTime} a ${data.endTime}.`,
          },
        });
      }

      return shift;
    });

    return this.findOne(result.id);
  }

  async update(id: string, data: any) {
    const shift = await this.findOne(id);
    if (!shift) throw new NotFoundException('Turno no encontrado');

    const updated = await this.prisma.shift.update({
      where: { id },
      data: {
        departmentId: data.departmentId || null,
        date: data.date ? new Date(data.date) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
      },
    });

    for (const assignment of shift.assignments) {
      await this.prisma.notification.create({
        data: {
          tenantId: shift.tenantId,
          userId: assignment.employee.userId,
          type: 'SHIFT_UPDATED',
          shiftId: updated.id,
          title: 'Turno actualizado',
          message: `Tu turno del ${new Date(updated.date).toLocaleDateString()} fue actualizado por la administración.`,
        },
      });
    }

    return this.findOne(id);
  }

  async assignEmployee(shiftId: string, employeeId: string, assignedBy?: string) {
    if (!employeeId) throw new BadRequestException('El empleado es obligatorio');

    const shift = await this.findOne(shiftId);
    if (!shift) throw new NotFoundException('Turno no encontrado');

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const assignment = await this.prisma.shiftAssignment.upsert({
      where: { shiftId_employeeId: { shiftId, employeeId } },
      update: { status: 'ASSIGNED', assignedBy },
      create: {
        tenantId: shift.tenantId,
        shiftId,
        employeeId,
        assignedBy,
        status: 'ASSIGNED',
      },
    });

    await this.prisma.notification.create({
      data: {
        tenantId: shift.tenantId,
        userId: employee.userId,
        type: 'SHIFT_ASSIGNED',
        shiftId,
        title: 'Nuevo turno asignado',
        message: `Se te asignó un turno para el ${new Date(shift.date).toLocaleDateString()}. Revisa el módulo de Turnos.`,
      },
    });

    await this.assignmentEngine.recomputeCoverage(shiftId);

    return assignment;
  }

  /**
   * Cancela el turno completo: Shift.status -> CANCELLED, todas sus
   * ShiftAssignment activas -> CANCELLED (para que dejen de contar en las
   * reglas de descanso/horas del motor, que ya filtra por status !== CANCELLED),
   * notifica a cada empleado que tenía asignación activa y recalcula cobertura.
   * No borra nada físicamente: el turno queda en la base para historial/auditoría.
   */
  async cancel(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        assignments: {
          where: { status: { not: 'CANCELLED' } },
          include: { employee: true },
        },
      },
    });
    if (!shift) throw new NotFoundException('Turno no encontrado');
    if (shift.status === 'CANCELLED') {
      throw new BadRequestException('El turno ya está cancelado');
    }

    await this.prisma.$transaction([
      this.prisma.shift.update({ where: { id: shiftId }, data: { status: 'CANCELLED' } }),
      this.prisma.shiftAssignment.updateMany({
        where: { shiftId, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED' },
      }),
    ]);

    for (const assignment of shift.assignments) {
      await this.prisma.notification.create({
        data: {
          tenantId: shift.tenantId,
          userId: assignment.employee.userId,
          type: 'SHIFT_CANCELLED',
          shiftId: shift.id,
          title: 'Turno cancelado',
          message: `Tu turno del ${new Date(shift.date).toLocaleDateString()} fue cancelado por la administración.`,
        },
      });
    }

    await this.assignmentEngine.recomputeCoverage(shiftId);

    return this.findOne(shiftId);
  }

  /**
   * Desasigna a un empleado puntual de un turno: su ShiftAssignment pasa a
   * CANCELLED (el turno en sí no se toca), se le notifica y se recalcula
   * cobertura. Resuelve el gap que antes dejaba a evaluateEmployee() contando
   * horas/descanso de asignaciones que ya no deberían existir.
   */
  async unassign(shiftId: string, employeeId: string) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { shiftId_employeeId: { shiftId, employeeId } },
      include: { employee: true, shift: true },
    });
    if (!assignment) throw new NotFoundException('El empleado no está asignado a este turno');
    if (assignment.status === 'CANCELLED') {
      throw new BadRequestException('El empleado ya no está asignado a este turno');
    }

    await this.prisma.shiftAssignment.update({
      where: { shiftId_employeeId: { shiftId, employeeId } },
      data: { status: 'CANCELLED' },
    });

    await this.prisma.notification.create({
      data: {
        tenantId: assignment.tenantId,
        userId: assignment.employee.userId,
        type: 'SHIFT_UNASSIGNED',
        shiftId,
        title: 'Turno desasignado',
        message: `Ya no estás asignado al turno del ${new Date(assignment.shift.date).toLocaleDateString()}.`,
      },
    });

    await this.assignmentEngine.recomputeCoverage(shiftId);

    return this.findOne(shiftId);
  }
}
