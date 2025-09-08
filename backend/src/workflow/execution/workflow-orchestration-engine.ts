import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../../database/entities/workflow-delay.entity';
import { VisualWorkflow } from '../visual-workflow.entity';
import { WorkflowDefinition, WorkflowStep, WorkflowExecutionContext } from '../types';
import { NodeRegistryService } from '../nodes/registry/node-registry.service';
import { ExecutionResult } from '../nodes/interfaces/node-executor.interface';

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
    @InjectRepository(VisualWorkflow)
    private readonly visualWorkflowRepository: Repository<VisualWorkflow>,
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
  ): Promise<ExecutionResult> {
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
      return result;

    } catch (error) {
      this.logger.error(`Workflow execution failed: ${executionId} - ${error.message}`);
      return {
        success: false,
        error: error.message,
        metadata: {
          executionId,
          workflowId: workflow.id,
          failedAt: new Date().toISOString()
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
      this.logger.debug(`Executing step ${currentStepIndex + 1}/${steps.length}: ${step.type} (${step.id})`);

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
  private async resumeWorkflowFromDelay(delay: WorkflowDelay): Promise<void> {
    this.logger.log(`Resuming workflow from delay: ${delay.id}`);

    // Update delay status
    delay.status = 'executed';
    delay.executedAt = new Date();
    await this.delayRepository.save(delay);

    // Find the execution
    const execution = await this.executionRepository.findOne({
      where: { id: delay.executionId }
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
    // Implementation to get workflow by ID
    // This is orchestration logic, not business logic
    return null; // Placeholder
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
  async executeSubscriptionWorkflow(subscription: any): Promise<ExecutionResult> {
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
  async executeNewsletterWorkflow(newsletter: any): Promise<ExecutionResult> {
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
            actionName: 'start-subscription',
            templateId: 'welcome',
            to: '{{context.email}}'
          },
          next: ['process']
        },
        {
          id: 'process',
          type: 'action',
          data: {
            actionType: 'send_email',
            actionName: 'process-subscription',
            templateId: 'subscription-confirmed',
            to: '{{context.email}}'
          },
          next: ['end']
        },
        {
          id: 'end',
          type: 'action',
          data: {
            actionType: 'send_email',
            actionName: 'end-subscription',
            templateId: 'subscription-complete',
            to: '{{context.email}}'
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
            actionName: 'start-newsletter',
            templateId: 'newsletter-welcome',
            to: '{{context.email}}'
          },
          next: ['process']
        },
        {
          id: 'process',
          type: 'action',
          data: {
            actionType: 'send_email',
            actionName: 'process-newsletter',
            templateId: 'newsletter-confirmed',
            to: '{{context.email}}'
          },
          next: ['end']
        },
        {
          id: 'end',
          type: 'action',
          data: {
            actionType: 'send_email',
            actionName: 'end-newsletter',
            templateId: 'newsletter-complete',
            to: '{{context.email}}'
          }
        }
      ],
      metadata: {}
    };
  }
}
