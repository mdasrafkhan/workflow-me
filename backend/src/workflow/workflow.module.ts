import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisualWorkflow } from './visual-workflow.entity';
import { JsonLogicRule } from './json-logic-rule.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowCron } from './workflow.cron';

@Module({
  imports: [TypeOrmModule.forFeature([VisualWorkflow, JsonLogicRule])],
  providers: [WorkflowService, WorkflowCron],
  controllers: [WorkflowController],
})
export class WorkflowModule {}
