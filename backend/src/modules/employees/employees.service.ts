import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ImportEmployeeRecord {
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  departmentName?: string;
  departmentId?: string;
  employeeTypeName?: string;
  employeeTypeId?: string;
  position?: string;
  active?: boolean;
  password?: string;
}

export interface ImportError {
  row: number;
  email?: string;
  message: string;
}

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

  async importBulk(tenantId: string, records: ImportEmployeeRecord[]) {
    if (!tenantId) {
      throw new BadRequestException('tenantId es obligatorio para importar empleados');
    }
    if (!Array.isArray(records) || !records.length) {
      throw new BadRequestException('No se recibieron registros para importar');
    }

    const departments = await this.prisma.department.findMany({ where: { tenantId } });
    const employeeTypes = await this.prisma.employeeType.findMany({ where: { tenantId } });
    const existingEmails = new Set(
      (await this.prisma.user.findMany({ where: { tenantId }, select: { email: true } })).map((u) => u.email.toLowerCase()),
    );

    const errors: ImportError[] = [];
    const duplicates: ImportError[] = [];
    const imported: { row: number; email: string; employeeId: string }[] = [];
    const seenInBatch = new Set<string>();

    for (let index = 0; index < records.length; index += 1) {
      const row = index + 1;
      const record = records[index];
      try {
        const firstName = record.firstName?.trim();
        const lastName = record.lastName?.trim();
        const email = record.email?.trim().toLowerCase();

        if (!firstName || !lastName || !email) {
          errors.push({ row, email, message: 'Faltan datos obligatorios (nombre, apellido o correo).' });
          continue;
        }
        if (!EMAIL_REGEX.test(email)) {
          errors.push({ row, email, message: 'El correo electrónico no es válido.' });
          continue;
        }
        if (existingEmails.has(email) || seenInBatch.has(email)) {
          duplicates.push({ row, email, message: 'El correo ya existe o está duplicado en el archivo.' });
          continue;
        }

        let departmentId: string | undefined = record.departmentId || undefined;
        if (!departmentId && record.departmentName) {
          const match = departments.find((department) => department.name.toLowerCase() === record.departmentName!.trim().toLowerCase());
          if (!match) {
            errors.push({ row, email, message: `El área "${record.departmentName}" no existe.` });
            continue;
          }
          departmentId = match.id;
        }

        let employeeTypeId: string | undefined = record.employeeTypeId || undefined;
        if (!employeeTypeId && record.employeeTypeName) {
          const match = employeeTypes.find((type) => type.name.toLowerCase() === record.employeeTypeName!.trim().toLowerCase());
          if (!match) {
            errors.push({ row, email, message: `El tipo de empleado "${record.employeeTypeName}" no existe.` });
            continue;
          }
          employeeTypeId = match.id;
        }

        const passwordHash = await bcrypt.hash(record.password || 'Turnosmart123', 10);

        const user = await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            role: (record.role as any) || 'EMPLOYEE',
            tenantId,
            active: record.active ?? true,
          },
        });

        const employee = await this.prisma.employee.create({
          data: {
            userId: user.id,
            tenantId,
            departmentId: departmentId || null,
            employeeTypeId: employeeTypeId || null,
            position: record.position || null,
            active: record.active ?? true,
          },
        });

        seenInBatch.add(email);
        imported.push({ row, email, employeeId: employee.id });
      } catch (error) {
        errors.push({ row, email: record.email, message: error instanceof Error ? error.message : 'Error inesperado al importar el registro.' });
      }
    }

    return {
      total: records.length,
      importedCount: imported.length,
      errorCount: errors.length,
      duplicateCount: duplicates.length,
      imported,
      errors,
      duplicates,
    };
  }
}
