import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import {
  ExecutionResult,
  ValidationResult,
  WorkflowStep,
  WorkflowExecutionContext,
  WorkflowExecution
} from '../interfaces/node-executor.interface';

/**
 * Webhook Node Executor
 * Demonstrates how easy it is to add new node types
 * This took only 5 minutes to implement!
 */
@Injectable()
export class WebhookNodeExecutor extends BaseNodeExecutor {
  getNodeType(): string {
    return 'webhook';
  }

  getDependencies(): string[] {
    return []; // No external dependencies needed
  }

  async execute(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<ExecutionResult> {
    this.logExecutionStart(step, context);

    try {
      const webhookData = step.data;
      const url = webhookData.url;
      const method = webhookData.method || 'POST';
      const headers = webhookData.headers || {};
      const payload = this.buildPayload(webhookData.payload, context.data);

      // Simulate webhook call (in real implementation, use HTTP client)
      this.logger.log(`[MOCK] Webhook would be called: ${method} ${url}`);
      this.logger.log(`[MOCK] Headers: ${JSON.stringify(headers)}`);
      this.logger.log(`[MOCK] Payload: ${JSON.stringify(payload)}`);

      // Simulate response
      const mockResponse = {
        status: 200,
        data: { success: true, message: 'Webhook called successfully' },
        timestamp: new Date().toISOString()
      };

      this.logger.log(`Webhook executed successfully: ${url}`);

      const result = this.createSuccessResult(
        {
          url,
          method,
          status: mockResponse.status,
          response: mockResponse.data,
          calledAt: mockResponse.timestamp
        },
        step.next,
        {
          actionType: 'webhook',
          url,
          calledAt: mockResponse.timestamp
        }
      );

      this.logExecutionEnd(step, result);
      return result;

    } catch (error) {
      const result = this.createErrorResult(
        `Webhook execution failed: ${error.message}`,
        {
          stepId: step.id,
          url: step.data?.url,
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

    // Validate webhook-specific properties
    if (!step.data?.url) {
      errors.push('Webhook URL is required');
    }

    // Validate URL format
    if (step.data?.url && !this.isValidUrl(step.data.url)) {
      errors.push('Invalid webhook URL format');
    }

    // Validate HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    if (step.data?.method && !validMethods.includes(step.data.method.toUpperCase())) {
      errors.push(`Invalid HTTP method: ${step.data.method}. Valid methods: ${validMethods.join(', ')}`);
    }

    // Validate headers if provided
    if (step.data?.headers && typeof step.data.headers !== 'object') {
      errors.push('Headers must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private buildPayload(payloadTemplate: any, contextData: any): any {
    if (!payloadTemplate) {
      return contextData;
    }

    // Simple template replacement (in real implementation, use a proper templating engine)
    if (typeof payloadTemplate === 'string') {
      return payloadTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return contextData[key] || match;
      });
    }

    return payloadTemplate;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

