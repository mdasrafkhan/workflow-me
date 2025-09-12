import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../../database/entities/workflow-delay.entity';
import { JsonLogicRule } from '../json-logic-rule.entity';
import { WorkflowDefinition, WorkflowStep, WorkflowExecutionContext } from '../types';
import { NodeRegistryService } from '../nodes/registry/node-registry.service';
import { ExecutionResult } from '../nodes/interfaces/node-executor.interface';
import { WorkflowExecutionResult } from './types';
import { WorkflowTriggerRegistryService } from '../triggers/workflow-trigger-registry.service';
import { WorkflowTriggerContext, WorkflowTriggerExecutionResult } from '../interfaces/workflow-trigger.interface';

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
    private readonly nodeRegistry: NodeRegistryService,
    private readonly triggerRegistry: WorkflowTriggerRegistryService
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
    this.logger.log(`[Workflow: ${workflow.name || workflow.id}] [Step: start] [userId:${context.userId}] [steps:${workflow.steps?.length || 0}]`);

    // Check for existing execution to prevent duplicates
    const existingExecution = await this.findExistingExecution(workflow.id, context.userId, context.triggerType, context.triggerId);
    if (existingExecution) {
      this.logger.warn(`[Workflow: ${workflow.name || workflow.id}] [Step: duplicate-prevention] [userId:${context.userId}] [existingExecutionId:${existingExecution.id}] - Skipping duplicate execution`);
      return {
        executionId: existingExecution.executionId,
        workflowId: workflow.id,
        success: true,
        result: { message: 'Duplicate execution prevented' },
        error: null,
        executionTime: 0,
        steps: [],
        timestamp: new Date()
      };
    }

    const executionId = this.generateExecutionId();
    this.logger.log(`[Workflow: ${workflow.name || workflow.id}] [Step: executing] [executionId:${executionId}] [userId:${context.userId}]`);

    try {
      // Create execution record
      const execution = await this.createExecutionRecord(executionId, workflow.id, context);

      // Execute workflow steps using node registry
      const result = await this.executeWorkflowSteps(workflow, context, execution);

      // Update execution status
      await this.updateExecutionStatus(execution, result);

      this.logger.log(`[Workflow: ${workflow.name || workflow.id}] [Step: complete] [executionId:${executionId}] [status:${result.success ? 'success' : 'failed'}] [userId:${context.userId}]`);

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

    // Ensure context has proper workflow and user information
    const enrichedContext = {
      ...context,
      workflowId: execution.workflowId,
      userId: execution.userId,
      metadata: {
        ...context.metadata,
        workflowId: execution.workflowId,
        userId: execution.userId,
        executionId: execution.executionId
      }
    };

    while (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      this.logger.log(`[Workflow: ${workflow.name || workflow.id}] [Step: ${step.id}] [type:${step.type}] [${currentStepIndex + 1}/${steps.length}] [userId:${enrichedContext.userId}]`);

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
        const stepResult = await executor.execute(step, enrichedContext, execution);

        if (!stepResult.success) {
          throw new Error(`Step execution failed: ${stepResult.error}`);
        }

        // Record completed step
        completedSteps.push(step.id);
        // Step completed successfully - no need to log

        // Update current step in execution record
        execution.currentStep = step.id;

        // Check if the step result contains actions to execute (from condition executor)
        if (stepResult.result?.extractedActions && Array.isArray(stepResult.result.extractedActions)) {
          this.logger.log(`Processing ${stepResult.result.extractedActions.length} dynamic actions from condition`);

          // Convert actions to steps and execute them
          const dynamicSteps = this.convertActionsToSteps(stepResult.result.extractedActions, currentStepIndex);

          // Insert the dynamic steps after the current step
          steps.splice(currentStepIndex + 1, 0, ...dynamicSteps);

          this.logger.log(`Added ${dynamicSteps.length} dynamic steps to workflow execution`);
        }

        // Check if workflow should be suspended (e.g., for delays) BEFORE saving state
        if (stepResult.metadata?.workflowSuspended) {
          this.logger.log(`Workflow suspended at step: ${step.id}`);

          // Save execution state with suspended status
          const executionState = (execution as any).state;
          if (executionState && executionState.history) {
            executionState.history.push({
              stepId: step.id,
              state: 'suspended',
              timestamp: new Date(),
              result: stepResult.result
            });
            await this.executionRepository.save(execution);
            this.logger.debug(`Saved execution state after step ${step.id} (suspended)`);
          }

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

        // Save execution state to database after each step (for non-suspended steps)
        const executionState = (execution as any).state;
        if (executionState && executionState.history) {
          executionState.history.push({
            stepId: step.id,
            state: 'completed',
            timestamp: new Date(),
            result: stepResult.result
          });
          await this.executionRepository.save(execution);
          this.logger.debug(`Saved execution state after step ${step.id}`);
        }

        // Determine next step (orchestration logic only)
        currentStepIndex = this.determineNextStepIndex(steps, step, stepResult, currentStepIndex);

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

    // Double-check delay is still in processing status to prevent race conditions
    const currentDelay = await this.delayRepository.findOne({
      where: { id: delay.id, status: 'processing' }
    });

    if (!currentDelay) {
      this.logger.warn(`Delay ${delay.id} is no longer in processing status, skipping resume`);
      return;
    }

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
    await this.continueWorkflowExecution(execution, delay);
  }

  /**
   * Continue workflow execution - orchestration only
   */
  private async continueWorkflowExecution(execution: WorkflowExecution, delay?: WorkflowDelay): Promise<void> {
    this.logger.log(`Continuing workflow execution: ${execution.id}`);

    // Get the workflow definition
    const workflow = await this.getWorkflowById(execution.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${execution.workflowId}`);
    }

    // Get the current execution state
    const executionState = (execution as any).state;
    if (!executionState) {
      throw new Error(`Execution state not found for: ${execution.id}`);
    }

    // Ensure context data is properly initialized
    if (!executionState.context) {
      executionState.context = {};
    }
    if (!executionState.context.data) {
      executionState.context.data = {};
    }

    // Restore context data from delay record if available
    if (delay.context) {
      executionState.context = {
        ...executionState.context,
        ...delay.context
      };
      // Also restore the data property specifically
      if (delay.context.data) {
        executionState.context.data = {
          ...executionState.context.data,
          ...delay.context.data
        };
      }
      this.logger.log(`[Workflow: ${delay.context?.workflowId || 'unknown'}] [Step: resume] [delayId:${delay.id}] [userId:${delay.context?.userId || 'unknown'}]`);
    }

    // Ensure triggerId is set from the original execution
    if (!executionState.context.triggerId && execution.triggerId) {
      executionState.context.triggerId = execution.triggerId;
    }
    if (!executionState.context.triggerType && execution.triggerType) {
      executionState.context.triggerType = execution.triggerType;
    }
    if (!executionState.context.userId && execution.userId) {
      executionState.context.userId = execution.userId;
    }

    // If context data is empty, try to restore it from the delay context
    if (!executionState.context.data || Object.keys(executionState.context.data).length === 0) {
      this.logger.log(`Context data is empty, attempting to restore from delay context`);

      if (delay.context) {
        // Restore all context data, including product_package and other subscription data
        const contextData = {
          userId: delay.context.userId,
          email: delay.context.email,
          name: delay.context.name,
          user: delay.context.user,
          preferences: delay.context.preferences,
          isActive: delay.context.isActive,
          timezone: delay.context.timezone,
          phoneNumber: delay.context.phoneNumber,
          // Include subscription-specific data
          product_package: delay.context.product_package,
          subscriptionId: delay.context.subscriptionId,
          product: delay.context.product
        };

        executionState.context.data = {
          ...executionState.context.data,
          ...contextData
        };
        this.logger.log(`[Workflow: ${execution.workflowId}] [Step: context-restore] [executionId:${execution.id}] [userId:${executionState.context.data?.userId || 'unknown'}] [product_package:${executionState.context.data?.product_package || 'unknown'}]`);
      }
    }

    // Find the step to resume from based on the delay
    const history = executionState.history || [];
    let resumeFromStepId: string;
    let resumeFromIndex: number;

    if (delay) {
      // Resume from the specific delay step
      resumeFromStepId = delay.stepId;
      this.logger.log(`Resuming from delay step: ${resumeFromStepId}`);

      // Find the index of the delay step
      resumeFromIndex = workflow.steps.findIndex(step => step.id === resumeFromStepId);

      if (resumeFromIndex === -1) {
        this.logger.warn(`Delay step ${resumeFromStepId} not found in workflow definition`);
        // This is expected for dynamic workflows - the delay step was created dynamically
        // We'll handle this in the dynamic step reconstruction logic below
        resumeFromIndex = 0; // Set a default value, but we won't use it for dynamic workflows
      }

      // Continue from the next step after the delay
      resumeFromIndex += 1;
    } else {
      // Fallback: Find the last completed step (exclude 'final' and 'error' steps)
      const lastCompletedStep = history.findLast((step: any) =>
        step.state === 'completed' &&
        step.stepId !== 'final' &&
        step.stepId !== 'error'
      );

      if (!lastCompletedStep) {
        this.logger.warn(`No completed steps found in execution ${execution.id}, starting from beginning`);
        // If no completed steps, start from the beginning but continue the existing execution
        const result = await this.executeWorkflowSteps(workflow, executionState.context, execution);
        await this.updateExecutionStatus(execution, result);
        return;
      }

      this.logger.log(`Last completed step: ${lastCompletedStep.stepId}, continuing from next step`);
      resumeFromStepId = lastCompletedStep.stepId;

      // Find the index of the last completed step
      resumeFromIndex = workflow.steps.findIndex(step => step.id === resumeFromStepId);

      if (resumeFromIndex === -1) {
        this.logger.warn(`Last completed step ${resumeFromStepId} not found in workflow definition, starting from beginning`);
        // Start from the beginning but continue the existing execution
        const result = await this.executeWorkflowSteps(workflow, executionState.context, execution);
        await this.updateExecutionStatus(execution, result);
        return;
      }

      // Continue from the next step
      resumeFromIndex += 1;
    }

    // If resuming from a delay, mark the delay step as completed
    if (delay) {
      // Update the delay step state from 'suspended' to 'completed'
      const delayStepHistory = history.find((step: any) =>
        step.stepId === delay.stepId && step.state === 'suspended'
      );

      if (delayStepHistory) {
        delayStepHistory.state = 'completed';
        delayStepHistory.timestamp = new Date();
        delayStepHistory.result = {
          ...delayStepHistory.result,
          status: 'executed',
          executedAt: new Date().toISOString()
        };
        await this.executionRepository.save(execution);
        this.logger.log(`Updated delay step ${delay.stepId} from suspended to completed`);
      }

      // Ensure we skip the delay step completely by adding 1 to resumeFromIndex
      // This prevents the delay step from being re-executed
      resumeFromIndex = Math.max(resumeFromIndex, workflow.steps.findIndex(step => step.id === delay.stepId) + 1);
      this.logger.log(`Adjusted resumeFromIndex to ${resumeFromIndex} to skip delay step ${delay.stepId}`);
    }

    // For dynamic workflows, we need to reconstruct the steps from the execution history
    // The original workflow.steps only contains the initial steps, not the dynamic ones
    let remainingSteps;

    // Always try to reconstruct dynamic steps first if we have a delay
    if (delay) {
      this.logger.log(`Reconstructing dynamic steps from delay: ${delay.stepId}`);
      remainingSteps = await this.reconstructDynamicStepsFromDelay(workflow, executionState.context, delay);

      if (remainingSteps && remainingSteps.length > 0) {
        this.logger.log(`Successfully reconstructed ${remainingSteps.length} dynamic steps`);
      } else {
        this.logger.warn(`Failed to reconstruct dynamic steps, falling back to original workflow`);
        remainingSteps = workflow.steps.slice(resumeFromIndex);
      }
    } else if (history.length > 0 && history.some((step: any) => step.stepId.startsWith('step_'))) {
      // This is a dynamic workflow - reconstruct steps from execution history
      this.logger.log(`Reconstructing dynamic steps from execution history`);

      // Get all step IDs from history (excluding 'final', 'error', etc.)
      const executedStepIds = history
        .filter((step: any) => step.stepId.startsWith('step_'))
        .map((step: any) => step.stepId)
        .sort();

      // Find the index of the delay step in the executed steps
      const delayStepIndex = executedStepIds.findIndex(id => id === delay?.stepId);

      if (delayStepIndex !== -1) {
        // Get remaining step IDs after the delay step
        const remainingStepIds = executedStepIds.slice(delayStepIndex + 1);
        this.logger.log(`Remaining dynamic steps to execute: ${remainingStepIds.join(', ')}`);

        // For dynamic steps, we need to reconstruct them from the original JsonLogic
        // Since we can't easily reconstruct the exact dynamic steps, we'll need to
        // re-evaluate the condition to get the remaining actions
        remainingSteps = await this.reconstructDynamicStepsFromDelay(workflow, executionState.context, delay);
      } else {
        // Fallback to original logic
        remainingSteps = workflow.steps.slice(resumeFromIndex);
      }
    } else {
      // Original static workflow logic
      remainingSteps = workflow.steps.slice(resumeFromIndex);
    }

    if (!remainingSteps || remainingSteps.length === 0) {
      this.logger.log(`All steps completed for execution ${execution.id}`);
      execution.status = 'completed';
      execution.currentStep = 'end';
      await this.executionRepository.save(execution);
      return;
    }

    this.logger.log(`Continuing with ${remainingSteps.length} remaining steps`);

    // Execute remaining steps
    for (const step of remainingSteps) {
      try {
        this.logger.log(`Executing step: ${step.id} (${step.type})`);

        const result = await this.executeStep(step, executionState.context, execution);

        if (!result.success) {
          this.logger.error(`Step ${step.id} failed: ${result.error}`);
          execution.status = 'failed';
          await this.executionRepository.save(execution);
          return;
        }

        // Check if workflow should be suspended (e.g., for delays) AFTER executing step
        if (result.metadata?.workflowSuspended) {
          this.logger.log(`Workflow suspended at step: ${step.id}`);

          // Save execution state with suspended status
          const executionState = (execution as any).state;
          if (executionState && executionState.history) {
            executionState.history.push({
              stepId: step.id,
              state: 'suspended',
              timestamp: new Date(),
              result: result.result
            });
            await this.executionRepository.save(execution);
            this.logger.debug(`Saved execution state after step ${step.id} (suspended)`);
          }

          // Return early - workflow is suspended
          return;
        }

        // Update context with step result
        if (result.result) {
          executionState.context.data = {
            ...executionState.context.data,
            ...result.result
          };
        }

      } catch (error) {
        this.logger.error(`Error executing step ${step.id}: ${error.message}`);
        execution.status = 'failed';
        await this.executionRepository.save(execution);
        return;
      }
    }

    // Mark execution as completed
    execution.status = 'completed';
    await this.executionRepository.save(execution);
    this.logger.log(`[Workflow: ${execution.workflowId}] [Step: finalize] [executionId:${execution.id}] [status:success]`);
  }

  /**
   * Reconstruct dynamic steps from delay context
   * This method re-evaluates the condition to get the remaining actions after a delay
   */
  private async reconstructDynamicStepsFromDelay(
    workflow: any,
    context: WorkflowExecutionContext,
    delay: WorkflowDelay
  ): Promise<any[]> {
    this.logger.log(`Reconstructing dynamic steps from delay: ${delay.id}`);

    // Find the condition step in the workflow that generated the dynamic steps
    const conditionStep = workflow.steps.find((step: any) => step.type === 'condition');

    if (!conditionStep) {
      this.logger.warn(`No condition step found in workflow, cannot reconstruct dynamic steps`);
      return [];
    }

    // Re-evaluate the condition to get the actions
    const conditionExecutor = this.nodeRegistry.getExecutor('condition');
    if (!conditionExecutor) {
      this.logger.warn(`Condition executor not found, cannot reconstruct dynamic steps`);
      return [];
    }

    try {
      // Execute the condition again to get the actions
      const conditionResult = await conditionExecutor.execute(conditionStep, context, null);

      if (!conditionResult.success || !conditionResult.result?.extractedActions) {
        this.logger.warn(`Condition execution failed or no actions extracted`);
        return [];
      }

      const actions = conditionResult.result.extractedActions;
      this.logger.log(`Reconstructed ${actions.length} actions from condition`);

      // Convert actions to steps, but only include the ones after the delay
      // We need to find which action corresponds to the delay step
      const delayStepId = delay.stepId;
      const delayStepNumber = parseInt(delayStepId.split('_')[1]);

      this.logger.log(`Looking for actions after delay step ${delayStepId} (step number: ${delayStepNumber})`);

      // Find the delay action in the actions array
      let delayActionIndex = -1;
      for (let i = 0; i < actions.length; i++) {
        if (actions[i].delay && actions[i].delay.type === delay.context?.originalDelayType) {
          delayActionIndex = i;
          break;
        }
      }

      if (delayActionIndex === -1) {
        this.logger.warn(`Could not find delay action in actions array, using step number ${delayStepNumber}`);
        delayActionIndex = delayStepNumber;
      }

      // Get actions after the delay step
      const remainingActions = actions.slice(delayActionIndex + 1);
      this.logger.log(`Found ${remainingActions.length} remaining actions after delay (index ${delayActionIndex + 1})`);

      // Convert remaining actions to steps
      const remainingSteps = this.convertActionsToSteps(remainingActions, delayActionIndex);

      this.logger.log(`Converted ${remainingActions.length} remaining actions to ${remainingSteps.length} steps`);
      return remainingSteps;

    } catch (error) {
      this.logger.error(`Error reconstructing dynamic steps: ${error.message}`);
      return [];
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: any, context: WorkflowExecutionContext, execution: WorkflowExecution): Promise<ExecutionResult> {
    try {
      this.logger.log(`Executing step: ${step.id} (${step.type})`);

      // Ensure context has proper workflow and user information
      const enrichedContext = {
        ...context,
        workflowId: execution.workflowId,
        userId: execution.userId,
        metadata: {
          ...context.metadata,
          workflowId: execution.workflowId,
          userId: execution.userId,
          executionId: execution.executionId
        }
      };

      // Get the appropriate node executor
      const executor = this.nodeRegistry.getExecutor(step.type);
      if (!executor) {
        throw new Error(`No executor found for step type: ${step.type}`);
      }

      // Execute the step
      const result = await executor.execute(step, enrichedContext, execution);

      // Update execution history
      const executionState = (execution as any).state;
      if (executionState && executionState.history) {
        executionState.history.push({
          stepId: step.id,
          state: result.success ? 'completed' : 'failed',
          timestamp: new Date(),
          result: result.result
        });

        // Save execution state to database after each step
        await this.executionRepository.save(execution);
        this.logger.debug(`Saved execution state after step ${step.id}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error executing step ${step.id}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        result: null
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS (No Business Logic)
  // ============================================================================

  private convertActionsToSteps(actions: any[], startIndex: number): any[] {
    return actions.map((action, actionIndex) => {
      const stepIndex = startIndex + actionIndex + 1;

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
          action.templateId = action.send_email.data.templateId || 'welcome_email';
          action.subject = action.send_email.data.subject || 'Welcome to our service!';
          action.to = action.send_email.data.to || 'user@example.com';
        }
      } else if (action.send_sms) {
        stepType = 'action';
        actionType = 'send_sms';
        actionName = 'send_sms_step';
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
        action.reason = action.end.reason || 'completed';
      }

      // Always add the required actionType and actionName fields
      action.actionType = actionType;
      action.actionName = actionName;

      return {
        id: `step_${stepIndex}`,
        type: stepType,
        data: action,
        rule: action
      };
    });
  }

  private async findExistingExecution(
    workflowId: string,
    userId: string,
    triggerType: string,
    triggerId: string
  ): Promise<WorkflowExecution | null> {
    try {
      const execution = await this.executionRepository.findOne({
        where: {
          workflowId,
          userId,
          triggerType,
          triggerId,
          status: Not('completed') // Only prevent if execution is not completed
        },
        order: {
          createdAt: 'DESC'
        }
      });

      return execution;
    } catch (error) {
      this.logger.error(`Error finding existing execution: ${error.message}`);
      return null;
    }
  }

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
    execution.currentStep = result.success ? 'end' : 'failed';
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
        } else if (action.send_email || action['Send Mail'] || action['send_mail']) {
          stepType = 'action';
          actionType = 'send_email';
          actionName = 'send_email_step';
          // Add required email fields for validation
          const emailData = action.send_email || action['Send Mail'] || action['send_mail'];
          if (emailData) {
            action.templateId = emailData.data?.templateId || 'welcome_email';
            action.subject = emailData.data?.subject || 'Welcome to our service!';
            action.to = emailData.data?.to || 'user@example.com';
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
        } else if (this.isSimpleCondition(action)) {
          // Handle simple key-value conditions like {"product_package": "package_1"}
          console.log(`[DEBUG] Found simple condition:`, JSON.stringify(action));
          stepType = 'condition';
          actionType = 'custom';
          actionName = 'condition_step';

          const conditionKey = Object.keys(action).find(key =>
            ['product_package', 'user_segment', 'subscription_status', 'email_domain'].includes(key)
          );

          if (conditionKey) {
            action.conditionType = conditionKey;
            action.conditionValue = action[conditionKey];
            action.operator = 'equals';
            console.log(`[DEBUG] Set condition fields - type: ${conditionKey}, value: ${action[conditionKey]}, operator: equals`);
          } else {
            console.log(`[DEBUG] No valid condition key found in:`, Object.keys(action));
          }
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
          } else if (action.send_email || action['Send Mail'] || action['send_mail']) {
            stepType = 'action';
            actionType = 'send_email';
            actionName = 'send_email_step';
            // Add required email fields for validation
            const emailData = action.send_email || action['Send Mail'] || action['send_mail'];
            if (emailData) {
              action.templateId = emailData.data?.templateId || 'welcome_email';
              action.subject = emailData.data?.subject || 'Welcome to our service!';
              action.to = emailData.data?.to || 'user@example.com';
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
          } else if (this.isSimpleCondition(action)) {
            // Handle simple key-value conditions like {"product_package": "package_1"}
            stepType = 'condition';
            actionType = 'custom';
            actionName = 'condition_step';

            const conditionKey = Object.keys(action).find(key =>
              ['product_package', 'user_segment', 'subscription_status', 'email_domain'].includes(key)
            );

            if (conditionKey) {
              action.conditionType = conditionKey;
              action.conditionValue = action[conditionKey];
              action.operator = 'equals';
            }
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

  private isSimpleCondition(action: any): boolean {
    // Check if this is a simple key-value condition like {"product_package": "package_1"}
    const keys = Object.keys(action);

    if (keys.length !== 1) {
      return false;
    }

    const conditionTypes = ['product_package', 'user_segment', 'subscription_status', 'email_domain'];
    const key = keys[0];
    const value = action[key];


    return conditionTypes.includes(key) && typeof value === 'string';
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
  // TRIGGER REGISTRY INTEGRATION (No Business Logic)
  // ============================================================================

  /**
   * Execute workflow using trigger registry system
   * This is the new standardized way to execute workflows from triggers
   */
  async executeWorkflowFromTrigger(
    triggerType: string,
    triggerData: any
  ): Promise<WorkflowTriggerExecutionResult> {
    const startTime = Date.now();
    this.logger.log(`[Trigger: ${triggerType}] [Step: start] Processing trigger data`);

    try {
      // Get the trigger implementation
      const trigger = this.triggerRegistry.getTrigger(triggerType);
      if (!trigger) {
        throw new Error(`Trigger type '${triggerType}' is not registered`);
      }

      // Process the trigger data
      const triggerResult = await this.triggerRegistry.processTrigger(triggerType, triggerData);
      if (!triggerResult.success) {
        throw new Error(`Trigger processing failed: ${triggerResult.error}`);
      }

      const context = triggerResult.context;
      this.logger.log(`[Trigger: ${triggerType}] [Step: processed] [executionId:${context.executionId}] [userId:${context.userId}]`);

      // Check if trigger should execute
      if (!this.triggerRegistry.shouldTriggerExecute(triggerType, context)) {
        this.logger.log(`[Trigger: ${triggerType}] [Step: skipped] [reason:shouldExecute=false] [userId:${context.userId}]`);
        return {
          executionId: context.executionId,
          workflowId: context.workflowId,
          triggerType,
          success: true,
          context,
          executionTime: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      // Get workflow ID
      const workflowId = this.triggerRegistry.getWorkflowIdForTrigger(triggerType, context);
      if (!workflowId) {
        throw new Error(`Could not determine workflow ID for trigger: ${triggerType}`);
      }

      // Get workflow definition
      const workflow = await this.getWorkflowById(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Convert trigger context to workflow execution context
      const executionContext: WorkflowExecutionContext = {
        executionId: context.executionId,
        workflowId: context.workflowId,
        triggerType: context.triggerType,
        triggerId: context.triggerId,
        userId: context.userId,
        triggerData: context.entityData.data,
        data: context.entityData.data,
        metadata: {
          ...context.triggerMetadata,
          ...context.executionMetadata,
          source: 'trigger-registry',
          timestamp: context.timestamp
        },
        createdAt: context.timestamp
      };

      // Execute the workflow
      const result = await this.executeWorkflow(workflow, executionContext);

      const executionTime = Date.now() - startTime;
      this.logger.log(`[Trigger: ${triggerType}] [Step: complete] [executionId:${context.executionId}] [status:${result.success ? 'success' : 'failed'}] [executionTime:${executionTime}ms]`);

      return {
        executionId: context.executionId,
        workflowId: context.workflowId,
        triggerType,
        success: result.success,
        context,
        error: result.error,
        executionTime,
        timestamp: new Date()
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`[Trigger: ${triggerType}] [Step: failed] [error:${error.message}] [executionTime:${executionTime}ms]`);

      return {
        executionId: `error_${Date.now()}`,
        workflowId: 'unknown',
        triggerType,
        success: false,
        context: null as any,
        error: error.message,
        executionTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Register a trigger with the registry
   */
  registerTrigger(trigger: any): void {
    this.triggerRegistry.register(trigger);
  }

  /**
   * Get all registered triggers
   */
  getRegisteredTriggers(): any[] {
    return this.triggerRegistry.getAllTriggers();
  }

  /**
   * Get trigger statistics
   */
  getTriggerStats(): { totalTriggers: number; triggerTypes: string[] } {
    return this.triggerRegistry.getStats();
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
