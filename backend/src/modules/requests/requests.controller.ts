import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestsService } from './requests.service';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  async findAll(
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.requestsService.findAll(tenantId, userId);
  }

  @Post()
  async create(@Body() body: any) {
    return this.requestsService.create(body);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED' },
  ) {
    return this.requestsService.updateStatus(id, body.status);
  }
}
