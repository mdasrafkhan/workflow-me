import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import {
  ExecutionResult,
  ValidationResult,
  WorkflowStep,
  WorkflowExecutionContext,
  WorkflowExecution
} from '../interfaces/node-executor.interface';
import { ActionService, ActionContext } from '../../../services/action.service';

/**
 * Action Node Executor
 * Handles action execution in workflows (emails, SMS, webhooks, etc.)
 */
@Injectable()
export class ActionNodeExecutor extends BaseNodeExecutor {
  constructor(private readonly actionService: ActionService) {
    super();
  }

  getNodeType(): string {
    return 'action';
  }

  getDependencies(): string[] {
    return ['ActionService'];
  }

  async execute(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<ExecutionResult> {
    this.logExecutionStart(step, context);

    try {
      const actionData = step.data;
      const actionType = actionData.actionType || 'send_email';
      const actionName = actionData.actionName || 'Action';
      // For email actions, the configuration is directly in actionData, not in actionData.actionData
      const actionDetails = actionData.actionData || actionData;

      // Create user data object from context
      const userData = {
        id: context.metadata?.userId,
        email: context.data?.email,
        name: context.data?.name,
        product: context.data?.product,
        subscriptionId: context.data?.subscriptionId,
        ...context.data
      };

      // Create action context
      const actionContext: ActionContext = {
        actionType: actionType,
        actionName: actionName,
        actionDetails: actionDetails,
        userData: userData,
        metadata: {
          ...context.metadata,
          workflowId: context.metadata?.workflowId
        }
      };

      // Validate action context
      const validation = this.actionService.validateActionContext(actionContext);
      if (!validation.isValid) {
        throw new Error(`Invalid action context: ${validation.errors.join(', ')}`);
      }

      // Execute action using ActionService
      const result = await this.actionService.executeAction(actionContext);

      // Action completed - no need to log success

      const executionResult = this.createSuccessResult(
        result,
        step.next, // Next steps from workflow definition
        {
          actionType,
          actionName,
          executedAt: new Date().toISOString()
        }
      );

      this.logExecutionEnd(step, executionResult);
      return executionResult;

    } catch (error) {
      const result = this.createErrorResult(
        `Action execution failed: ${error.message}`,
        {
          stepId: step.id,
          actionType: step.data?.actionType,
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

    // Validate action-specific properties
    if (!step.data?.actionType) {
      errors.push('Action type is required');
    }

    if (!step.data?.actionName) {
      errors.push('Action name is required');
    }

    // Validate action type
    const validActionTypes = [
      'send_email', 'send_sms', 'update_user', 'create_task',
      'trigger_webhook', 'send_newsletter', 'custom'
    ];

    if (step.data?.actionType && !validActionTypes.includes(step.data.actionType)) {
      errors.push(`Invalid action type: ${step.data.actionType}. Must be one of: ${validActionTypes.join(', ')}`);
    }

    // Validate action data for specific types
    if (step.data?.actionType === 'send_email') {
      if (!step.data?.actionData?.template && !step.data?.actionData?.subject) {
        warnings.push('Email action should have either template or subject');
      }
    }

    if (step.data?.actionType === 'trigger_webhook') {
      if (!step.data?.actionData?.url) {
        errors.push('Webhook URL is required for webhook actions');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

