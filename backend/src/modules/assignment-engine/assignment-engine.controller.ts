import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssignmentEngineService } from './assignment-engine.service';

@ApiTags('assignment-engine')
@Controller()
export class AssignmentEngineController {
  constructor(private readonly engine: AssignmentEngineService) {}

  @Get('scheduling-policy')
  async getPolicy(@Query('tenantId') tenantId: string) {
    return this.engine.getPolicy(tenantId);
  }

  @Put('scheduling-policy')
  async upsertPolicy(@Body() body: any) {
    const { tenantId, ...data } = body || {};
    return this.engine.upsertPolicy(tenantId, data);
  }

  @Get('shifts/:id/requirements')
  async getRequirements(@Param('id') id: string) {
    return this.engine.getRequirements(id);
  }

  @Put('shifts/:id/requirements')
  async setRequirements(@Param('id') id: string, @Body() body: { requirements: { employeeTypeId: string; requiredCount: number }[] }) {
    return this.engine.setRequirements(id, body?.requirements || []);
  }

  @Get('shifts/:id/candidates')
  async getCandidates(@Param('id') id: string) {
    return this.engine.evaluateCandidates(id);
  }

  @Get('shifts/:id/suggested-candidates')
  async getSuggestedCandidates(@Param('id') id: string) {
    return this.engine.suggestCandidates(id);
  }

  @Post('shifts/:id/auto-assign')
  async autoAssign(@Param('id') id: string, @Body() body: { assignedBy?: string }) {
    return this.engine.autoAssign(id, body?.assignedBy);
  }
}
