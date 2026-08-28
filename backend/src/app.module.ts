import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { EmployeeTypesModule } from './modules/employee-types/employee-types.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { RequestsModule } from './modules/requests/requests.module';
import { RolesModule } from './modules/roles/roles.module';
import { ShiftTypesModule } from './modules/shift-types/shift-types.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AssignmentEngineModule } from './modules/assignment-engine/assignment-engine.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    EmployeesModule,
    DepartmentsModule,
    EmployeeTypesModule,
    ShiftsModule,
    SchedulesModule,
    RequestsModule,
    RolesModule,
    ShiftTypesModule,
    AvailabilityModule,
    DashboardModule,
    AssignmentEngineModule,
  ],
})
export class AppModule {}
