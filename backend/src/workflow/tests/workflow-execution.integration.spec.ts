import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WorkflowExecutionEngine } from '../execution/workflow-execution-engine';
import { DummyDataService } from '../../services/dummy-data.service';
import { EmailService } from '../../services/email.service';
import { SubscriptionTriggerService } from '../../services/subscription-trigger.service';
import { NewsletterTriggerService } from '../../services/newsletter-trigger.service';
import { SharedFlowService } from '../../services/shared-flow.service';
import { WorkflowActionService } from '../../services/workflow-action.service';
import { WorkflowRecoveryService } from '../../services/workflow-recovery.service';
import { WorkflowStateMachineService } from '../state-machine/workflow-state-machine';
import { DummyUser } from '../../database/entities/dummy-user.entity';
import { DummySubscription } from '../../database/entities/dummy-subscription.entity';
import { DummySubscriptionType } from '../../database/entities/dummy-subscription-type.entity';
import { DummyNewsletter } from '../../database/entities/dummy-newsletter.entity';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../../database/entities/workflow-delay.entity';
import { EmailLog } from '../../database/entities/email-log.entity';

describe('WorkflowExecutionEngine Integration Tests', () => {
  let app: TestingModule;
  let workflowEngine: WorkflowExecutionEngine;
  let dummyDataService: DummyDataService;
  let emailService: EmailService;
  let userRepository: any;
  let subscriptionRepository: any;
  let newsletterRepository: any;
  let executionRepository: any;
  let delayRepository: any;
  let emailLogRepository: any;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test'
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT || '5432'),
          username: process.env.TEST_DB_USER || 'test_user',
          password: process.env.TEST_DB_PASSWORD || 'test_password',
          database: process.env.TEST_DB_NAME || 'workflow_test',
          entities: [
            DummyUser,
            DummySubscription,
            DummySubscriptionType,
            DummyNewsletter,
            WorkflowExecution,
            WorkflowDelay,
            EmailLog
          ],
          synchronize: true, // Only for testing
          logging: false
        }),
        TypeOrmModule.forFeature([
          DummyUser,
          DummySubscription,
          DummySubscriptionType,
          DummyNewsletter,
          WorkflowExecution,
          WorkflowDelay,
          EmailLog
        ])
      ],
      providers: [
        WorkflowExecutionEngine,
        DummyDataService,
        EmailService,
        SubscriptionTriggerService,
        NewsletterTriggerService,
        SharedFlowService,
        WorkflowActionService,
        WorkflowRecoveryService,
        WorkflowStateMachineService
      ]
    }).compile();

    workflowEngine = app.get<WorkflowExecutionEngine>(WorkflowExecutionEngine);
    dummyDataService = app.get<DummyDataService>(DummyDataService);
    emailService = app.get<EmailService>(EmailService);

    // Get repositories
    userRepository = app.get('DummyUserRepository');
    subscriptionRepository = app.get('DummySubscriptionRepository');
    newsletterRepository = app.get('DummyNewsletterRepository');
    executionRepository = app.get('WorkflowExecutionRepository');
    delayRepository = app.get('WorkflowDelayRepository');
    emailLogRepository = app.get('EmailLogRepository');

    // Initialize dummy data
    await dummyDataService.initializeDummyData();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await emailLogRepository.delete({});
    await delayRepository.delete({});
    await executionRepository.delete({});
    await subscriptionRepository.delete({});
    await newsletterRepository.delete({});
    await userRepository.delete({});
  });

  describe('Subscription Workflow Execution', () => {
    it('should execute United subscription workflow with all steps', async () => {
      // Create test user
      const user = await userRepository.save({
        email: 'test.united@example.com',
        name: 'Test United User',
        phoneNumber: '+1234567890',
        isActive: true,
        timezone: 'UTC'
      });

      // Create United subscription
      const subscription = await subscriptionRepository.save({
        userId: user.id,
        product: 'united',
        status: 'active',
        amount: 9.99,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Execute workflow
      await workflowEngine.executeSubscriptionWorkflow(subscription);

      // Verify execution was created
      const executions = await executionRepository.find({
        where: { triggerId: subscription.id }
      });
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe('running');

      // Verify emails were sent
      const emails = await emailLogRepository.find({
        where: { executionId: executions[0].executionId }
      });
      expect(emails).toHaveLength(1);
      expect(emails[0].templateId).toBe('united_welcome');
      expect(emails[0].to).toBe(user.email);

      // Verify delay was scheduled
      const delays = await delayRepository.find({
        where: { executionId: executions[0].id }
      });
      expect(delays).toHaveLength(1);
      expect(delays[0].delayMs).toBe(2 * 24 * 60 * 60 * 1000); // 2 days
    });

    it('should execute Podcast subscription workflow with all steps', async () => {
      // Create test user
      const user = await userRepository.save({
        email: 'test.podcast@example.com',
        name: 'Test Podcast User',
        phoneNumber: '+1234567891',
        isActive: true,
        timezone: 'UTC'
      });

      // Create Podcast subscription
      const subscription = await subscriptionRepository.save({
        userId: user.id,
        product: 'podcast',
        status: 'active',
        amount: 4.99,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Execute workflow
      await workflowEngine.executeSubscriptionWorkflow(subscription);

      // Verify execution was created
      const executions = await executionRepository.find({
        where: { triggerId: subscription.id }
      });
      expect(executions).toHaveLength(1);

      // Verify emails were sent
      const emails = await emailLogRepository.find({
        where: { executionId: executions[0].executionId }
      });
      expect(emails).toHaveLength(1);
      expect(emails[0].templateId).toBe('podcast_welcome');
    });

    it('should execute generic subscription workflow for unknown product', async () => {
      // Create test user
      const user = await userRepository.save({
        email: 'test.generic@example.com',
        name: 'Test Generic User',
        phoneNumber: '+1234567892',
        isActive: true,
        timezone: 'UTC'
      });

      // Create generic subscription
      const subscription = await subscriptionRepository.save({
        userId: user.id,
        product: 'unknown',
        status: 'active',
        amount: 0,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Execute workflow
      await workflowEngine.executeSubscriptionWorkflow(subscription);

      // Verify execution was created
      const executions = await executionRepository.find({
        where: { triggerId: subscription.id }
      });
      expect(executions).toHaveLength(1);

      // Verify emails were sent
      const emails = await emailLogRepository.find({
        where: { executionId: executions[0].executionId }
      });
      expect(emails).toHaveLength(1);
      expect(emails[0].templateId).toBe('generic_welcome');
    });
  });

  describe('Newsletter Workflow Execution', () => {
    it('should execute newsletter subscription workflow', async () => {
      // Create test user
      const user = await userRepository.save({
        email: 'test.newsletter@example.com',
        name: 'Test Newsletter User',
        phoneNumber: '+1234567893',
        isActive: true,
        timezone: 'UTC'
      });

      // Create newsletter subscription
      const newsletter = await newsletterRepository.save({
        userId: user.id,
        email: user.email,
        status: 'subscribed',
        emailVerified: true,
        source: 'website',
        workflowProcessed: false,
        subscribedAt: new Date()
      });

      // Execute workflow
      await workflowEngine.executeNewsletterWorkflow(newsletter);

      // Verify execution was created
      const executions = await executionRepository.find({
        where: { triggerId: newsletter.id }
      });
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe('running');

      // Verify emails were sent
      const emails = await emailLogRepository.find({
        where: { executionId: executions[0].executionId }
      });
      expect(emails).toHaveLength(1);
      expect(emails[0].templateId).toBe('newsletter_welcome');
      expect(emails[0].to).toBe(user.email);
    });
  });

  describe('Delay Processing', () => {
    it('should process delayed executions after delay period', async () => {
      // Create test user and subscription
      const user = await userRepository.save({
        email: 'test.delay@example.com',
        name: 'Test Delay User',
        phoneNumber: '+1234567894',
        isActive: true,
        timezone: 'UTC'
      });

      const subscription = await subscriptionRepository.save({
        userId: user.id,
        product: 'united',
        status: 'active',
        amount: 9.99,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Execute workflow (this will schedule delays)
      await workflowEngine.executeSubscriptionWorkflow(subscription);

      // Verify delay was scheduled
      const delays = await delayRepository.find();
      expect(delays).toHaveLength(1);
      expect(delays[0].status).toBe('pending');

      // Manually set delay to be ready for execution (for testing)
      const pastTime = new Date(Date.now() - 1000); // 1 second ago
      await delayRepository.update(delays[0].id, {
        executeAt: pastTime
      });

      // Process delayed executions
      await workflowEngine.processDelayedExecutions();

      // Verify delay was processed
      const updatedDelays = await delayRepository.find();
      expect(updatedDelays[0].status).toBe('executed');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple subscriptions in batch', async () => {
      // Create multiple test users and subscriptions
      const users = [];
      const subscriptions = [];

      for (let i = 0; i < 3; i++) {
        const user = await userRepository.save({
          email: `test.batch${i}@example.com`,
          name: `Test Batch User ${i}`,
          phoneNumber: `+123456789${i}`,
          isActive: true,
          timezone: 'UTC'
        });
        users.push(user);

        const subscription = await subscriptionRepository.save({
          userId: user.id,
          product: i === 0 ? 'united' : i === 1 ? 'podcast' : 'unknown',
          status: 'active',
          amount: 9.99,
          currency: 'USD',
          workflowProcessed: false,
          createdAt: new Date()
        });
        subscriptions.push(subscription);
      }

      // Process batch
      await workflowEngine.processSubscriptionWorkflows();

      // Verify all executions were created
      const executions = await executionRepository.find();
      expect(executions).toHaveLength(3);

      // Verify all emails were sent
      const emails = await emailLogRepository.find();
      expect(emails).toHaveLength(3);

      // Verify all subscriptions were marked as processed
      const processedSubscriptions = await subscriptionRepository.find({
        where: { workflowProcessed: true }
      });
      expect(processedSubscriptions).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow execution failures gracefully', async () => {
      // Create test user
      const user = await userRepository.save({
        email: 'test.error@example.com',
        name: 'Test Error User',
        phoneNumber: '+1234567895',
        isActive: true,
        timezone: 'UTC'
      });

      // Create subscription with invalid data to cause error
      const subscription = await subscriptionRepository.save({
        userId: user.id,
        product: 'united',
        status: 'active',
        amount: 9.99,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Mock email service to throw error
      jest.spyOn(emailService, 'sendEmail').mockRejectedValueOnce(
        new Error('Email service unavailable')
      );

      // Execute workflow
      await expect(
        workflowEngine.executeSubscriptionWorkflow(subscription)
      ).rejects.toThrow();

      // Verify execution was marked as failed
      const executions = await executionRepository.find({
        where: { triggerId: subscription.id }
      });
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe('failed');
    });
  });

  describe('State Persistence', () => {
    it('should persist workflow state across executions', async () => {
      // Create test user and subscription
      const user = await userRepository.save({
        email: 'test.state@example.com',
        name: 'Test State User',
        phoneNumber: '+1234567896',
        isActive: true,
        timezone: 'UTC'
      });

      const subscription = await subscriptionRepository.save({
        userId: user.id,
        product: 'united',
        status: 'active',
        amount: 9.99,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Execute workflow
      await workflowEngine.executeSubscriptionWorkflow(subscription);

      // Verify state was persisted
      const execution = await executionRepository.findOne({
        where: { triggerId: subscription.id }
      });
      expect(execution.state).toBeDefined();
      expect(execution.state.currentState).toBe('running');
      expect(execution.state.history).toBeDefined();
      expect(execution.state.context).toBeDefined();
    });
  });

  describe('Email Service Integration', () => {
    it('should log all sent emails', async () => {
      // Create test user and subscription
      const user = await userRepository.save({
        email: 'test.email@example.com',
        name: 'Test Email User',
        phoneNumber: '+1234567897',
        isActive: true,
        timezone: 'UTC'
      });

      const subscription = await subscriptionRepository.save({
        userId: user.id,
        product: 'united',
        status: 'active',
        amount: 9.99,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Execute workflow
      await workflowEngine.executeSubscriptionWorkflow(subscription);

      // Verify email was logged
      const emails = await emailLogRepository.find();
      expect(emails).toHaveLength(1);
      expect(emails[0].to).toBe(user.email);
      expect(emails[0].subject).toBe('Welcome to United! 🪅');
      expect(emails[0].templateId).toBe('united_welcome');
      expect(emails[0].status).toBe('sent');
    });

    it('should handle email sending failures', async () => {
      // Create test user and subscription
      const user = await userRepository.save({
        email: 'test.email.fail@example.com',
        name: 'Test Email Fail User',
        phoneNumber: '+1234567898',
        isActive: true,
        timezone: 'UTC'
      });

      const subscription = await subscriptionRepository.save({
        userId: user.id,
        product: 'united',
        status: 'active',
        amount: 9.99,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Mock email service to fail
      jest.spyOn(emailService, 'sendEmail').mockResolvedValueOnce({
        success: false,
        error: 'SMTP connection failed'
      });

      // Execute workflow
      await expect(
        workflowEngine.executeSubscriptionWorkflow(subscription)
      ).rejects.toThrow();

      // Verify failed email was logged
      const emails = await emailLogRepository.find();
      expect(emails).toHaveLength(1);
      expect(emails[0].status).toBe('failed');
      expect(emails[0].error).toBe('SMTP connection failed');
    });
  });
});
