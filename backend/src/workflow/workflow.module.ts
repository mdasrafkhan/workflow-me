import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisualWorkflow } from './visual-workflow.entity';
import { JsonLogicRule } from './json-logic-rule.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowCron } from './workflow.cron';
import { WorkflowExecutor } from './execution/WorkflowExecutor';
import { WorkflowOrchestrationEngine } from './execution/workflow-orchestration-engine';
import { SubscriptionTriggerService } from '../services/subscription-trigger.service';
import { NewsletterTriggerService } from '../services/newsletter-trigger.service';
import { SharedFlowService } from '../services/shared-flow.service';
import { WorkflowActionService } from '../services/workflow-action.service';
import { WorkflowRecoveryService } from '../services/workflow-recovery.service';
import { EmailService } from '../services/email.service';
import { ActionService } from '../services/action.service';
import { DummyUser } from '../database/entities/dummy-user.entity';
import { DummySubscription } from '../database/entities/dummy-subscription.entity';
import { DummySubscriptionType } from '../database/entities/dummy-subscription-type.entity';
import { DummyNewsletter } from '../database/entities/dummy-newsletter.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../database/entities/workflow-delay.entity';
import { EmailLog } from '../database/entities/email-log.entity';
import { DummyDataService } from '../services/dummy-data.service';
import { WorkflowStateMachineService } from './state-machine/workflow-state-machine';
import { NodesModule } from './nodes/nodes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisualWorkflow,
      JsonLogicRule,
      DummyUser,
      DummySubscription,
      DummySubscriptionType,
      DummyNewsletter,
      WorkflowExecution,
      WorkflowDelay,
      EmailLog
    ]),
    NodesModule // Import the new nodes module
  ],
  providers: [
    WorkflowService,
    WorkflowCron,
    WorkflowExecutor,
    WorkflowOrchestrationEngine, // Use the new clean engine
    SubscriptionTriggerService,
    NewsletterTriggerService,
    SharedFlowService,
    WorkflowActionService,
    WorkflowRecoveryService,
    EmailService,
    ActionService,
    DummyDataService,
    WorkflowStateMachineService
  ],
  controllers: [WorkflowController],
  exports: [WorkflowService, WorkflowExecutor, WorkflowOrchestrationEngine],
})
export class WorkflowModule {}
