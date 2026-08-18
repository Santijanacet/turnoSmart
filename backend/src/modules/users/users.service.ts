import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async syncEmployeeDepartments(
    employeeId: string,
    departmentIds: string[] = [],
    primaryDepartmentId?: string,
  ) {
    const uniqueDepartmentIds = [...new Set(departmentIds.filter(Boolean))];
    if (primaryDepartmentId) {
      uniqueDepartmentIds.unshift(primaryDepartmentId);
    }

    const deduped = [...new Set(uniqueDepartmentIds)];

    const existingAssignments = await this.prisma.employeeDepartment.findMany({
      where: { employeeId },
    });

    const existingIds = new Set(existingAssignments.map((assignment) => assignment.departmentId));
    const targetIds = new Set(deduped);

    for (const assignment of existingAssignments) {
      if (!targetIds.has(assignment.departmentId)) {
        await this.prisma.employeeDepartment.delete({ where: { id: assignment.id } });
      }
    }

    for (const departmentId of deduped) {
      if (!existingIds.has(departmentId)) {
        await this.prisma.employeeDepartment.create({
          data: {
            employeeId,
            departmentId,
            isPrimary: departmentId === primaryDepartmentId,
          },
        });
      } else {
        const assignment = existingAssignments.find((item) => item.departmentId === departmentId);
        if (assignment && assignment.isPrimary !== (departmentId === primaryDepartmentId)) {
          await this.prisma.employeeDepartment.update({
            where: { id: assignment.id },
            data: { isPrimary: departmentId === primaryDepartmentId },
          });
        }
      }
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        tenant: true,
        employee: {
          include: {
            department: true,
            employeeType: true,
            departments: {
              include: {
                department: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        tenant: true,
        employee: {
          include: {
            department: true,
            employeeType: true,
            departments: {
              include: {
                department: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    tenantId?: string;
    departmentId?: string;
    departmentIds?: string[];
    employeeTypeId?: string;
    position?: string;
    phone?: string;
  }) {
    if (!data.email || !data.password || !data.firstName || !data.lastName) {
      throw new BadRequestException('Faltan datos requeridos del usuario');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const tenantId = data.tenantId || (await this.prisma.tenant.findFirst())?.id;
    if (!tenantId) {
      throw new BadRequestException('No existe un tenant para asignar el usuario');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: (data.role as any) || 'EMPLOYEE',
        tenantId,
      },
      include: {
        tenant: true,
      },
    });

    const primaryDepartmentId = data.departmentId || data.departmentIds?.[0];
    const departmentIds = data.departmentIds ? [...data.departmentIds] : [];

    if (primaryDepartmentId || departmentIds.length > 0) {
      const employee = await this.prisma.employee.create({
        data: {
          userId: user.id,
          tenantId,
          departmentId: primaryDepartmentId,
          employeeTypeId: data.employeeTypeId,
          position: data.position || 'Empleado',
        },
      });

      await this.syncEmployeeDepartments(employee.id, departmentIds, primaryDepartmentId);
    }

    return this.findOne(user.id);
  }

  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
      phone?: string;
      active?: boolean;
      departmentId?: string;
      departmentIds?: string[];
      employeeTypeId?: string;
      position?: string;
      password?: string;
    },
    requesterRole?: string,
  ) {
    if (data.active !== undefined && requesterRole !== 'ADMIN') {
      throw new BadRequestException('Solo un administrador puede suspender o activar cuentas');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ? data.email.toLowerCase() : undefined,
        phone: data.phone,
        role: data.role as any,
        active: data.active,
        userStatus: data.active === undefined ? undefined : data.active ? 'ACTIVE' : 'SUSPENDED',
        passwordHash: data.password ? await bcrypt.hash(data.password, 10) : undefined,
      },
    });

    const primaryDepartmentId = data.departmentId || data.departmentIds?.[0];
    const departmentIds = data.departmentIds ? [...data.departmentIds] : [];

    if (primaryDepartmentId || departmentIds.length > 0 || data.employeeTypeId || data.position) {
      const employee = await this.prisma.employee.findUnique({ where: { userId: id } });
      if (employee) {
        await this.prisma.employee.update({
          where: { id: employee.id },
          data: {
            departmentId: primaryDepartmentId,
            employeeTypeId: data.employeeTypeId,
            position: data.position,
          },
        });
        await this.syncEmployeeDepartments(employee.id, departmentIds, primaryDepartmentId);
      } else {
        const created = await this.prisma.employee.create({
          data: {
            userId: id,
            tenantId: user.tenantId,
            departmentId: primaryDepartmentId,
            employeeTypeId: data.employeeTypeId,
            position: data.position || 'Empleado',
          },
        });
        await this.syncEmployeeDepartments(created.id, departmentIds, primaryDepartmentId);
      }
    }

    return this.findOne(updatedUser.id);
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }
}
