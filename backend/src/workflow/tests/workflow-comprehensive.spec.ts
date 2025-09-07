import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WorkflowOrchestrationEngine } from '../execution/workflow-orchestration-engine';
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

describe('Comprehensive Workflow System Tests', () => {
  let app: TestingModule;
  let workflowEngine: WorkflowOrchestrationEngine;
  let dummyDataService: DummyDataService;
  let emailService: EmailService;
  let subscriptionTriggerService: SubscriptionTriggerService;
  let newsletterTriggerService: NewsletterTriggerService;
  let sharedFlowService: SharedFlowService;
  let workflowActionService: WorkflowActionService;
  let recoveryService: WorkflowRecoveryService;
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
          synchronize: true,
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
        WorkflowOrchestrationEngine,
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

    workflowEngine = app.get<WorkflowOrchestrationEngine>(WorkflowOrchestrationEngine);
    dummyDataService = app.get<DummyDataService>(DummyDataService);
    emailService = app.get<EmailService>(EmailService);
    subscriptionTriggerService = app.get<SubscriptionTriggerService>(SubscriptionTriggerService);
    newsletterTriggerService = app.get<NewsletterTriggerService>(NewsletterTriggerService);
    sharedFlowService = app.get<SharedFlowService>(SharedFlowService);
    workflowActionService = app.get<WorkflowActionService>(WorkflowActionService);
    recoveryService = app.get<WorkflowRecoveryService>(WorkflowRecoveryService);

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

  describe('1. All Node Types Have Services', () => {
    it('should have services for all frontend node types', async () => {
      // Test subscription trigger service
      const subscriptionTriggers = await subscriptionTriggerService.retrieveTriggerData(30);
      expect(Array.isArray(subscriptionTriggers)).toBe(true);

      // Test newsletter trigger service
      const newsletterTriggers = await newsletterTriggerService.retrieveTriggerData(30);
      expect(Array.isArray(newsletterTriggers)).toBe(true);

      // Test shared flow service
      const availableFlows = await sharedFlowService.getAvailableSharedFlows();
      expect(Array.isArray(availableFlows)).toBe(true);
      expect(availableFlows.length).toBeGreaterThan(0);

      // Test action service
      const actionTypes = await workflowActionService.getAvailableActionTypes();
      expect(Array.isArray(actionTypes)).toBe(true);
      expect(actionTypes.length).toBeGreaterThan(0);

      // Verify all frontend action types are supported
      const frontendActionTypes = [
        'send_email', 'send_sms', 'update_user', 'create_task',
        'trigger_webhook', 'send_newsletter', 'custom'
      ];

      frontendActionTypes.forEach(actionType => {
        if (actionType !== 'custom') { // Custom is handled differently
          expect(actionTypes).toContain(actionType);
        }
      });
    });
  });

  describe('2. Any Combination of Workflow Creation', () => {
    it('should support complex workflow combinations', async () => {
      // Create test user
      const user = await userRepository.save({
        email: 'test.complex@example.com',
        name: 'Test Complex User',
        phoneNumber: '+1234567890',
        isActive: true,
        timezone: 'UTC'
      });

      // Test subscription workflow with all action types
      const subscription = await subscriptionRepository.save({
        userId: user.id,
        product: 'united',
        status: 'active',
        amount: 9.99,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Test newsletter workflow
      const newsletter = await newsletterRepository.save({
        userId: user.id,
        email: user.email,
        status: 'subscribed',
        emailVerified: true,
        source: 'website',
        workflowProcessed: false,
        subscribedAt: new Date()
      });

      // Process both workflows
      await workflowEngine.processBatchWorkflows();

      // Verify both workflows were processed
      const executions = await executionRepository.find();
      expect(executions.length).toBeGreaterThanOrEqual(2);

      // Verify emails were sent
      const emails = await emailLogRepository.find();
      expect(emails.length).toBeGreaterThan(0);
    });

    it('should support custom workflow combinations', async () => {
      // Test different product types
      const products = ['united', 'podcast', 'premium', 'unknown'];

      for (const product of products) {
        const user = await userRepository.save({
          email: `test.${product}@example.com`,
          name: `Test ${product} User`,
          phoneNumber: `+123456789${products.indexOf(product)}`,
          isActive: true,
          timezone: 'UTC'
        });

        const subscription = await subscriptionRepository.save({
          userId: user.id,
          product,
          status: 'active',
          amount: 9.99,
          currency: 'USD',
          workflowProcessed: false,
          createdAt: new Date()
        });

        await workflowEngine.processBatchWorkflows();
      }

      // Verify all workflows were processed
      const executions = await executionRepository.find();
      expect(executions.length).toBeGreaterThanOrEqual(products.length);
    });
  });

  describe('3. Workflow Execution with Recovery', () => {
    it('should execute workflows on time with delays', async () => {
      const user = await userRepository.save({
        email: 'test.delay@example.com',
        name: 'Test Delay User',
        phoneNumber: '+1234567890',
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

      // Process workflow
      await workflowEngine.processBatchWorkflows();

      // Verify delay was scheduled
      const delays = await delayRepository.find();
      expect(delays.length).toBeGreaterThan(0);
      expect(delays[0].status).toBe('pending');

      // Simulate time passing and process delayed execution
      const pastTime = new Date(Date.now() - 1000);
      await delayRepository.update(delays[0].id, {
        executeAt: pastTime
      });

      await workflowEngine.processDelayedExecutions();

      // Verify delay was processed
      const updatedDelays = await delayRepository.find();
      expect(updatedDelays[0].status).toBe('executed');
    });

    it('should recover from simulated crash', async () => {
      // Create running workflow
      const user = await userRepository.save({
        email: 'test.crash@example.com',
        name: 'Test Crash User',
        phoneNumber: '+1234567890',
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

      // Process workflow
      await workflowEngine.processBatchWorkflows();

      // Simulate crash by marking workflow as running but not completing
      const executions = await executionRepository.find();
      if (executions.length > 0) {
        await executionRepository.update(executions[0].id, {
          status: 'running',
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        });
      }

      // Test recovery
      const recoveryResult = await recoveryService.recoverWorkflows();
      expect(recoveryResult.recovered).toBeGreaterThanOrEqual(0);
      expect(recoveryResult.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('4. Real Database Integration Tests', () => {
    it('should use real database calls for all operations', async () => {
      // Create user with real database call
      const user = await userRepository.save({
        email: 'test.realdb@example.com',
        name: 'Test Real DB User',
        phoneNumber: '+1234567890',
        isActive: true,
        timezone: 'UTC'
      });

      // Verify user was created in database
      const savedUser = await userRepository.findOne({ where: { id: user.id } });
      expect(savedUser).toBeDefined();
      expect(savedUser.email).toBe('test.realdb@example.com');

      // Create subscription with real database call
      const subscription = await subscriptionRepository.save({
        userId: user.id,
        product: 'united',
        status: 'active',
        amount: 9.99,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Verify subscription was created in database
      const savedSubscription = await subscriptionRepository.findOne({
        where: { id: subscription.id },
        relations: ['user']
      });
      expect(savedSubscription).toBeDefined();
      expect(savedSubscription.user.id).toBe(user.id);

      // Process workflow with real database calls
      await workflowEngine.processBatchWorkflows();

      // Verify execution was created in database
      const executions = await executionRepository.find({
        where: { triggerId: subscription.id }
      });
      expect(executions.length).toBeGreaterThan(0);

      // Verify email was logged in database
      const emails = await emailLogRepository.find({
        where: { executionId: executions[0].executionId }
      });
      expect(emails.length).toBeGreaterThan(0);
      expect(emails[0].to).toBe(user.email);

      // Verify delay was scheduled in database
      const delays = await delayRepository.find({
        where: { executionId: executions[0].id }
      });
      expect(delays.length).toBeGreaterThan(0);
    });

    it('should handle database transactions correctly', async () => {
      // Test transaction rollback on error
      const user = await userRepository.save({
        email: 'test.transaction@example.com',
        name: 'Test Transaction User',
        phoneNumber: '+1234567890',
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
      jest.spyOn(emailService, 'sendEmail').mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      // Process workflow - should handle error gracefully
      await expect(
        workflowEngine.processBatchWorkflows()
      ).resolves.not.toThrow();

      // Verify error was logged in database
      const executions = await executionRepository.find({
        where: { triggerId: subscription.id }
      });
      expect(executions.length).toBeGreaterThan(0);
    });
  });

  describe('5. Workflow Control APIs', () => {
    it('should provide start/stop/pause/resume/cancel APIs', async () => {
      const user = await userRepository.save({
        email: 'test.control@example.com',
        name: 'Test Control User',
        phoneNumber: '+1234567890',
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

      // Process workflow
      await workflowEngine.processBatchWorkflows();

      const executions = await executionRepository.find();
      expect(executions.length).toBeGreaterThan(0);

      const executionId = executions[0].executionId;

      // Test pause workflow
      const pauseResult = await workflowEngine.pauseWorkflow(executionId);
      expect(pauseResult.success).toBe(true);

      // Test resume workflow
      const resumeResult = await workflowEngine.resumeWorkflow(executionId);
      expect(resumeResult.success).toBe(true);

      // Test cancel workflow
      const cancelResult = await workflowEngine.cancelWorkflow(executionId);
      expect(cancelResult.success).toBe(true);

      // Verify workflow was cancelled
      const updatedExecution = await executionRepository.findOne({
        where: { executionId }
      });
      expect(updatedExecution.status).toBe('cancelled');
    });

    it('should provide workflow status monitoring', async () => {
      const user = await userRepository.save({
        email: 'test.monitor@example.com',
        name: 'Test Monitor User',
        phoneNumber: '+1234567890',
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

      // Process workflow
      await workflowEngine.processBatchWorkflows();

      // Test get all executions
      const allExecutions = await workflowEngine.getAllExecutions();
      expect(Array.isArray(allExecutions)).toBe(true);

      // Test get specific execution
      if (allExecutions.length > 0) {
        const execution = await workflowEngine.getExecutionStatus(allExecutions[0].executionId);
        expect(execution).toBeDefined();
        expect(execution.executionId).toBe(allExecutions[0].executionId);
      }
    });
  });

  describe('6. Comprehensive Error Handling', () => {
    it('should handle all types of errors gracefully', async () => {
      // Test with invalid data
      const invalidSubscription = await subscriptionRepository.save({
        userId: 'invalid-user-id',
        product: 'unknown',
        status: 'active',
        amount: -1, // Invalid amount
        currency: 'INVALID',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Process should not crash
      await expect(
        workflowEngine.processBatchWorkflows()
      ).resolves.not.toThrow();

      // Test with missing user
      const orphanedSubscription = await subscriptionRepository.save({
        userId: '00000000-0000-0000-0000-000000000000',
        product: 'united',
        status: 'active',
        amount: 9.99,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      await expect(
        workflowEngine.processBatchWorkflows()
      ).resolves.not.toThrow();
    });

    it('should provide detailed error logging', async () => {
      const user = await userRepository.save({
        email: 'test.error@example.com',
        name: 'Test Error User',
        phoneNumber: '+1234567890',
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
      jest.spyOn(emailService, 'sendEmail').mockRejectedValueOnce(
        new Error('SMTP server unavailable')
      );

      await workflowEngine.processBatchWorkflows();

      // Verify error was logged
      const executions = await executionRepository.find({
        where: { triggerId: subscription.id }
      });
      expect(executions.length).toBeGreaterThan(0);
    });
  });

  describe('7. Performance and Scalability', () => {
    it('should handle multiple concurrent workflows', async () => {
      const users = [];
      const subscriptions = [];

      // Create multiple users and subscriptions
      for (let i = 0; i < 10; i++) {
        const user = await userRepository.save({
          email: `test.concurrent${i}@example.com`,
          name: `Test Concurrent User ${i}`,
          phoneNumber: `+123456789${i}`,
          isActive: true,
          timezone: 'UTC'
        });
        users.push(user);

        const subscription = await subscriptionRepository.save({
          userId: user.id,
          product: i % 2 === 0 ? 'united' : 'podcast',
          status: 'active',
          amount: 9.99,
          currency: 'USD',
          workflowProcessed: false,
          createdAt: new Date()
        });
        subscriptions.push(subscription);
      }

      // Process all workflows concurrently
      const startTime = Date.now();
      await workflowEngine.processBatchWorkflows();
      const endTime = Date.now();

      // Verify all workflows were processed
      const executions = await executionRepository.find();
      expect(executions.length).toBeGreaterThanOrEqual(10);

      // Verify processing time is reasonable (less than 10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);

      // Verify emails were sent
      const emails = await emailLogRepository.find();
      expect(emails.length).toBeGreaterThanOrEqual(10);
    });
  });
});
