import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    return this.prisma.shift.findMany({
      where: tenantId ? { tenantId } : undefined,
      select: {
        id: true,
        tenantId: true,
        departmentId: true,
        date: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        assignments: {
          select: {
            employeeId: true,
            employee: {
              select: {
                userId: true,
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
        date: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        assignments: {
          select: {
            employeeId: true,
            employee: {
              select: {
                userId: true,
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
  }

  async create(data: any) {
    if (!data.employeeId || !data.startDate || !data.endDate || !data.startTime || !data.endTime) {
      throw new BadRequestException('Empleado, fechas y horas son obligatorios');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employeeId },
      include: { user: true },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const tenantId = employee.tenantId;
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
          date: startDate,
          startDate,
          endDate,
          startTime: data.startTime,
          endTime: data.endTime,
          status: data.status || 'PUBLISHED',
        },
      });

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
          title: 'Nuevo turno asignado',
          message: `Se te asignó un turno del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}, de ${data.startTime} a ${data.endTime}.`,
        },
      });

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
        title: 'Nuevo turno asignado',
        message: `Se te asignó un turno para el ${new Date(shift.date).toLocaleDateString()}. Revisa el módulo de Turnos.`,
      },
    });

    return assignment;
  }
}
