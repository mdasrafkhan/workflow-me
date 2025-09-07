import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { WorkflowDefinition, WorkflowStep, WorkflowExecutionContext } from '../types';
import { NodeRegistryService } from '../nodes/registry/node-registry.service';
import { ExecutionResult } from '../nodes/interfaces/node-executor.interface';

/**
 * Clean Workflow Execution Engine
 * Uses the node registry system for clean, extensible workflow execution
 * Follows the Strategy pattern and Interface Segregation Principle
 */
@Injectable()
export class WorkflowExecutionEngine {
  private readonly logger = new Logger(WorkflowExecutionEngine.name);

  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    private readonly nodeRegistry: NodeRegistryService
  ) {}

  /**
   * Execute a workflow using the node registry system
   * @param workflow - Workflow definition
   * @param context - Execution context
   * @returns Promise<ExecutionResult>
   */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<ExecutionResult> {
    const executionId = this.generateExecutionId();
    this.logger.log(`Starting clean workflow execution: ${executionId} for workflow: ${workflow.id}`);

    try {
      // Create execution record
      const execution = this.executionRepository.create({
        executionId: executionId,
        workflowId: workflow.id,
        triggerType: 'manual',
        triggerId: 'unknown',
        userId: context.metadata?.userId || 'unknown',
        status: 'running',
        currentStep: 'start',
            state: {
              currentState: 'running',
          context: context.data || {},
          history: [],
          sharedFlows: []
        }
      });

      await this.executionRepository.save(execution);

      // Execute workflow steps
      const result = await this.executeWorkflowSteps(workflow, context, execution);

      // Update execution status
      execution.status = result.success ? 'completed' : 'failed';
      execution.state.history.push({
        stepId: 'final',
        state: result.success ? 'completed' : 'failed',
                  timestamp: new Date(),
        result: result.result,
        error: result.error
      });
      await this.executionRepository.save(execution);

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
   * Execute workflow steps using node executors
   * @param workflow - Workflow definition
   * @param context - Execution context
   * @param execution - Execution record
   * @returns Promise<ExecutionResult>
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

        // Execute step
        const stepResult = await executor.execute(step, context, execution);

        if (!stepResult.success) {
          throw new Error(`Step execution failed: ${stepResult.error}`);
        }

        // Record completed step
        completedSteps.push(step.id);
        this.logger.debug(`Step completed successfully: ${step.id}`);

        // Determine next step
        if (stepResult.nextSteps && stepResult.nextSteps.length > 0) {
          // Find next step by ID
          const nextStepId = stepResult.nextSteps[0];
          const nextStepIndex = steps.findIndex(s => s.id === nextStepId);

          if (nextStepIndex !== -1) {
            currentStepIndex = nextStepIndex;
              } else {
            // If next step not found, continue to next sequential step
            currentStepIndex++;
          }
        } else if (step.next && step.next.length > 0) {
          // Use default next steps
          const nextStepId = step.next[0];
          const nextStepIndex = steps.findIndex(s => s.id === nextStepId);

          if (nextStepIndex !== -1) {
            currentStepIndex = nextStepIndex;
          } else {
            currentStepIndex++;
          }
        } else {
          // Continue to next sequential step
          currentStepIndex++;
        }

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

  /**
   * Get available node types
   * @returns string[] - Array of available node types
   */
  getAvailableNodeTypes(): string[] {
    return this.nodeRegistry.getRegisteredTypes();
  }

  /**
   * Get node registry statistics
   * @returns object - Registry statistics
   */
  getRegistryStats(): { totalExecutors: number; nodeTypes: string[] } {
    return this.nodeRegistry.getStats();
  }

  /**
   * Generate unique execution ID
   * @returns string - Unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
