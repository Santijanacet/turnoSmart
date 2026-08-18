import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId?: string) {
    return this.schedulesService.findAll(tenantId);
  }

  @Post()
  async create(@Body() body: any) {
    return this.schedulesService.create(body);
  }
}
