import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowOrchestrationEngine } from '../execution/workflow-orchestration-engine';
import { ActionService } from '../../services/action.service';
import { EmailService } from '../../services/email.service';
import { SharedFlowService } from '../../services/shared-flow.service';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../../database/entities/workflow-delay.entity';
import { VisualWorkflow } from '../visual-workflow.entity';
import { JsonLogicRule } from '../json-logic-rule.entity';
import { NodeRegistryService } from '../nodes/registry/node-registry.service';

describe('Workflow Execution Core Tests', () => {
  let workflowEngine: WorkflowOrchestrationEngine;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowOrchestrationEngine,
        ActionService,
        EmailService,
        SharedFlowService,
        {
          provide: getRepositoryToken(WorkflowExecution),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WorkflowDelay),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VisualWorkflow),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JsonLogicRule),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: NodeRegistryService,
          useValue: {
            getExecutor: jest.fn(),
            registerExecutor: jest.fn(),
            getAvailableNodeTypes: jest.fn(),
            getRegistryStats: jest.fn(),
          },
        },
      ],
    }).compile();

    workflowEngine = module.get<WorkflowOrchestrationEngine>(WorkflowOrchestrationEngine);
  });

  it('should be defined', () => {
    expect(workflowEngine).toBeDefined();
  });

  it('should have required methods', () => {
    expect(typeof workflowEngine.processBatchWorkflows).toBe('function');
    expect(typeof workflowEngine.processDelayedExecutions).toBe('function');
    expect(typeof workflowEngine.getAllExecutions).toBe('function');
    expect(typeof workflowEngine.getExecutionStatus).toBe('function');
  });

  describe('Workflow Execution Tests', () => {
    it('should handle send_email custom operation', async () => {
      const testData = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        subscription_package: 'premium'
      };

      const context = {
        executionId: 'test-execution-1',
        workflowId: 'test-workflow',
        triggerType: 'user_created',
        triggerId: 'test-trigger-1',
        userId: 'test-user',
        triggerData: testData,
        data: testData,
        metadata: {
          source: 'test',
          timestamp: new Date(),
          userId: 'test-user'
        },
        createdAt: new Date()
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

      const result = await workflowEngine['executeCustomOperations'](sendEmailRule, context.data, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.actionType).toBe('send_email');
      expect(result.actionName).toBe('send_email_action');
      expect(result.executionTime).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should handle send_email operation with dynamic data from context', async () => {
      const testData = {
        id: 2,
        email: 'user@example.com',
        name: 'John Doe',
        subscription_package: 'enterprise'
      };

      const context = {
        executionId: 'test-execution-2',
        workflowId: 'test-workflow',
        triggerType: 'user_created',
        triggerId: 'test-trigger-2',
        userId: 'user-2',
        triggerData: testData,
        data: testData,
        metadata: {
          source: 'test',
          timestamp: new Date(),
          userId: 'user-2'
        },
        createdAt: new Date()
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

      const result = await workflowEngine['executeCustomOperations'](sendEmailRule, context.data, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.actionType).toBe('send_email');
      expect(result.actionName).toBe('send_email_action');
      expect(result.executionTime).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should handle product_package condition', async () => {
      const testData = {
        id: 6,
        email: 'test@example.com',
        subscription_package: 'premium'
      };

      const context = {
        executionId: 'test-execution-3',
        workflowId: 'test-workflow',
        triggerType: 'user_created',
        triggerId: 'test-trigger-3',
        userId: 'user-6',
        triggerData: testData,
        data: testData,
        metadata: {
          source: 'test',
          timestamp: new Date(),
          userId: 'user-6'
        },
        createdAt: new Date()
      };

      // Test with product_package condition
      const conditionRule = {
        "product_package": "premium"
      };

      const result = await workflowEngine['executeCustomOperations'](conditionRule, context.data, context);

      expect(result).toBe(true);
    });

    it('should handle non-matching product_package condition', async () => {
      const testData = {
        id: 6,
        email: 'test@example.com',
        subscription_package: 'basic'
      };

      const context = {
        executionId: 'test-execution-4',
        workflowId: 'test-workflow',
        triggerType: 'user_created',
        triggerId: 'test-trigger-4',
        userId: 'user-6',
        triggerData: testData,
        data: testData,
        metadata: {
          source: 'test',
          timestamp: new Date(),
          userId: 'user-6'
        },
        createdAt: new Date()
      };

      // Test with non-matching product_package condition
      const conditionRule = {
        "product_package": "premium"
      };

      const result = await workflowEngine['executeCustomOperations'](conditionRule, context.data, context);

      expect(result).toBe(false);
    });
  });
});