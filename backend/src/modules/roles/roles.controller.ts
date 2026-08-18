import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { TenantGuard } from '../../guards/tenant.guard';
import { GetTenant } from '../../decorators/get-tenant.decorator';

@Controller('roles')
@UseGuards(TenantGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Post()
  async create(@GetTenant() tenantId: string, @Body() data: CreateRoleDto) {
    return this.rolesService.create(tenantId, data);
  }

  @Get()
  async findAll(@GetTenant() tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get(':id')
  async findById(@GetTenant() tenantId: string, @Param('id') id: string) {
    return this.rolesService.findById(id, tenantId);
  }

  @Put(':id')
  async update(
    @GetTenant() tenantId: string,
    @Param('id') id: string,
    @Body() data: CreateRoleDto,
  ) {
    return this.rolesService.update(id, tenantId, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }

  @Post(':id/permissions')
  async assignPermissions(
    @Param('id') roleId: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.rolesService.assignPermissions(roleId, permissionIds);
  }
}
