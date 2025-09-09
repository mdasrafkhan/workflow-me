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
 * Condition Node Executor
 * Handles conditional logic in workflows
 */
@Injectable()
export class ConditionNodeExecutor extends BaseNodeExecutor {
  getNodeType(): string {
    return 'condition';
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
      const conditionData = step.data;
      let conditionResult: boolean;

      // Check if it's a generic condition with custom JsonLogic rule
      if (conditionData.condition && typeof conditionData.condition === 'object') {
        // Use JsonLogic to evaluate the custom condition
        const jsonLogic = require('json-logic-js');
        conditionResult = jsonLogic.apply(conditionData.condition, context.data);
        this.logger.log(`Generic condition evaluated with JsonLogic: ${JSON.stringify(conditionData.condition)} = ${conditionResult}`);
      } else {
        // Use structured condition evaluation
        const conditionType = conditionData.conditionType || 'product_package';
        const conditionValue = conditionData.conditionValue;
        const operator = conditionData.operator || 'equals';

        // Evaluate condition
        conditionResult = this.evaluateCondition(
          conditionType,
          conditionValue,
          operator,
          context.data
        );

        this.logger.log(`Structured condition evaluated: ${conditionType} ${operator} ${conditionValue} = ${conditionResult}`);
      }

      // Determine next steps based on condition result
      const nextSteps = this.determineNextSteps(step, conditionResult);

      const result = this.createSuccessResult(
        {
          conditionType: conditionData.conditionType,
          conditionValue: conditionData.conditionValue,
          operator: conditionData.operator,
          customCondition: conditionData.condition,
          result: conditionResult,
          evaluatedAt: new Date().toISOString()
        },
        nextSteps,
        {
          conditionPassed: conditionResult,
          nextSteps
        }
      );

      this.logExecutionEnd(step, result);
      return result;

    } catch (error) {
      const result = this.createErrorResult(
        `Condition evaluation failed: ${error.message}`,
        {
          stepId: step.id,
          conditionType: step.data?.conditionType,
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

    // Validate condition-specific properties
    // Check if it's a structured condition (with conditionType and conditionValue)
    // or a generic condition (with custom condition JsonLogic rule)
    const hasStructuredCondition = step.data?.conditionType && step.data?.conditionValue;
    const hasGenericCondition = step.data?.condition && typeof step.data.condition === 'object';

    if (!hasStructuredCondition && !hasGenericCondition) {
      errors.push('Either condition type/value or custom condition rule is required');
    }

    if (hasStructuredCondition) {
      if (!step.data?.conditionType) {
        errors.push('Condition type is required');
      }

      if (!step.data?.conditionValue) {
        errors.push('Condition value is required');
      }
    }

    // Validate condition type
    const validConditionTypes = [
      'product_package', 'user_segment', 'subscription_status',
      'email_domain', 'custom_field', 'date_range', 'user_condition'
    ];

    if (step.data?.conditionType && !validConditionTypes.includes(step.data.conditionType)) {
      errors.push(`Invalid condition type: ${step.data.conditionType}. Must be one of: ${validConditionTypes.join(', ')}`);
    }

    // Validate operator
    const validOperators = ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in'];
    if (step.data?.operator && !validOperators.includes(step.data.operator)) {
      errors.push(`Invalid operator: ${step.data.operator}. Must be one of: ${validOperators.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private evaluateCondition(
    conditionType: string,
    conditionValue: any,
    operator: string,
    contextData: any
  ): boolean {
    let actualValue: any;

    // Extract actual value based on condition type
    switch (conditionType) {
      case 'product_package':
        actualValue = contextData.subscription_package || contextData.package || contextData.product;
        break;
      case 'user_segment':
        actualValue = contextData.segment || contextData.user_segment;
        break;
      case 'subscription_status':
        actualValue = contextData.status || contextData.subscription_status;
        break;
      case 'email_domain':
        actualValue = contextData.email?.split('@')[1];
        break;
      case 'custom_field':
        actualValue = contextData[conditionValue.field] || contextData.custom_fields?.[conditionValue.field];
        conditionValue = conditionValue.value;
        break;
      case 'user_condition':
        // Handle user condition with preferences.notifications or preferences.language
        if (conditionValue.field) {
          const fieldPath = conditionValue.field;
          if (fieldPath === 'preferences.notifications') {
            // Check both user.preferences.notifications and preferences.notifications
            actualValue = contextData.user?.preferences?.notifications ?? contextData.preferences?.notifications;
          } else if (fieldPath === 'preferences.language') {
            // Check both user.preferences.language and preferences.language
            actualValue = contextData.user?.preferences?.language ?? contextData.preferences?.language;
          } else {
            // Handle nested field access like user.preferences.notifications
            actualValue = this.getNestedValue(contextData, fieldPath);
          }
          conditionValue = conditionValue.value;
        }
        break;
      default:
        actualValue = contextData[conditionType];
    }

    // Apply operator
    switch (operator) {
      case 'equals':
        return actualValue === conditionValue;
      case 'not_equals':
        return actualValue !== conditionValue;
      case 'contains':
        return String(actualValue).includes(String(conditionValue));
      case 'not_contains':
        return !String(actualValue).includes(String(conditionValue));
      case 'greater_than':
        return Number(actualValue) > Number(conditionValue);
      case 'less_than':
        return Number(actualValue) < Number(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(actualValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(actualValue);
      default:
        return false;
    }
  }

  private determineNextSteps(step: WorkflowStep, conditionResult: boolean): string[] {
    if (!step.conditions || step.conditions.length === 0) {
      return step.next || [];
    }

    // Find matching condition
    const matchingCondition = step.conditions.find(condition => {
      // Simple condition matching - can be enhanced
      return condition.condition === (conditionResult ? 'true' : 'false');
    });

    return matchingCondition ? [matchingCondition.next] : (step.next || []);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

