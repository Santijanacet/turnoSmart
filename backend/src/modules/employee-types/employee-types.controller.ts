import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmployeeTypesService } from './employee-types.service';

@ApiTags('employee-types')
@Controller('employee-types')
export class EmployeeTypesController {
  constructor(private readonly employeeTypesService: EmployeeTypesService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId?: string) {
    return this.employeeTypesService.findAll(tenantId);
  }

  @Post()
  async create(@Body() body: any) {
    return this.employeeTypesService.create(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.employeeTypesService.update(id, body);
  }
}
