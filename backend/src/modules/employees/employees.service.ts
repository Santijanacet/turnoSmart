import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    return this.prisma.employee.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        user: true,
        department: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: true,
        department: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.employee.create({ data });
  }
}
