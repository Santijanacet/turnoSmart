import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class EmployeeTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    return this.prisma.employeeType.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async create(data: { tenantId: string; name: string; description?: string }) {
    if (!data.tenantId || !data.name) {
      throw new Error('Faltan datos para crear el tipo de empleado');
    }

    return this.prisma.employeeType.create({
      data: {
        tenantId: data.tenantId,
        name: data.name.trim(),
        description: data.description?.trim(),
      },
    });
  }
}
