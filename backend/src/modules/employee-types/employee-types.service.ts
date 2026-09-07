import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  async create(data: { tenantId: string; name: string; description?: string; requiresDepartmentMatch?: boolean }) {
    const name = data.name?.trim();
    if (!data.tenantId) {
      throw new BadRequestException('El tenant es obligatorio');
    }
    if (!name) {
      throw new BadRequestException('El nombre del tipo de empleado es obligatorio');
    }

    const existing = await this.prisma.employeeType.findFirst({
      where: { tenantId: data.tenantId, name },
    });
    if (existing) {
      throw new ConflictException('Ya existe un tipo de empleado con ese nombre');
    }

    return this.prisma.employeeType.create({
      data: {
        tenantId: data.tenantId,
        name,
        description: data.description?.trim(),
        requiresDepartmentMatch: data.requiresDepartmentMatch,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; active?: boolean; requiresDepartmentMatch?: boolean }) {
    const employeeType = await this.prisma.employeeType.findUnique({ where: { id } });
    if (!employeeType) {
      throw new NotFoundException('Tipo de empleado no encontrado');
    }

    const name = data.name?.trim();
    return this.prisma.employeeType.update({
      where: { id },
      data: {
        name,
        description: data.description?.trim(),
        active: data.active,
        requiresDepartmentMatch: data.requiresDepartmentMatch,
      },
    });
  }
}
