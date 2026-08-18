import { Module } from '@nestjs/common';
import { EmployeeTypesController } from './employee-types.controller';
import { EmployeeTypesService } from './employee-types.service';

@Module({
  controllers: [EmployeeTypesController],
  providers: [EmployeeTypesService],
  exports: [EmployeeTypesService],
})
export class EmployeeTypesModule {}
