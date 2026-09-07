import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ShiftTemplatesService } from './shift-templates.service';

@ApiTags('shift-templates')
@Controller('shift-templates')
export class ShiftTemplatesController {
  constructor(private readonly shiftTemplatesService: ShiftTemplatesService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId?: string, @Query('departmentId') departmentId?: string) {
    return this.shiftTemplatesService.findAll(tenantId, departmentId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shiftTemplatesService.findOne(id);
  }

  @Post()
  async create(@Body() body: any) {
    return this.shiftTemplatesService.create(body);
  }

  @Post('generate')
  async generate(@Body() body: any) {
    return this.shiftTemplatesService.generate(body);
  }

  @Post('generate-next-uncovered')
  async generateNextUncovered(@Body() body: any) {
    return this.shiftTemplatesService.generateNextUncovered(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.shiftTemplatesService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.shiftTemplatesService.remove(id);
  }

  @Get(':id/requirements')
  async getRequirements(@Param('id') id: string) {
    return this.shiftTemplatesService.getRequirements(id);
  }

  @Put(':id/requirements')
  async setRequirements(@Param('id') id: string, @Body() body: { requirements: { employeeTypeId: string; requiredCount: number }[] }) {
    return this.shiftTemplatesService.setRequirements(id, body?.requirements || []);
  }
}
