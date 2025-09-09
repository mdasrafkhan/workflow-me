import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestDataCleanupService } from './test-data-cleanup.service';
import { TestController } from './test-controller';
import { VisualWorkflow } from '../workflow/visual-workflow.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../database/entities/workflow-delay.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisualWorkflow,
      WorkflowExecution,
      WorkflowDelay,
    ]),
  ],
  providers: [TestDataCleanupService],
  controllers: [TestController],
  exports: [TestDataCleanupService],
})
export class TestUtilsModule {}
