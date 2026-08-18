import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  async getAdminSummary(@Query('tenantId') tenantId?: string) {
    if (!tenantId) {
      return {
        employees: 0,
        departments: 0,
        shifts: 0,
        requests: 0,
        notifications: 0,
        coverage: 100,
        conflicts: 0,
        unassigned: 0,
      };
    }

    return this.dashboardService.getAdminSummary(tenantId);
  }
}
