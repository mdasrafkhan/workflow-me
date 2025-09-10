import { Injectable, Logger } from '@nestjs/common';
import {
  NodeExecutor,
  ExecutionResult,
  ValidationResult,
  WorkflowStep,
  WorkflowExecutionContext,
  WorkflowExecution
} from '../interfaces/node-executor.interface';

/**
 * Base node executor with common functionality
 * All specific node executors should extend this class
 */
@Injectable()
export abstract class BaseNodeExecutor implements NodeExecutor {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * Abstract method to be implemented by specific node executors
   */
  abstract execute(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<ExecutionResult>;

  /**
   * Abstract method to be implemented by specific node executors
   */
  abstract getNodeType(): string;

  /**
   * Abstract method to be implemented by specific node executors
   */
  abstract getDependencies(): string[];

  /**
   * Default validation - can be overridden by specific executors
   */
  validate(step: WorkflowStep): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!step.id) {
      errors.push('Step ID is required');
    }

    if (!step.type) {
      errors.push('Step type is required');
    }

    if (!step.data) {
      warnings.push('Step data is empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Helper method to create success result
   */
  protected createSuccessResult(
    result?: any,
    nextSteps?: string[],
    metadata?: Record<string, any>
  ): ExecutionResult {
    return {
      success: true,
      result,
      nextSteps,
      metadata
    };
  }

  /**
   * Helper method to create error result
   */
  protected createErrorResult(
    error: string,
    metadata?: Record<string, any>
  ): ExecutionResult {
    return {
      success: false,
      error,
      metadata
    };
  }

  /**
   * Helper method to log execution start
   */
  protected logExecutionStart(step: WorkflowStep, context: WorkflowExecutionContext): void {
    this.logger.log(`[Workflow: ${context.metadata?.workflowId || 'unknown'}] [Step: ${step.id}] [type:${this.getNodeType()}] [userId:${context.metadata?.userId || 'unknown'}]`);
  }

  /**
   * Helper method to log execution end
   */
  protected logExecutionEnd(step: WorkflowStep, result: ExecutionResult): void {
    if (result.success) {
      // Node executed successfully - no need to log
    } else {
      this.logger.error(`Failed to execute ${this.getNodeType()} node: ${step.id} - ${result.error}`);
    }
  }
}

