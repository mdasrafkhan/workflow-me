import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DummyDataService } from './services/dummy-data.service';
import { EmailService } from './services/email.service';
import { SubscriptionTriggerService } from './services/subscription-trigger.service';
import { NewsletterTriggerService } from './services/newsletter-trigger.service';
import { SharedFlowService } from './services/shared-flow.service';
import { WorkflowActionService } from './services/workflow-action.service';
import { WorkflowRecoveryService } from './services/workflow-recovery.service';
import { WorkflowStateMachineService } from './workflow/state-machine/workflow-state-machine';
import { HealthController } from './health.controller';
import { WorkflowController } from './workflow/workflow.controller';
import { WorkflowModule } from './workflow/workflow.module';
import { TestUtilsModule } from './test-utils/test-utils.module';
import { DummyUser } from './database/entities/dummy-user.entity';
import { DummySubscription } from './database/entities/dummy-subscription.entity';
import { DummySubscriptionType } from './database/entities/dummy-subscription-type.entity';
import { DummyNewsletter } from './database/entities/dummy-newsletter.entity';
import { WorkflowExecution } from './database/entities/workflow-execution.entity';
import { WorkflowDelay } from './database/entities/workflow-delay.entity';
import { EmailLog } from './database/entities/email-log.entity';
import { WorkflowExecutionSchedule } from './database/entities/workflow-execution-schedule.entity';
import { VisualWorkflow } from './workflow/visual-workflow.entity';
import { JsonLogicRule } from './workflow/json-logic-rule.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'workflow_user',
      password: process.env.DB_PASSWORD || 'workflow_password',
      database: process.env.DB_NAME || 'workflow_db',
      entities: [
        DummyUser,
        DummySubscription,
        DummySubscriptionType,
        DummyNewsletter,
        WorkflowExecution,
        WorkflowDelay,
        EmailLog,
        WorkflowExecutionSchedule,
        VisualWorkflow,
        JsonLogicRule
      ],
      synchronize: false, // Disabled to prevent conflicts with manual UUID migration
      logging: false // Disabled to reduce log noise
    }),
    TypeOrmModule.forFeature([
      DummyUser,
      DummySubscription,
      DummySubscriptionType,
      DummyNewsletter,
      WorkflowExecution,
      WorkflowDelay,
      EmailLog,
      WorkflowExecutionSchedule,
      VisualWorkflow,
      JsonLogicRule
    ]),
    WorkflowModule,
    TestUtilsModule
  ],
  controllers: [HealthController, WorkflowController],
  providers: [
    DummyDataService,
    EmailService,
    SubscriptionTriggerService,
    NewsletterTriggerService,
    SharedFlowService,
    WorkflowActionService,
    WorkflowRecoveryService,
    WorkflowStateMachineService
  ]
})
export class AppModule {}