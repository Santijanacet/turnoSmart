import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    return this.prisma.schedule.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async create(data: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { tenantId: true },
    });
    const tenantId = data.tenantId || employee?.tenantId;

    if (!tenantId || !data.employeeId || !data.startDate || !data.endDate) {
      throw new BadRequestException('Empleado, tenant y fechas son obligatorios');
    }

    return this.prisma.schedule.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status || 'DRAFT',
      },
    });
  }
}
