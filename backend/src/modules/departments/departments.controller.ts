import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
}
