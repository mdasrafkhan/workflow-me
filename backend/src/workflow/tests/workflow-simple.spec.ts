import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowOrchestrationEngine } from '../execution/workflow-orchestration-engine';
import { DummyDataService } from '../../services/dummy-data.service';
import { EmailService } from '../../services/email.service';
import { SubscriptionTriggerService } from '../../services/subscription-trigger.service';
import { NewsletterTriggerService } from '../../services/newsletter-trigger.service';
import { SharedFlowService } from '../../services/shared-flow.service';
import { WorkflowActionService } from '../../services/workflow-action.service';
import { WorkflowRecoveryService } from '../../services/workflow-recovery.service';
import { WorkflowStateMachineService } from '../state-machine/workflow-state-machine';
import { WorkflowExecutor } from '../execution/WorkflowExecutor';

describe('WorkflowExecutionEngine Simple Tests', () => {
  let workflowEngine: WorkflowOrchestrationEngine;
  let workflowExecutor: WorkflowExecutor;
  let dummyDataService: DummyDataService;
  let emailService: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowOrchestrationEngine,
        WorkflowExecutor,
        DummyDataService,
        EmailService,
        SubscriptionTriggerService,
        NewsletterTriggerService,
        SharedFlowService,
        WorkflowActionService,
        WorkflowRecoveryService,
        WorkflowStateMachineService,
        // Mock repositories
        {
          provide: 'DummyUserRepository',
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: 'DummySubscriptionRepository',
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: 'DummyNewsletterRepository',
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: 'WorkflowExecutionRepository',
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: 'WorkflowDelayRepository',
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: 'EmailLogRepository',
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    workflowEngine = module.get<WorkflowOrchestrationEngine>(WorkflowOrchestrationEngine);
    workflowExecutor = module.get<WorkflowExecutor>(WorkflowExecutor);
    dummyDataService = module.get<DummyDataService>(DummyDataService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(workflowEngine).toBeDefined();
    expect(workflowExecutor).toBeDefined();
    expect(dummyDataService).toBeDefined();
    expect(emailService).toBeDefined();
  });

  it('should have required methods', () => {
    expect(typeof workflowEngine.processBatchWorkflows).toBe('function');
    expect(typeof workflowEngine.processDelayedExecutions).toBe('function');
    expect(typeof workflowEngine.getAllExecutions).toBe('function');
    expect(typeof workflowEngine.getExecutionStatus).toBe('function');
  });

  it('should handle empty batch processing', async () => {
    // Mock empty results
    const subscriptionTriggerService = workflowEngine['subscriptionTriggerService'];
    const newsletterTriggerService = workflowEngine['newsletterTriggerService'];

    jest.spyOn(subscriptionTriggerService, 'retrieveTriggerData').mockResolvedValue([]);
    jest.spyOn(newsletterTriggerService, 'retrieveTriggerData').mockResolvedValue([]);

    await expect(workflowEngine.processBatchWorkflows()).resolves.not.toThrow();
  });

  it('should handle workflow control operations', async () => {
    const executionId = 'test-execution-id';

    // Test start workflow
    const startResult = await workflowEngine.startWorkflow(executionId);
    expect(startResult).toBeDefined();
    expect(startResult.success).toBe(false); // Should fail because execution doesn't exist
    expect(startResult.error).toContain('Execution not found');

    // Test stop workflow
    const stopResult = await workflowEngine.stopWorkflow(executionId);
    expect(stopResult).toBeDefined();
    expect(stopResult.success).toBe(false);
    expect(stopResult.error).toContain('Execution not found');

    // Test pause workflow
    const pauseResult = await workflowEngine.pauseWorkflow(executionId);
    expect(pauseResult).toBeDefined();
    expect(pauseResult.success).toBe(false);
    expect(pauseResult.error).toContain('Execution not found');

    // Test resume workflow
    const resumeResult = await workflowEngine.resumeWorkflow(executionId);
    expect(resumeResult).toBeDefined();
    expect(resumeResult.success).toBe(false);
    expect(resumeResult.error).toContain('Execution not found');

    // Test cancel workflow
    const cancelResult = await workflowEngine.cancelWorkflow(executionId);
    expect(cancelResult).toBeDefined();
    expect(cancelResult.success).toBe(false);
    expect(cancelResult.error).toContain('Execution not found');
  });

  describe('Custom Operations Tests', () => {
    it('should handle send_email custom operation', async () => {
      const testData = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        subscription_package: 'premium'
      };

      const context = {
        data: testData,
        metadata: {
          source: 'test',
          timestamp: new Date(),
          userId: 'test-user'
        }
      };

      // Test send_email operation with basic parameters
      const sendEmailRule = {
        "send_email": {
          "to": "test@example.com",
          "subject": "Test Email",
          "template": "welcome",
          "data": {
            "name": "Test User",
            "package": "premium"
          }
        }
      };

      const result = await workflowExecutor['executeCustomOperations'](sendEmailRule, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.operation).toBe('send_email');
      expect(result.data).toEqual({
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome',
        data: {
          name: 'Test User',
          package: 'premium'
        }
      });
    });

    it('should handle send_email operation with dynamic data from context', async () => {
      const testData = {
        id: 2,
        email: 'user@example.com',
        name: 'John Doe',
        subscription_package: 'enterprise'
      };

      const context = {
        data: testData,
        metadata: {
          source: 'test',
          timestamp: new Date(),
          userId: 'user-2'
        }
      };

      // Test send_email operation with dynamic data
      const sendEmailRule = {
        "send_email": {
          "to": "{{data.email}}",
          "subject": "Welcome {{data.name}}!",
          "template": "enterprise_welcome",
          "data": {
            "name": "{{data.name}}",
            "package": "{{data.subscription_package}}",
            "userId": "{{data.id}}"
          }
        }
      };

      const result = await workflowExecutor['executeCustomOperations'](sendEmailRule, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.operation).toBe('send_email');
      expect(result.data.to).toBe('user@example.com');
      expect(result.data.subject).toBe('Welcome John Doe!');
      expect(result.data.template).toBe('enterprise_welcome');
      expect(result.data.data.name).toBe('John Doe');
      expect(result.data.data.package).toBe('enterprise');
      expect(result.data.data.userId).toBe(2);
    });

    it('should handle send_email operation with missing required fields', async () => {
      const testData = {
        id: 3,
        email: 'incomplete@example.com'
      };

      const context = {
        data: testData,
        metadata: {
          source: 'test',
          timestamp: new Date(),
          userId: 'user-3'
        }
      };

      // Test send_email operation with missing required fields
      const sendEmailRule = {
        "send_email": {
          "to": "incomplete@example.com"
          // Missing subject and template
        }
      };

      const result = await workflowExecutor['executeCustomOperations'](sendEmailRule, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should handle send_email operation with invalid email format', async () => {
      const testData = {
        id: 4,
        email: 'invalid-email'
      };

      const context = {
        data: testData,
        metadata: {
          source: 'test',
          timestamp: new Date(),
          userId: 'user-4'
        }
      };

      // Test send_email operation with invalid email
      const sendEmailRule = {
        "send_email": {
          "to": "invalid-email",
          "subject": "Test Email",
          "template": "welcome"
        }
      };

      const result = await workflowExecutor['executeCustomOperations'](sendEmailRule, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should handle send_email operation with template data interpolation', async () => {
      const testData = {
        id: 5,
        email: 'template@example.com',
        name: 'Template User',
        subscription_package: 'basic',
        amount: 29.99,
        currency: 'USD'
      };

      const context = {
        data: testData,
        metadata: {
          source: 'test',
          timestamp: new Date(),
          userId: 'user-5'
        }
      };

      // Test send_email operation with complex template data
      const sendEmailRule = {
        "send_email": {
          "to": "{{data.email}}",
          "subject": "Your {{data.subscription_package}} subscription is active",
          "template": "subscription_confirmation",
          "data": {
            "userName": "{{data.name}}",
            "package": "{{data.subscription_package}}",
            "amount": "{{data.amount}}",
            "currency": "{{data.currency}}",
            "subscriptionId": "{{data.id}}"
          }
        }
      };

      const result = await workflowExecutor['executeCustomOperations'](sendEmailRule, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.operation).toBe('send_email');
      expect(result.data.to).toBe('template@example.com');
      expect(result.data.subject).toBe('Your basic subscription is active');
      expect(result.data.template).toBe('subscription_confirmation');
      expect(result.data.data.userName).toBe('Template User');
      expect(result.data.data.package).toBe('basic');
      expect(result.data.data.amount).toBe('29.99');
      expect(result.data.data.currency).toBe('USD');
      expect(result.data.data.subscriptionId).toBe('5');
    });

    it('should handle non-send_email operations by returning null', async () => {
      const testData = {
        id: 6,
        email: 'test@example.com'
      };

      const context = {
        data: testData,
        metadata: {
          source: 'test',
          timestamp: new Date(),
          userId: 'user-6'
        }
      };

      // Test with a different operation that should not be handled
      const otherRule = {
        "product_package": "premium"
      };

      const result = await workflowExecutor['executeCustomOperations'](otherRule, context);

      expect(result).toBeNull();
    });
  });
});
