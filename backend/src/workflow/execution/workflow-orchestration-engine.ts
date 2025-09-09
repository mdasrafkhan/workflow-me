import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../../database/entities/workflow-delay.entity';
import { JsonLogicRule } from '../json-logic-rule.entity';
import { WorkflowDefinition, WorkflowStep, WorkflowExecutionContext } from '../types';
import { NodeRegistryService } from '../nodes/registry/node-registry.service';
import { ExecutionResult } from '../nodes/interfaces/node-executor.interface';
import { WorkflowExecutionResult } from './types';

/**
 * Clean Workflow Orchestration Engine
 *
 * This engine ONLY handles:
 * - Workflow orchestration and flow control
 * - Step execution coordination
 * - State management
 * - Error handling and recovery
 * - Cron job scheduling
 *
 * NO business logic - all moved to node executors!
 */
@Injectable()
export class WorkflowOrchestrationEngine {
  private readonly logger = new Logger(WorkflowOrchestrationEngine.name);

  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowDelay)
    private readonly delayRepository: Repository<WorkflowDelay>,
    @InjectRepository(JsonLogicRule)
    private readonly jsonLogicRuleRepository: Repository<JsonLogicRule>,
    private readonly nodeRegistry: NodeRegistryService
  ) {}

  // ============================================================================
  // CRON JOB ORCHESTRATION (No Business Logic)
  // ============================================================================

  /**
   * Main batch processing - runs every 30 seconds
   * ONLY handles orchestration, no business logic
   * DISABLED: Now handled by main workflow cron job
   */
  // @Cron(CronExpression.EVERY_30_SECONDS)
  async processBatchWorkflows(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Starting batch workflow processing...');

    try {
      // 1. Process pending delays (orchestration only)
      await this.processPendingDelays();

      // 2. Process active workflows (orchestration only)
      await this.processActiveWorkflows();

      const duration = Date.now() - startTime;
      this.logger.log(`Batch processing completed in ${duration}ms`);

    } catch (error) {
      this.logger.error(`Batch processing failed: ${error.message}`);
    }
  }

  /**
   * Process pending delays - orchestration only
   */
  private async processPendingDelays(): Promise<void> {
    const now = new Date();
    const pendingDelays = await this.delayRepository.find({
      where: {
        status: 'pending',
        executeAt: LessThan(now)
      },
      order: { executeAt: 'ASC' }
    });

    this.logger.log(`Found ${pendingDelays.length} pending delays to process`);

    for (const delay of pendingDelays) {
      try {
        await this.resumeWorkflowFromDelay(delay);
      } catch (error) {
        this.logger.error(`Failed to resume workflow from delay ${delay.id}: ${error.message}`);
        await this.markDelayAsFailed(delay, error.message);
      }
    }
  }

  /**
   * Process active workflows - orchestration only
   */
  private async processActiveWorkflows(): Promise<void> {
    const activeExecutions = await this.executionRepository.find({
      where: { status: 'running' },
      order: { createdAt: 'ASC' }
    });

    this.logger.log(`Found ${activeExecutions.length} active workflows to process`);

    for (const execution of activeExecutions) {
      try {
        await this.continueWorkflowExecution(execution);
      } catch (error) {
        this.logger.error(`Failed to continue workflow execution ${execution.id}: ${error.message}`);
        await this.markExecutionAsFailed(execution, error.message);
      }
    }
  }

  // ============================================================================
  // WORKFLOW EXECUTION ORCHESTRATION (No Business Logic)
  // ============================================================================

  /**
   * Execute a workflow - orchestration only
   * All business logic delegated to node executors
   */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecutionResult> {
    const executionId = this.generateExecutionId();
    this.logger.log(`Starting workflow execution: ${executionId} for workflow: ${workflow.id}`);

    try {
      // Create execution record
      const execution = await this.createExecutionRecord(executionId, context.workflowId, context);

      // Execute workflow steps using node registry
      const result = await this.executeWorkflowSteps(workflow, context, execution);

      // Update execution status
      await this.updateExecutionStatus(execution, result);

      this.logger.log(`Workflow execution completed: ${executionId} - Success: ${result.success}`);

      return {
        executionId,
        workflowId: workflow.id,
        success: result.success,
        result: result.result,
        error: result.error,
        executionTime: Date.now() - execution.createdAt.getTime(),
        steps: [], // This would be populated with actual step results
        timestamp: new Date(),
        metadata: {
          executionId,
          completedSteps: result.success ? 1 : 0,
          totalSteps: workflow.steps?.length || 0,
          userId: context.userId,
          workflowId: workflow.id,
          source: context.metadata?.source || 'orchestration-engine',
          timestamp: new Date()
        }
      };

    } catch (error) {
      this.logger.error(`Workflow execution failed: ${executionId} - ${error.message}`);
      return {
        executionId,
        workflowId: workflow.id,
        success: false,
        error: error.message,
        executionTime: 0,
        steps: [],
        timestamp: new Date(),
        metadata: {
          executionId,
          completedSteps: 0,
          totalSteps: workflow.steps?.length || 0,
          userId: context.userId,
          workflowId: workflow.id,
          source: context.metadata?.source || 'orchestration-engine',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Execute workflow steps - orchestration only
   * Delegates all business logic to node executors
   */
  private async executeWorkflowSteps(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<ExecutionResult> {
    const steps = workflow.steps;
    const completedSteps: string[] = [];
    let currentStepIndex = 0;

    while (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      this.logger.log(`🔄 EXECUTING STEP ${currentStepIndex + 1}/${steps.length}: ${step.type} (${step.id})`);

      try {
        // Get executor for this step type
        const executor = this.nodeRegistry.getExecutor(step.type);

        if (!executor) {
          throw new Error(`No executor found for step type: ${step.type}`);
        }

        // Validate step before execution
        const validation = executor.validate(step);
        if (!validation.isValid) {
          throw new Error(`Step validation failed: ${validation.errors.join(', ')}`);
        }

        // Execute step using node executor (business logic handled there)
        const stepResult = await executor.execute(step, context, execution);

        if (!stepResult.success) {
          throw new Error(`Step execution failed: ${stepResult.error}`);
        }

        // Record completed step
        completedSteps.push(step.id);
        this.logger.debug(`Step completed successfully: ${step.id}`);

        // Determine next step (orchestration logic only)
        currentStepIndex = this.determineNextStepIndex(steps, step, stepResult, currentStepIndex);

        // Check if workflow should be suspended (e.g., for delays)
        if (stepResult.metadata?.workflowSuspended) {
          this.logger.log(`Workflow suspended at step: ${step.id}`);
          return {
            success: true,
            result: stepResult.result,
            metadata: {
              ...stepResult.metadata,
              suspendedAt: step.id,
              completedSteps,
              resumeAt: stepResult.metadata.resumeAt
            }
          };
        }

      } catch (error) {
        this.logger.error(`Step execution failed: ${step.id} - ${error.message}`);
        return {
          success: false,
          error: `Step execution failed: ${error.message}`,
          metadata: {
            failedStep: step.id,
            completedSteps,
            error: error.message
          }
        };
      }
    }

    // All steps completed successfully
    return {
      success: true,
      result: {
        completedSteps,
        totalSteps: steps.length,
        completedAt: new Date().toISOString()
      },
      metadata: {
        completedSteps,
        totalSteps: steps.length
      }
    };
  }

  // ============================================================================
  // DELAY PROCESSING ORCHESTRATION (No Business Logic)
  // ============================================================================

  /**
   * Resume workflow from delay - orchestration only
   * Business logic handled by delay node executor
   */
  async resumeWorkflowFromDelay(delay: WorkflowDelay): Promise<void> {
    this.logger.log(`Resuming workflow from delay: ${delay.id}`);

    // Update delay status
    delay.status = 'executed';
    delay.executedAt = new Date();
    await this.delayRepository.save(delay);

    // Find the execution
    const execution = await this.executionRepository.findOne({
      where: { executionId: delay.executionId }
    });

    if (!execution) {
      throw new Error(`Execution not found for delay: ${delay.id}`);
    }

    // Resume workflow execution
    const workflow = await this.getWorkflowById(execution.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${execution.workflowId}`);
    }

    // Continue from where we left off
    await this.continueWorkflowExecution(execution);
  }

  /**
   * Continue workflow execution - orchestration only
   */
  private async continueWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    // This would continue from the last completed step
    // Implementation depends on your state management strategy
    this.logger.log(`Continuing workflow execution: ${execution.id}`);
  }

  // ============================================================================
  // UTILITY METHODS (No Business Logic)
  // ============================================================================

  private async createExecutionRecord(
    executionId: string,
    workflowId: string,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecution> {
    const execution = this.executionRepository.create({
      executionId: executionId,
      workflowId: workflowId,
      triggerType: context.triggerType || 'manual',
      triggerId: context.triggerId || 'unknown',
      userId: context.userId || 'unknown',
      status: 'running',
      currentStep: 'start',
      workflowDefinition: {}, // Add required workflowDefinition field
      state: {
        currentState: 'running',
        context: context.data || {},
        history: [],
        sharedFlows: []
      }
    });

    return await this.executionRepository.save(execution);
  }

  private async updateExecutionStatus(execution: WorkflowExecution, result: ExecutionResult): Promise<void> {
    execution.status = result.success ? 'completed' : 'failed';
    execution.state.history.push({
      stepId: 'final',
      state: result.success ? 'completed' : 'failed',
      timestamp: new Date(),
      result: result.result,
      error: result.error
    });
    await this.executionRepository.save(execution);
  }

  private async markDelayAsFailed(delay: WorkflowDelay, error: string): Promise<void> {
    delay.status = 'failed';
    delay.error = error;
    await this.delayRepository.save(delay);
  }

  private async markExecutionAsFailed(execution: WorkflowExecution, error: string): Promise<void> {
    execution.status = 'failed';
    execution.state.history.push({
      stepId: 'error',
      state: 'failed',
      timestamp: new Date(),
      error: error
    });
    await this.executionRepository.save(execution);
  }

  private async getWorkflowById(workflowId: string): Promise<WorkflowDefinition | null> {
    try {
      // Get the JsonLogic rule directly from the workflow table
      const jsonLogicRule = await this.jsonLogicRuleRepository.findOne({
        where: { id: workflowId }
      });

      if (!jsonLogicRule) {
        this.logger.error(`JsonLogic rule not found for workflowId: ${workflowId}`);
        return null;
      }

      // Convert JsonLogic rule to WorkflowDefinition
      return this.convertJsonLogicToWorkflowDefinition(
        jsonLogicRule.rule,
        workflowId,
        workflowId, // Use workflowId as the workflowUuid since we don't need visual workflow ID
        `Workflow ${workflowId}` // Simple name since we don't have visual workflow
      );
    } catch (error) {
      this.logger.error(`Error getting workflow by ID ${workflowId}:`, error);
      return null;
    }
  }

  private convertJsonLogicToWorkflowDefinition(jsonLogicRule: any, workflowId: string, workflowUuid: string, workflowName: string) {
    // This is a simplified conversion - in a real system, you'd have a proper converter
    let steps: any[] = [];

    // Handle different JsonLogic structures
    if (jsonLogicRule.steps) {
      // Direct steps array
      steps = jsonLogicRule.steps.map((step: any, index: number) => ({
        id: `step_${index}`,
        type: step.type || 'action',
        data: step,
        rule: step
      }));
    } else if (jsonLogicRule.and && Array.isArray(jsonLogicRule.and)) {
      // Direct 'and' structure - process each action as a separate step
      const actions = jsonLogicRule.and;
      steps = actions.map((action: any, actionIndex: number) => {
        // Determine step type and action details based on action keys
        let stepType = 'action';
        let actionType = 'custom';
        let actionName = 'custom_step';

        if (action.delay) {
          stepType = 'delay';
          actionType = 'delay';
          actionName = 'delay_step';
          // Add required delay fields for validation
          action.type = action.delay.type || '1_day';
          action.delayMs = this.convertDelayTypeToMs(action.delay.type);
        } else if (action.send_email) {
          stepType = 'action';
          actionType = 'send_email';
          actionName = 'send_email_step';
          // Add required email fields for validation
          if (action.send_email.data) {
            action.templateId = action.send_email.data.templateId;
            action.subject = action.send_email.data.subject;
            action.to = 'user@example.com'; // Default recipient
          }
        } else if (action.send_sms) {
          stepType = 'action';
          actionType = 'send_sms';
          actionName = 'send_sms_step';
        } else if (action.condition || action.if) {
          stepType = 'condition';
          actionType = 'custom';
          actionName = 'condition_step';
          // Add required condition fields for validation
          if (action.condition) {
            action.conditionType = action.condition.conditionType || 'custom_field';
            action.conditionValue = action.condition.conditionValue || action.condition;
            action.operator = action.condition.operator || 'equals';
          }
        } else if (action['=='] && Array.isArray(action['==']) && action['=='].length === 2) {
          // Handle JsonLogic condition like {"==": [{"var": "user.preferences.notifications"}, true]}
          stepType = 'condition';
          actionType = 'custom';
          actionName = 'condition_step';

          const [varPath, value] = action['=='];
          if (varPath && varPath.var) {
            const fieldPath = varPath.var;
            action.conditionType = 'user_condition';
            action.conditionValue = {
              field: fieldPath,
              value: value
            };
            action.operator = 'equals';
          }
        } else if (action.sharedFlow) {
          stepType = 'shared-flow';
          actionType = 'custom';
          actionName = 'shared_flow_step';
          // Add required flowName for shared flow validation
          action.flowName = action.sharedFlow.name || 'default_flow';
        } else if (action.end) {
          stepType = 'end';
          actionType = 'custom';
          actionName = 'end_step';
        } else {
          // For any other action, use 'custom' as the action type
          stepType = 'action';
          actionType = 'custom';
          actionName = 'custom_step';
        }

        return {
          id: `step_${actionIndex}`,
          type: stepType,
          data: {
            ...action,
            actionType,
            actionName
          },
          rule: action
        };
      });
    } else if (jsonLogicRule.parallel && jsonLogicRule.parallel.branches) {
      // Parallel structure with branches
      steps = jsonLogicRule.parallel.branches.map((branch: any, index: number) => {
        // Extract all actions from the branch
        const actions = branch.and || branch.or || [branch];

        // Process each action in the branch as a separate step
        return actions.map((action: any, actionIndex: number) => {
          // Determine step type and action details based on action keys
          let stepType = 'action';
          let actionType = 'custom';
          let actionName = 'custom_step';

          if (action.delay) {
            stepType = 'delay';
            actionType = 'delay';
            actionName = 'delay_step';
            // Add required delay fields for validation
            action.type = action.delay.type || '1_day';
            action.delayMs = this.convertDelayTypeToMs(action.delay.type);
          } else if (action.send_email) {
            stepType = 'action';
            actionType = 'send_email';
            actionName = 'send_email_step';
            // Add required email fields for validation
            if (action.send_email.data) {
              action.templateId = action.send_email.data.templateId;
              action.subject = action.send_email.data.subject;
              action.to = 'user@example.com'; // Default recipient
            }
          } else if (action.send_sms) {
            stepType = 'action';
            actionType = 'send_sms';
            actionName = 'send_sms_step';
          } else if (action.condition || action.if) {
            stepType = 'condition';
            actionType = 'custom';
            actionName = 'condition_step';
            // Add required condition fields for validation
            if (action.condition) {
              action.conditionType = action.condition.conditionType || 'custom_field';
              action.conditionValue = action.condition.conditionValue || action.condition;
              action.operator = action.condition.operator || 'equals';
            }
          } else if (action['=='] && Array.isArray(action['==']) && action['=='].length === 2) {
            // Handle JsonLogic condition like {"==": [{"var": "user.preferences.notifications"}, true]}
            stepType = 'condition';
            actionType = 'custom';
            actionName = 'condition_step';

            const [varPath, value] = action['=='];
            if (varPath && varPath.var) {
              const fieldPath = varPath.var;
              action.conditionType = 'user_condition';
              action.conditionValue = {
                field: fieldPath,
                value: value
              };
              action.operator = 'equals';
            }
          } else if (action.sharedFlow) {
            stepType = 'shared-flow';
            actionType = 'custom';
            actionName = 'shared_flow_step';
            // Add required flowName for shared flow validation
            action.flowName = action.sharedFlow.name || 'default_flow';
          } else if (action.end) {
            stepType = 'end';
            actionType = 'custom';
            actionName = 'end_step';
          } else {
            // For any other action, use 'custom' as the action type
            stepType = 'action';
            actionType = 'custom';
            actionName = 'custom_step';
          }

          return {
            id: `step_${actionIndex}`,
            type: stepType,
            data: {
              ...action,
              actionType,
              actionName
            },
            rule: action
          };
        });
      }).flat(); // Flatten the array since we're now creating multiple steps per branch
    }

    return {
      id: workflowUuid,
      name: workflowName,
      description: `${workflowName} converted from JsonLogic`,
      version: '1.0.0',
      metadata: {
        source: 'orchestration',
        convertedAt: new Date().toISOString(),
        originalRule: jsonLogicRule
      },
      steps
    };
  }

  private convertDelayTypeToMs(delayType: string): number {
    if (!delayType) return 1000; // Default 1 second

    const delayMap: { [key: string]: number } = {
      '1_second': 1000,
      '5_seconds': 5000,
      '10_seconds': 10000,
      '30_seconds': 30000,
      '1_minute': 60000,
      '2_minutes': 120000,
      '5_minutes': 300000,
      '10_minutes': 600000,
      '30_minutes': 1800000,
      '1_hour': 3600000,
      '2_hours': 7200000,
      '6_hours': 21600000,
      '12_hours': 43200000,
      '1_day': 86400000,
      '2_days': 172800000,
      '1_week': 604800000,
      '2_weeks': 1209600000,
      '1_month': 2592000000
    };

    return delayMap[delayType] || 1000; // Default to 1 second if not found
  }

  private determineNextStepIndex(
    steps: WorkflowStep[],
    currentStep: WorkflowStep,
    stepResult: ExecutionResult,
    currentIndex: number
  ): number {
    // Orchestration logic for determining next step
    if (stepResult.nextSteps && stepResult.nextSteps.length > 0) {
      const nextStepId = stepResult.nextSteps[0];
      const nextStepIndex = steps.findIndex(s => s.id === nextStepId);
      return nextStepIndex !== -1 ? nextStepIndex : currentIndex + 1;
    }

    if (currentStep.next && currentStep.next.length > 0) {
      const nextStepId = currentStep.next[0];
      const nextStepIndex = steps.findIndex(s => s.id === nextStepId);
      return nextStepIndex !== -1 ? nextStepIndex : currentIndex + 1;
    }

    return currentIndex + 1;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // PUBLIC API (No Business Logic)
  // ============================================================================

  getAvailableNodeTypes(): string[] {
    return this.nodeRegistry.getRegisteredTypes();
  }

  getRegistryStats(): { totalExecutors: number; nodeTypes: string[] } {
    return this.nodeRegistry.getStats();
  }

  // ============================================================================
  // WORKFLOW MANAGEMENT METHODS (Orchestration Only)
  // ============================================================================

  /**
   * Execute subscription workflow - orchestration only
   * Business logic delegated to subscription node executors
   */
  async executeSubscriptionWorkflow(subscription: any): Promise<WorkflowExecutionResult> {
    this.logger.log(`Executing subscription workflow for: ${subscription.id}`);

    // Create workflow context from subscription data
    const context: WorkflowExecutionContext = {
      executionId: this.generateExecutionId(),
      workflowId: 'subscription-workflow',
      triggerType: 'subscription',
      triggerId: subscription.id,
      userId: subscription.userId,
      triggerData: subscription,
      data: subscription,
      metadata: {
        source: 'subscription',
        timestamp: new Date(),
        userId: subscription.userId,
        workflowId: subscription.id
      },
      createdAt: new Date()
    };

    // Get subscription workflow definition
    const workflow = await this.getSubscriptionWorkflowDefinition();
    if (!workflow) {
      throw new Error('Subscription workflow definition not found');
    }

    return await this.executeWorkflow(workflow, context);
  }

  /**
   * Execute newsletter workflow - orchestration only
   * Business logic delegated to newsletter node executors
   */
  async executeNewsletterWorkflow(newsletter: any): Promise<WorkflowExecutionResult> {
    this.logger.log(`Executing newsletter workflow for: ${newsletter.id}`);

    // Create workflow context from newsletter data
    const context: WorkflowExecutionContext = {
      executionId: this.generateExecutionId(),
      workflowId: 'newsletter-workflow',
      triggerType: 'newsletter',
      triggerId: newsletter.id,
      userId: newsletter.userId,
      triggerData: newsletter,
      data: newsletter,
      metadata: {
        source: 'newsletter',
        timestamp: new Date(),
        userId: newsletter.userId,
        workflowId: newsletter.id
      },
      createdAt: new Date()
    };

    // Get newsletter workflow definition
    const workflow = await this.getNewsletterWorkflowDefinition();
    if (!workflow) {
      throw new Error('Newsletter workflow definition not found');
    }

    return await this.executeWorkflow(workflow, context);
  }

  /**
   * Execute user notification workflow v2 - orchestration only
   * Advanced multi-channel notification workflow
   */
  async executeUserNotificationWorkflowV2(user: any): Promise<WorkflowExecutionResult> {
    this.logger.log(`Executing user notification workflow v2 for: ${user.id}`);

    // Create workflow context from user data
    const context: WorkflowExecutionContext = {
      executionId: this.generateExecutionId(),
      workflowId: 'user-notification-workflow-v2',
      triggerType: 'user_notification',
      triggerId: user.id,
      userId: user.id,
      triggerData: user,
      data: user,
      metadata: {
        source: 'user_notification',
        timestamp: new Date(),
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        userPhoneNumber: user.phoneNumber,
        workflowId: 'user-notification-workflow-v2'
      },
      createdAt: new Date()
    };

    // Get user notification workflow v2 definition
    const workflow = await this.getUserNotificationWorkflowV2Definition();
    if (!workflow) {
      throw new Error('User notification workflow v2 definition not found');
    }

    return await this.executeWorkflow(workflow, context);
  }

  /**
   * Process delayed executions - orchestration only
   */
  async processDelayedExecutions(): Promise<void> {
    this.logger.log('Processing delayed executions...');
    await this.processPendingDelays();
  }

  /**
   * Process subscription workflows - orchestration only
   */
  async processSubscriptionWorkflows(): Promise<void> {
    this.logger.log('Processing subscription workflows...');
    // This would typically process pending subscriptions
    // Implementation depends on your business requirements
  }

  /**
   * Get all executions - orchestration only
   */
  async getAllExecutions(): Promise<any[]> {
    return await this.executionRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get execution status - orchestration only
   */
  async getExecutionStatus(executionId: string): Promise<any> {
    return await this.executionRepository.findOne({
      where: { executionId }
    });
  }

  /**
   * Start workflow - orchestration only
   */
  async startWorkflow(executionId: string): Promise<ExecutionResult> {
    this.logger.log(`Starting workflow: ${executionId}`);

    const execution = await this.executionRepository.findOne({
      where: { executionId }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = 'running';
    await this.executionRepository.save(execution);

    return {
      success: true,
      result: { executionId, status: 'started' },
      metadata: { startedAt: new Date().toISOString() }
    };
  }

  /**
   * Stop workflow - orchestration only
   */
  async stopWorkflow(executionId: string): Promise<ExecutionResult> {
    this.logger.log(`Stopping workflow: ${executionId}`);

    const execution = await this.executionRepository.findOne({
      where: { executionId }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = 'cancelled';
    await this.executionRepository.save(execution);

    return {
      success: true,
      result: { executionId, status: 'stopped' },
      metadata: { stoppedAt: new Date().toISOString() }
    };
  }

  /**
   * Pause workflow - orchestration only
   */
  async pauseWorkflow(executionId: string): Promise<ExecutionResult> {
    this.logger.log(`Pausing workflow: ${executionId}`);

    const execution = await this.executionRepository.findOne({
      where: { executionId }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = 'paused';
    await this.executionRepository.save(execution);

    return {
      success: true,
      result: { executionId, status: 'paused' },
      metadata: { pausedAt: new Date().toISOString() }
    };
  }

  /**
   * Resume workflow - orchestration only
   */
  async resumeWorkflow(executionId: string): Promise<ExecutionResult> {
    this.logger.log(`Resuming workflow: ${executionId}`);

    const execution = await this.executionRepository.findOne({
      where: { executionId }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = 'running';
    await this.executionRepository.save(execution);

    return {
      success: true,
      result: { executionId, status: 'resumed' },
      metadata: { resumedAt: new Date().toISOString() }
    };
  }

  /**
   * Cancel workflow - orchestration only
   */
  async cancelWorkflow(executionId: string): Promise<ExecutionResult> {
    this.logger.log(`Cancelling workflow: ${executionId}`);

    const execution = await this.executionRepository.findOne({
      where: { executionId }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = 'cancelled';
    await this.executionRepository.save(execution);

    return {
      success: true,
      result: { executionId, status: 'cancelled' },
      metadata: { cancelledAt: new Date().toISOString() }
    };
  }

  // ============================================================================
  // WORKFLOW DEFINITION HELPERS (Orchestration Only)
  // ============================================================================

  private async getSubscriptionWorkflowDefinition(): Promise<WorkflowDefinition | null> {
    // This would typically load from database or configuration
    // For now, return a basic workflow definition using available node types
    return {
      id: 'subscription-workflow',
      name: 'Subscription Workflow',
      description: 'Handles subscription processing',
      version: '1.0.0',
      steps: [
        {
          id: 'start',
          type: 'action',
          data: {
            actionType: 'send_email',
            actionName: 'welcome-email',
            templateId: 'united_welcome',
            subject: 'Welcome to United! 🪅',
            to: '{{context.email}}'
          },
          next: ['delay_1']
        },
        {
          id: 'delay_1',
          type: 'delay',
          data: {
            actionType: 'delay',
            actionName: 'wait-2-days',
            delayMs: 2 * 24 * 60 * 60 * 1000, // 2 days
            type: '2_days'
          },
          next: ['engagement_nudge']
        },
        {
          id: 'engagement_nudge',
          type: 'action',
          data: {
            actionType: 'send_email',
            actionName: 'engagement-nudge',
            templateId: 'engagement_nudge',
            subject: 'How are you enjoying United?',
            to: '{{context.email}}'
          },
          next: ['delay_2']
        },
        {
          id: 'delay_2',
          type: 'delay',
          data: {
            actionType: 'delay',
            actionName: 'wait-1-week',
            delayMs: 7 * 24 * 60 * 60 * 1000, // 1 week
            type: '1_week'
          },
          next: ['value_highlight']
        },
        {
          id: 'value_highlight',
          type: 'action',
          data: {
            actionType: 'send_email',
            actionName: 'value-highlight',
            templateId: 'value_highlight',
            subject: 'Unlock more value with United',
            to: '{{context.email}}'
          },
          next: ['end']
        },
        {
          id: 'end',
          type: 'action',
          data: {
            actionType: 'log_activity',
            actionName: 'workflow-complete',
            activity: 'subscription_workflow_completed',
            description: 'Subscription workflow completed successfully'
          }
        }
      ],
      metadata: {}
    };
  }

  private async getNewsletterWorkflowDefinition(): Promise<WorkflowDefinition | null> {
    // This would typically load from database or configuration
    // For now, return a basic workflow definition using available node types
    return {
      id: 'newsletter-workflow',
      name: 'Newsletter Workflow',
      description: 'Handles newsletter processing',
      version: '1.0.0',
      steps: [
        {
          id: 'start',
          type: 'action',
          data: {
            actionType: 'send_email',
            actionName: 'newsletter-welcome',
            templateId: 'newsletter_welcome',
            subject: 'Welcome to our newsletter!',
            to: '{{context.email}}'
          },
          next: ['end']
        },
        {
          id: 'end',
          type: 'action',
          data: {
            actionType: 'log_activity',
            actionName: 'newsletter-workflow-complete',
            activity: 'newsletter_workflow_completed',
            description: 'Newsletter workflow completed successfully'
          }
        }
      ],
      metadata: {}
    };
  }

  /**
   * Get user notification workflow v2 definition
   */
  private async getUserNotificationWorkflowV2Definition(): Promise<WorkflowDefinition | null> {
    return {
      id: 'user-notification-workflow-v2',
      name: 'User Notification Workflow V2',
      description: 'Advanced user notification workflow with multi-channel support',
      version: '2.0.0',
      steps: [
        {
          id: 'start',
          type: 'action',
          data: {
            actionType: 'send_notification',
            actionName: 'welcome-notification',
            type: 'welcome',
            title: 'Welcome to our platform!',
            message: 'Thank you for joining us. We\'re excited to have you on board!',
            channels: ['email', 'sms'],
            priority: 'high'
          },
          next: ['delay_1']
        },
        {
          id: 'delay_1',
          type: 'delay',
          data: {
            actionType: 'delay',
            actionName: 'wait-1-day',
            delayMs: 24 * 60 * 60 * 1000, // 1 day
            type: '1_day'
          },
          next: ['follow_up']
        },
        {
          id: 'follow_up',
          type: 'action',
          data: {
            actionType: 'send_notification',
            actionName: 'follow-up-notification',
            type: 'engagement',
            title: 'How are you finding our platform?',
            message: 'We\'d love to hear about your experience so far. Any questions?',
            channels: ['email'],
            priority: 'normal'
          },
          next: ['delay_2']
        },
        {
          id: 'delay_2',
          type: 'delay',
          data: {
            actionType: 'delay',
            actionName: 'wait-3-days',
            delayMs: 3 * 24 * 60 * 60 * 1000, // 3 days
            type: '3_days'
          },
          next: ['value_proposition']
        },
        {
          id: 'value_proposition',
          type: 'action',
          data: {
            actionType: 'send_notification',
            actionName: 'value-proposition-notification',
            type: 'value',
            title: 'Unlock premium features',
            message: 'Discover advanced features that can help you get more value from our platform.',
            channels: ['email', 'sms'],
            priority: 'normal'
          },
          next: ['delay_3']
        },
        {
          id: 'delay_3',
          type: 'delay',
          data: {
            actionType: 'delay',
            actionName: 'wait-1-week',
            delayMs: 7 * 24 * 60 * 60 * 1000, // 1 week
            type: '1_week'
          },
          next: ['final_engagement']
        },
        {
          id: 'final_engagement',
          type: 'action',
          data: {
            actionType: 'send_notification',
            actionName: 'final-engagement-notification',
            type: 'engagement',
            title: 'Your feedback matters',
            message: 'Help us improve by sharing your thoughts and suggestions.',
            channels: ['email'],
            priority: 'low'
          },
          next: ['end']
        },
        {
          id: 'end',
          type: 'action',
          data: {
            actionType: 'log_activity',
            actionName: 'notification-workflow-complete',
            activity: 'user_notification_workflow_v2_completed',
            description: 'User notification workflow v2 completed successfully'
          }
        }
      ],
      metadata: {
        version: '2.0.0',
        category: 'user_engagement',
        channels: ['email', 'sms'],
        totalSteps: 8,
        estimatedDuration: '11 days'
      }
    };
  }
}
