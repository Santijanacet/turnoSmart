import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmployee(employeeId: string, tenantId?: string) {
    return this.prisma.availability.findMany({
      where: {
        employeeId,
        ...(tenantId ? { tenantId } : {}),
      },
      include: { shiftType: true },
      orderBy: [{ dayOfWeek: 'asc' }, { shiftTypeId: 'asc' }],
    });
  }

  async upsert(data: {
    tenantId: string;
    employeeId: string;
    dayOfWeek: number;
    shiftTypeId: string;
    available: boolean;
  }) {
    const existing = await this.prisma.availability.findFirst({
      where: {
        employeeId: data.employeeId,
        dayOfWeek: data.dayOfWeek,
        shiftTypeId: data.shiftTypeId,
      },
    });

    if (existing) {
      return this.prisma.availability.update({
        where: { id: existing.id },
        data: { available: data.available },
      });
    }

    return this.prisma.availability.create({ data });
  }

  async findOne(id: string) {
    const item = await this.prisma.availability.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Disponibilidad no encontrada');
    }
    return item;
  }
}
