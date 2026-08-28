import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AssignmentEngineService } from './assignment-engine.service';
import { AssignmentEngineController } from './assignment-engine.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AssignmentEngineController],
  providers: [AssignmentEngineService],
  exports: [AssignmentEngineService],
})
export class AssignmentEngineModule {}
