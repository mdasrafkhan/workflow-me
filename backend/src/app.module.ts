import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
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
import { SubscriptionPurchaseController } from './controllers/subscription-purchase.controller';
import { WorkflowModule } from './workflow/workflow.module';
import { TestUtilsModule } from './test-utils/test-utils.module';
import { WorkflowTriggerModule } from './workflow/triggers/workflow-trigger.module';
import { SubscriptionPurchaseService } from './services/subscription-purchase.service';
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
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
      settings: {
        stalledInterval: 30 * 1000,
        maxStalledCount: 1,
      },
    }),
    BullModule.registerQueue(
      { name: 'workflow-execution' },
      { name: 'workflow-delay' },
      { name: 'workflow-scheduler' }
    ),
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
      logging: false, // Disabled to reduce log noise
      // Connection Pool Configuration for Multi-Pod Setup
      extra: {
        // Connection pool settings
        max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections per pod
        min: parseInt(process.env.DB_POOL_MIN || '5'), // Minimum connections per pod
        acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'), // Max time to get connection (30s)
        idle: parseInt(process.env.DB_POOL_IDLE || '10000'), // Max idle time (10s)
        evict: parseInt(process.env.DB_POOL_EVICT || '1000'), // Eviction check interval (1s)

        // Connection timeout settings
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // 10s
        query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'), // 30s

        // Statement timeout
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '60000'), // 60s

        // Connection validation
        validate: true,
        validationQuery: 'SELECT 1',
        validationInterval: parseInt(process.env.DB_VALIDATION_INTERVAL || '30000'), // 30s

        // SSL configuration (if needed)
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

        // Application name for monitoring
        application_name: `workflow-backend-${process.env.POD_ID || 'unknown'}`,

        // Keep alive settings
        keepAlive: true,
        keepAliveInitialDelayMillis: parseInt(process.env.DB_KEEPALIVE_DELAY || '10000'), // 10s
      },
      // Additional TypeORM settings
      maxQueryExecutionTime: parseInt(process.env.DB_MAX_QUERY_TIME || '30000'), // 30s
      // cache: {
      //   // Use safe Redis cache provider with proper timeouts
      //   provider: () => getCacheProvider().getCache(),
      //   duration: parseInt(process.env.DB_CACHE_DURATION || '300000', 10), // 5 minutes
      //   ignoreErrors: true, // never crash queries if cache is unhappy
      // },
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
    TestUtilsModule,
    WorkflowTriggerModule
  ],
  controllers: [HealthController, WorkflowController, SubscriptionPurchaseController],
  providers: [
    DummyDataService,
    EmailService,
    SubscriptionTriggerService,
    NewsletterTriggerService,
    SharedFlowService,
    WorkflowActionService,
    WorkflowRecoveryService,
    WorkflowStateMachineService,
    SubscriptionPurchaseService
  ]
})
export class AppModule {}