import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('employee/:employeeId')
  async findByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.availabilityService.findByEmployee(employeeId, tenantId);
  }

  @Post()
  async upsert(@Body() body: any) {
    return this.availabilityService.upsert(body);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.availabilityService.findOne(id);
  }
}
