import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ShiftTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    return this.prisma.shiftType.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.shiftType.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Tipo de turno no encontrado');
    }
    return item;
  }

  async create(data: {
    tenantId: string;
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    duration: number;
    color?: string;
    nightShift?: boolean;
  }) {
    return this.prisma.shiftType.create({ data });
  }

  async update(id: string, data: Partial<{
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    duration: number;
    color: string;
    nightShift: boolean;
    active: boolean;
  }>) {
    await this.findOne(id);
    return this.prisma.shiftType.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.shiftType.delete({ where: { id } });
  }
}
