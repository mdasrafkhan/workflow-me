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

      // Handle if-else structure with JsonLogic
      if (conditionData.if && Array.isArray(conditionData.if)) {
        // Find which condition branch matches and extract its actions
        const matchingBranch = this.findMatchingIfBranch(conditionData.if, context.data);

        if (matchingBranch) {
          conditionResult = true;
          this.logger.log(`If-else condition matched branch with actions`);

          // Extract actions from the matching branch to be executed next
          const actions = this.extractActionsFromBranch(matchingBranch);
          this.logger.log(`Extracted ${actions.length} actions from matching branch`);

          // Return the actions as the result so they can be executed
          const result = this.createSuccessResult(
            {
              conditionResult: true,
              matchedBranch: matchingBranch,
              extractedActions: actions,
              evaluatedAt: new Date().toISOString()
            },
            [], // No next steps - actions will be handled by orchestration engine
            {
              conditionPassed: true,
              actionsToExecute: actions
            }
          );

          this.logExecutionEnd(step, result);
          return result;
        } else {
          conditionResult = false;
          this.logger.log(`If-else condition: no matching branch found`);
        }
      } else {
        throw new Error('Only if-else structures are supported');
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

    console.log(`[DEBUG] Condition validation - step data:`, JSON.stringify(step.data, null, 2));

    // Validate condition-specific properties
    // Only check for if-else structure (which should be handled by JsonLogic execution)
    const hasIfElseStructure = step.data?.if && Array.isArray(step.data.if);

    console.log(`[DEBUG] hasIfElseStructure: ${hasIfElseStructure}`);

    if (!hasIfElseStructure) {
      errors.push('If-else structure is required');
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

  private findMatchingIfBranch(ifBranches: any[], contextData: any): any {
    const jsonLogic = require('json-logic-js');

    for (let i = 0; i < ifBranches.length - 1; i += 2) {
      const condition = ifBranches[i];
      const branchActions = ifBranches[i + 1];

      // Convert simple condition syntax to JsonLogic syntax
      const jsonLogicCondition = this.convertToJsonLogic(condition);
      this.logger.log(`Converted condition ${JSON.stringify(condition)} to JsonLogic: ${JSON.stringify(jsonLogicCondition)}`);


      // Evaluate the condition
      const conditionResult = jsonLogic.apply(jsonLogicCondition, contextData);
      this.logger.log(`Evaluating condition: ${conditionResult}`);

      if (conditionResult) {
        this.logger.log(`Found matching condition branch`);
        return branchActions;
      }
    }

    // Check if there's a default else branch (odd number of elements, last one is the else)
    if (ifBranches.length % 2 === 1) {
      const elseBranch = ifBranches[ifBranches.length - 1];
      this.logger.log(`Using default else branch`);
      return elseBranch;
    }

    return null;
  }

  private extractActionsFromBranch(branch: any): any[] {
    if (branch.and && Array.isArray(branch.and)) {
      // Extract actions from 'and' array, skipping the condition
      return branch.and.slice(1); // Skip first element (the condition)
    } else if (branch.if && Array.isArray(branch.if)) {
      // Handle nested if-else
      return [branch];
    } else {
      // Single action
      return [branch];
    }
  }

  private convertToJsonLogic(condition: any): any {
    // Handle simple key-value conditions like {"product_package": "package_1"}
    if (typeof condition === 'object' && condition !== null) {
      const keys = Object.keys(condition);
      if (keys.length === 1) {
        const key = keys[0];
        const value = condition[key];

        // Check if it's a condition field
        if (['product_package', 'user_segment', 'subscription_status', 'email_domain'].includes(key)) {
          return {
            "==": [{"var": key}, value]
          };
        }

        // Handle complex conditions like {"product_package": {"!": {"in": ["package_1", "package_2"]}}}
        if (typeof value === 'object' && value !== null) {
          const valueKeys = Object.keys(value);
          if (valueKeys.length === 1) {
            const operator = valueKeys[0];
            const operatorValue = value[operator];

            if (operator === '!' && operatorValue.in) {
              return {
                "!": {
                  "in": [{"var": key}, operatorValue.in]
                }
              };
            }
          }
        }
      }
    }

    // Return as-is if no conversion needed
    return condition;
  }
}

