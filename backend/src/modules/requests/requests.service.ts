import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, userId?: string) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (userId) {
      const employee = await this.prisma.employee.findFirst({
        where: { userId },
      });
      if (!employee) return [];
      where.employeeId = employee.id;
    }

    return this.prisma.shiftRequest.findMany({
      where,
      include: {
        employee: {
          include: {
            user: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    tenantId: string;
    userId: string;
    requestedDate: string;
    reason: string;
    employeeId?: string;
  }) {
    if (!data.userId || !data.reason || !data.requestedDate) {
      throw new BadRequestException('Faltan datos para crear la solicitud');
    }

    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const tenantId = data.tenantId || user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('No se encontró tenant para la solicitud');
    }

    let employee = data.employeeId
      ? await this.prisma.employee.findUnique({ where: { id: data.employeeId } })
      : await this.prisma.employee.findFirst({ where: { userId: data.userId } });

    if (!employee) {
      employee = await this.prisma.employee.create({
        data: {
          userId: data.userId,
          tenantId,
          position: 'Empleado',
        },
      });
    }

    const request = await this.prisma.shiftRequest.create({
      data: {
        tenantId,
        employeeId: employee.id,
        requestedDate: new Date(data.requestedDate),
        reason: data.reason,
        status: 'PENDING',
      },
      include: {
        employee: {
          include: {
            user: true,
            department: true,
          },
        },
      },
    });

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId: employee.userId,
        title: 'Solicitud enviada',
        message: `Tu solicitud del ${new Date(data.requestedDate).toLocaleDateString()} quedó registrada y está pendiente de revisión.`,
      },
    });

    return request;
  }

  async updateStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    const request = await this.prisma.shiftRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const updated = await this.prisma.shiftRequest.update({
      where: { id },
      data: { status },
      include: {
        employee: {
          include: {
            user: true,
            department: true,
          },
        },
      },
    });

    await this.prisma.notification.create({
      data: {
        tenantId: request.tenantId,
        userId: request.employee.userId,
        title: status === 'APPROVED' ? 'Solicitud aprobada' : 'Solicitud rechazada',
        message:
          status === 'APPROVED'
            ? 'Tu solicitud fue aprobada por el administrador.'
            : 'Tu solicitud fue rechazada por el administrador.',
      },
    });

    return updated;
  }
}
