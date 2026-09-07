import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    try {
      return await this.prisma.shiftType.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un tipo de turno con ese código');
      }
      throw error;
    }
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
