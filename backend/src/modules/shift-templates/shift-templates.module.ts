import { Module } from '@nestjs/common';
import { AssignmentEngineModule } from '../assignment-engine/assignment-engine.module';
import { ShiftTemplatesController } from './shift-templates.controller';
import { ShiftTemplatesService } from './shift-templates.service';

@Module({
  imports: [AssignmentEngineModule],
  controllers: [ShiftTemplatesController],
  providers: [ShiftTemplatesService],
  exports: [ShiftTemplatesService],
})
export class ShiftTemplatesModule {}
