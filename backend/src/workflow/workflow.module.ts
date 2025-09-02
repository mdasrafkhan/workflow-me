import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisualWorkflow } from './visual-workflow.entity';
import { JsonLogicRule } from './json-logic-rule.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowCron } from './workflow.cron';
import { WorkflowExecutor } from './execution/WorkflowExecutor';

@Module({
  imports: [TypeOrmModule.forFeature([VisualWorkflow, JsonLogicRule])],
  providers: [WorkflowService, WorkflowCron, WorkflowExecutor],
  controllers: [WorkflowController],
  exports: [WorkflowService, WorkflowExecutor],
})
export class WorkflowModule {}
