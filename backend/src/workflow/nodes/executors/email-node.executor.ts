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
 * Email Node Executor
 * Specialized executor for email actions
 * Demonstrates how easy it is to create new node types
 */
@Injectable()
export class EmailNodeExecutor extends BaseNodeExecutor {
  constructor(private readonly actionService: ActionService) {
    super();
  }

  getNodeType(): string {
    return 'email';
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
      const emailData = step.data;
      const template = emailData.template || 'welcome';
      const subject = emailData.subject || 'Email from Workflow';
      const to = emailData.to || context.data?.email || 'unknown@example.com';

      // Create action context for email
      const actionContext: ActionContext = {
        actionType: 'send_email',
        actionName: emailData.actionName || 'Email Action',
        actionDetails: {
          template,
          subject,
          to,
          data: {
            ...context.data,
            ...emailData.data
          },
          priority: emailData.priority || 'normal',
          category: emailData.category || 'workflow'
        },
        userData: context.data,
        metadata: context.metadata
      };

      // Execute email action
      const result = await this.actionService.executeAction(actionContext);

      this.logger.log(`Email sent successfully: ${subject} to ${to}`);

      const executionResult = this.createSuccessResult(
        {
          emailId: result.result?.id,
          subject,
          to,
          template,
          sentAt: new Date().toISOString()
        },
        step.next,
        {
          actionType: 'send_email',
          template,
          sentAt: new Date().toISOString()
        }
      );

      this.logExecutionEnd(step, executionResult);
      return executionResult;

    } catch (error) {
      const result = this.createErrorResult(
        `Email execution failed: ${error.message}`,
        {
          stepId: step.id,
          template: step.data?.template,
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

    // Validate email-specific properties
    if (!step.data?.template && !step.data?.subject) {
      errors.push('Either template or subject is required for email nodes');
    }

    if (!step.data?.to) {
      warnings.push('No recipient email specified - will use context email if available');
    }

    // Validate email format if provided
    if (step.data?.to && !this.isValidEmail(step.data.to)) {
      errors.push('Invalid email format for recipient');
    }

    // Validate template if provided
    const validTemplates = ['welcome', 'follow-up', 'newsletter', 'reminder', 'custom'];
    if (step.data?.template && !validTemplates.includes(step.data.template)) {
      warnings.push(`Unknown template: ${step.data.template}. Valid templates: ${validTemplates.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
