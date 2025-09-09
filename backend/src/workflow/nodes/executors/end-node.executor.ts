import { Injectable, Logger } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import { WorkflowStep, WorkflowExecutionContext, WorkflowExecution, ExecutionResult, ValidationResult } from '../interfaces/node-executor.interface';

/**
 * End Node Executor
 * Handles workflow termination and final data processing
 */
@Injectable()
export class EndNodeExecutor extends BaseNodeExecutor {

  getNodeType(): string {
    return 'end';
  }

  getDependencies(): string[] {
    return [];
  }

  async execute(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<ExecutionResult> {
    this.logExecutionStart(step, context);

    try {
      const endData = step.data;
      const endReason = endData?.endReason || 'completed';
      const finalMessage = endData?.message || 'Workflow completed successfully';

      this.logger.log(`Workflow ending with reason: ${endReason}`);

      // Perform final data processing and cleanup
      const finalResult = await this.performFinalProcessing(context, execution, endReason);

      const result = this.createSuccessResult(
        {
          endReason,
          message: finalMessage,
          finalData: finalResult,
          completedAt: new Date().toISOString(),
          workflowTerminated: true
        },
        undefined, // No next steps - workflow ends here
        {
          workflowTerminated: true,
          endReason,
          completedAt: new Date().toISOString(),
          finalProcessingResult: finalResult
        }
      );

      this.logExecutionEnd(step, result);
      return result;

    } catch (error) {
      const result = this.createErrorResult(
        `End step execution failed: ${error.message}`,
        {
          stepId: step.id,
          endReason: step.data?.endReason,
          error: error.message
        }
      );

      this.logExecutionEnd(step, result);
      return result;
    }
  }

  validate(step: WorkflowStep): ValidationResult {
    const baseValidation = super.validate(step);
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];

    // Validate end reason
    const validEndReasons = ['completed', 'cancelled', 'error', 'timeout'];
    const endReason = step.data?.endReason;

    if (endReason && !validEndReasons.includes(endReason)) {
      errors.push(`Invalid end reason: ${endReason}. Must be one of: ${validEndReasons.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Perform final data processing and cleanup
   */
  private async performFinalProcessing(
    context: WorkflowExecutionContext,
    execution: WorkflowExecution,
    endReason: string
  ): Promise<any> {
    this.logger.log(`Performing final processing for workflow ${execution.workflowId}`);

    try {
      // Mark execution as completed
      execution.status = 'completed';

      // Ensure state and history exist - cast to any to access state property
      const executionState = (execution as any).state;
      if (!executionState) {
        (execution as any).state = { currentState: 'running', context: {}, history: [] };
      }
      if (!executionState?.history) {
        (execution as any).state.history = [];
      }

      (execution as any).state.history.push({
        stepId: 'end',
        state: 'completed',
        timestamp: new Date(),
        result: { endReason, completedAt: new Date().toISOString() }
      });

      // Perform any final data transformations
      const totalSteps = (execution as any).state?.history?.length || 0;
      const finalData = {
        ...context.data,
        workflowCompleted: true,
        endReason,
        completedAt: new Date().toISOString(),
        executionId: execution.executionId,
        totalSteps
      };

      // Log completion metrics
      this.logger.log(`Workflow ${execution.workflowId} completed successfully`);
      this.logger.log(`Total steps executed: ${totalSteps}`);
      this.logger.log(`End reason: ${endReason}`);

      return finalData;

    } catch (error) {
      this.logger.error(`Final processing failed: ${error.message}`);
      throw error;
    }
  }
}
