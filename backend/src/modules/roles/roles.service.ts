import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: CreateRoleDto) {
    const { permissionIds, ...roleData } = data;

    // Check if role already exists
    const existingRole = await this.prisma.customRole.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: data.name,
        },
      },
    });

    if (existingRole) {
      throw new BadRequestException('Role already exists');
    }

    return this.prisma.customRole.create({
      data: {
        ...roleData,
        tenantId,
        permissions: permissionIds
          ? {
              create: permissionIds.map((permissionId) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.customRole.findMany({
      where: { tenantId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findById(id: string, tenantId: string) {
    return this.prisma.customRole.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async update(id: string, tenantId: string, data: CreateRoleDto) {
    const { permissionIds, ...roleData } = data;

    return this.prisma.customRole.update({
      where: { id },
      data: {
        ...roleData,
        permissions: permissionIds
          ? {
              deleteMany: {},
              create: permissionIds.map((permissionId) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.customRole.delete({
      where: { id },
    });
  }

  async assignPermissions(
    roleId: string,
    permissionIds: string[]
  ) {
    // Delete existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Create new permissions
    return this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    });
  }
}
