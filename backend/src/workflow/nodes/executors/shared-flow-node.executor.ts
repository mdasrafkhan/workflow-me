import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import {
  ExecutionResult,
  ValidationResult,
  WorkflowStep,
  WorkflowExecution
} from '../interfaces/node-executor.interface';
import { WorkflowExecutionContext } from '../../types';
import { SharedFlowService } from '../../../services/shared-flow.service';

/**
 * Shared Flow Node Executor
 * Handles shared flow execution in workflows
 */
@Injectable()
export class SharedFlowNodeExecutor extends BaseNodeExecutor {
  constructor(private readonly sharedFlowService: SharedFlowService) {
    super();
  }

  getNodeType(): string {
    return 'shared-flow';
  }

  getDependencies(): string[] {
    return ['SharedFlowService'];
  }

  async execute(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<ExecutionResult> {
    this.logExecutionStart(step, context);

    try {
      const flowName = step.data?.flowName || step.data?.name || 'Unknown Flow';

      // Create compatible context for SharedFlowService
      const compatibleContext = {
        executionId: execution.id,
        workflowId: context.workflowId || 'unknown',
        triggerType: 'manual',
        triggerId: 'unknown',
        userId: context.metadata?.userId || 'unknown',
        triggerData: context.data,
        data: context.data,
        metadata: context.metadata || {},
        createdAt: new Date()
      };

      // Execute shared flow
      const result = await this.sharedFlowService.executeSharedFlow(
        flowName,
        compatibleContext,
        execution.id
      );

      if (!result.success) {
        throw new Error(`Shared flow execution failed: ${result.error}`);
      }

      this.logger.log(`Shared flow executed successfully: ${flowName}`);

      const executionResult = this.createSuccessResult(
        result.result,
        step.next, // Next steps from workflow definition
        {
          flowName,
          executedAt: new Date().toISOString(),
          sharedFlowResult: result
        }
      );

      this.logExecutionEnd(step, executionResult);
      return executionResult;

    } catch (error) {
      const result = this.createErrorResult(
        `Shared flow execution failed: ${error.message}`,
        {
          stepId: step.id,
          flowName: step.data?.flowName,
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

    // Validate shared flow specific properties
    if (!step.data?.flowName && !step.data?.name) {
      errors.push('Flow name is required for shared flow nodes');
    }

    // Validate flow name format
    const flowName = step.data?.flowName || step.data?.name;
    if (flowName && typeof flowName !== 'string') {
      errors.push('Flow name must be a string');
    }

    if (flowName && flowName.trim().length === 0) {
      errors.push('Flow name cannot be empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

