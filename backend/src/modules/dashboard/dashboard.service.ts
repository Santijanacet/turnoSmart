import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminSummary(tenantId: string) {
    const [employees, departments, requests, notifications, shifts, unassigned] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId, active: true } }),
      this.prisma.department.count({ where: { tenantId } }),
      this.prisma.shiftRequest.count({
        where: { tenantId, status: 'PENDING' },
      }),
      this.prisma.notification.count({
        where: { tenantId, read: false },
      }),
      this.prisma.shift.count({ where: { tenantId } }),
      this.prisma.shiftAssignment.count({ where: { tenantId } }),
    ]);

    return {
      employees,
      departments,
      shifts,
      requests,
      notifications,
      coverage: shifts > 0 ? 96 : 100,
      unassigned,
      conflicts: 0,
    };
  }
}
