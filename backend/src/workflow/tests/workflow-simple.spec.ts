import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowExecutionEngine } from '../execution/workflow-execution-engine';
import { DummyDataService } from '../../services/dummy-data.service';
import { EmailService } from '../../services/email.service';
import { SubscriptionTriggerService } from '../../services/subscription-trigger.service';
import { NewsletterTriggerService } from '../../services/newsletter-trigger.service';
import { SharedFlowService } from '../../services/shared-flow.service';
import { WorkflowActionService } from '../../services/workflow-action.service';
import { WorkflowRecoveryService } from '../../services/workflow-recovery.service';
import { WorkflowStateMachineService } from '../state-machine/workflow-state-machine';

describe('WorkflowExecutionEngine Simple Tests', () => {
  let workflowEngine: WorkflowExecutionEngine;
  let dummyDataService: DummyDataService;
  let emailService: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowExecutionEngine,
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

    workflowEngine = module.get<WorkflowExecutionEngine>(WorkflowExecutionEngine);
    dummyDataService = module.get<DummyDataService>(DummyDataService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(workflowEngine).toBeDefined();
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
    expect(startResult.message).toContain('Execution not found');

    // Test stop workflow
    const stopResult = await workflowEngine.stopWorkflow(executionId);
    expect(stopResult).toBeDefined();
    expect(stopResult.success).toBe(false);
    expect(stopResult.message).toContain('Execution not found');

    // Test pause workflow
    const pauseResult = await workflowEngine.pauseWorkflow(executionId);
    expect(pauseResult).toBeDefined();
    expect(pauseResult.success).toBe(false);
    expect(pauseResult.message).toContain('Execution not found');

    // Test resume workflow
    const resumeResult = await workflowEngine.resumeWorkflow(executionId);
    expect(resumeResult).toBeDefined();
    expect(resumeResult.success).toBe(false);
    expect(resumeResult.message).toContain('Execution not found');

    // Test cancel workflow
    const cancelResult = await workflowEngine.cancelWorkflow(executionId);
    expect(cancelResult).toBeDefined();
    expect(cancelResult.success).toBe(false);
    expect(cancelResult.message).toContain('Execution not found');
  });
});
