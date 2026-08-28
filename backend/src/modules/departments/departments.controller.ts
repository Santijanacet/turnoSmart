import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId?: string) {
    return this.departmentsService.findAll(tenantId);
  }

  @Post()
  async create(@Body() body: any) {
    return this.departmentsService.create(body);
  }

  @Patch(':id')
  async updateMaxStaff(@Param('id') id: string, @Body() body: { maxStaff: number | null }) {
    return this.departmentsService.updateMaxStaff(id, body?.maxStaff ?? null);
  }
}
