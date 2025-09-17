import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowExecutionSchedule } from '../database/entities/workflow-execution-schedule.entity';
import { WorkflowDelay } from '../database/entities/workflow-delay.entity';
import { VisualWorkflow } from './visual-workflow.entity';
import { JsonLogicRule } from './json-logic-rule.entity';
import { DummyUser } from '../database/entities/dummy-user.entity';
import { DummySubscription } from '../database/entities/dummy-subscription.entity';
import { DummySubscriptionType } from '../database/entities/dummy-subscription-type.entity';
import { DummyNewsletter } from '../database/entities/dummy-newsletter.entity';

// Services
import { WorkflowQueueService } from './queue/workflow-queue.service';
import { WorkflowExecutionProcessor } from './queue/workflow-queue.processor';
import { WorkflowDelayProcessor } from './queue/workflow-queue.processor';
import { WorkflowSchedulerProcessor } from './queue/workflow-queue.processor';
import { DistributedLockService } from './locks/distributed-lock.service';
import { WorkflowDatabaseService } from './database/workflow.service';
import { DistributedSchedulerService } from './scheduler/distributed-scheduler.service';

// Controllers
import { DistributedSystemController } from './controllers/distributed-system.controller';

// Node Module
import { NodesModule } from './nodes/nodes.module';

// Trigger Module
import { WorkflowTriggerModule } from './triggers/workflow-trigger.module';

// Existing services
import { WorkflowService } from './workflow.service';
import { WorkflowOrchestrationEngine } from './execution/workflow-orchestration-engine';
import { SubscriptionTriggerService } from '../services/subscription-trigger.service';
import { NewsletterTriggerService } from '../services/newsletter-trigger.service';
import { UserTriggerService } from '../services/user-trigger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowExecution,
      WorkflowExecutionSchedule,
      WorkflowDelay,
      VisualWorkflow,
      JsonLogicRule,
      DummyUser,
      DummySubscription,
      DummySubscriptionType,
      DummyNewsletter
    ]),
    BullModule.registerQueue(
      {
        name: 'workflow-execution',
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'workflow-delay',
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'workflow-scheduler',
        defaultJobOptions: {
          removeOnComplete: 5,
          removeOnFail: 3,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      }
    ),
    NodesModule,
    WorkflowTriggerModule
  ],
  controllers: [
    DistributedSystemController
  ],
  providers: [
    // Queue services
    WorkflowQueueService,
    WorkflowExecutionProcessor,
    WorkflowDelayProcessor,
    WorkflowSchedulerProcessor,

    // Lock service
    DistributedLockService,

    // Database services
    WorkflowDatabaseService,

    // Scheduler service
    DistributedSchedulerService,

    // Existing services
    WorkflowService,
    WorkflowOrchestrationEngine,
    SubscriptionTriggerService,
    NewsletterTriggerService,
    UserTriggerService
  ],
  exports: [
    WorkflowQueueService,
    DistributedLockService,
    WorkflowDatabaseService,
    DistributedSchedulerService,
    WorkflowService,
    WorkflowOrchestrationEngine
  ]
})
export class WorkflowModule {}