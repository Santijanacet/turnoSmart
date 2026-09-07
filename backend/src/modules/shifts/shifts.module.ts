import { Module } from '@nestjs/common';
import { AssignmentEngineModule } from '../assignment-engine/assignment-engine.module';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

@Module({
  imports: [AssignmentEngineModule],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
