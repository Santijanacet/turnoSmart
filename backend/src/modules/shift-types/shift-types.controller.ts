import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ShiftTypesService } from './shift-types.service';

@ApiTags('shift-types')
@Controller('shift-types')
export class ShiftTypesController {
  constructor(private readonly shiftTypesService: ShiftTypesService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId?: string) {
    return this.shiftTypesService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shiftTypesService.findOne(id);
  }

  @Post()
  async create(@Body() body: any) {
    return this.shiftTypesService.create(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.shiftTypesService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.shiftTypesService.remove(id);
  }
}
