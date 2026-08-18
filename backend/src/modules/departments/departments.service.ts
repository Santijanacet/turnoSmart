import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    return this.prisma.department.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async create(data: { name: string; code?: string; tenantId?: string }) {
    const name = data.name?.trim();
    if (!name) {
      throw new BadRequestException('El nombre del departamento es obligatorio');
    }

    const tenantId = data.tenantId || (await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } }))?.id;
    if (!tenantId) {
      throw new BadRequestException('No existe una organización para guardar el departamento');
    }

    const baseCode = this.buildCode(name);
    let code = baseCode;
    let suffix = 2;
    while (await this.prisma.department.findFirst({ where: { tenantId, code } })) {
      code = `${baseCode}${suffix}`;
      suffix += 1;
    }

    return this.prisma.department.create({
      data: {
        name,
        code,
        tenantId,
      },
    });
  }

  private buildCode(name: string) {
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .trim()
      .toUpperCase();
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      return words.map((word) => word[0]).join('').slice(0, 4);
    }
    return normalized.replace(/\s/g, '').slice(0, 4) || 'DEP';
  }
}
