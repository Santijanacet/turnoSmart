import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { RoleType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_VALUES = new Set<string>(Object.values(RoleType));

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
    const existingUsers = new Map(
      (
        await this.prisma.user.findMany({
          where: { tenantId },
          select: { id: true, email: true, deletedAt: true },
        })
      ).map((u) => [u.email.toLowerCase(), u]),
    );

    const errors: ImportError[] = [];
    const duplicates: ImportError[] = [];
    const imported: { row: number; email: string; employeeId: string }[] = [];
    const reactivated: { row: number; email: string; employeeId: string; message: string }[] = [];
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
        if (seenInBatch.has(email)) {
          duplicates.push({ row, email, message: 'El correo ya existe o está duplicado en el archivo.' });
          continue;
        }

        const existingUser = existingUsers.get(email);
        if (existingUser && !existingUser.deletedAt) {
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

        const normalizedRole = (record.role?.trim() || 'EMPLOYEE').toUpperCase();
        if (!ROLE_VALUES.has(normalizedRole)) {
          errors.push({ row, email, message: `El rol "${record.role}" no es válido. Debe ser ADMIN o EMPLOYEE.` });
          continue;
        }

        const passwordHash = await bcrypt.hash(record.password || 'Turnosmart123', 10);

        if (existingUser && existingUser.deletedAt) {
          await this.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash,
              firstName,
              lastName,
              role: normalizedRole as RoleType,
              active: record.active ?? true,
              deletedAt: null,
            },
          });

          const employee = await this.prisma.employee.upsert({
            where: { userId: existingUser.id },
            update: {
              departmentId: departmentId || null,
              employeeTypeId: employeeTypeId || null,
              position: record.position || null,
              active: record.active ?? true,
            },
            create: {
              userId: existingUser.id,
              tenantId,
              departmentId: departmentId || null,
              employeeTypeId: employeeTypeId || null,
              position: record.position || null,
              active: record.active ?? true,
            },
          });

          seenInBatch.add(email);
          reactivated.push({
            row,
            email,
            employeeId: employee.id,
            message: 'Esta cuenta estaba eliminada; se reactivó con los datos de esta fila y conserva su historial de turnos.',
          });
          continue;
        }

        const user = await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            role: normalizedRole as RoleType,
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
      reactivatedCount: reactivated.length,
      errorCount: errors.length,
      duplicateCount: duplicates.length,
      imported,
      reactivated,
      errors,
      duplicates,
    };
  }
}
