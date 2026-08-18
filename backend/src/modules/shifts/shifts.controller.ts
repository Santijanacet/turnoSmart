import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';

@ApiTags('shifts')
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId?: string) {
    return this.shiftsService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
  }

  @Post()
  async create(@Body() body: any) {
    return this.shiftsService.create(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.shiftsService.update(id, body);
  }

  @Post(':id/assign')
  async assign(@Param('id') id: string, @Body() body: any) {
    return this.shiftsService.assignEmployee(id, body.employeeId, body.assignedBy);
  }
}
