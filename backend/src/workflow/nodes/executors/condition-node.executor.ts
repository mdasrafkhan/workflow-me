import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import {
  ExecutionResult,
  ValidationResult,
  WorkflowStep,
  WorkflowExecutionContext,
  WorkflowExecution
} from '../interfaces/node-executor.interface';
import {
  BusinessConditionNode,
  ConditionEvaluationResult,
  BusinessConditionConfig
} from '../../interfaces/condition-node.interface';

/**
 * Business Condition Node Executor
 * Handles business-specific conditional logic in workflows
 * Supports multiple business domains and condition types
 */
@Injectable()
export class ConditionNodeExecutor extends BaseNodeExecutor implements BusinessConditionNode {
  getNodeType(): string {
    return 'condition';
  }

  getDependencies(): string[] {
    return [];
  }

  // ============================================================================
  // BUSINESS CONDITION NODE INTERFACE IMPLEMENTATION
  // ============================================================================

  getBusinessDomain(): string {
    return 'general'; // Default domain, can be overridden by specific condition types
  }

  getConditionType(): string {
    return 'multi_domain'; // Supports multiple condition types
  }

  async evaluateBusinessCondition(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<ConditionEvaluationResult> {
    try {
      const conditionData = step.data;
      let conditionResult: boolean;
      let matchedBranch: any = null;
      let extractedActions: any[] = [];

      // Handle if-else structure with JsonLogic
      if (conditionData.if && Array.isArray(conditionData.if)) {
        // Find which condition branch matches and extract its actions
        matchedBranch = this.findMatchingIfBranch(conditionData.if, context.data);

        if (matchedBranch) {
          conditionResult = true;
          this.logger.log(`If-else condition matched branch with actions`);

          // Extract actions from the matching branch to be executed next
          extractedActions = this.extractActionsFromBranch(matchedBranch);
          this.logger.log(`Extracted ${extractedActions.length} actions from matching branch`);
        } else {
          conditionResult = false;
          this.logger.log(`If-else condition: no matching branch found`);
        }
      } else {
        // Handle single condition evaluation
        conditionResult = this.evaluateCondition(
          conditionData.conditionType,
          conditionData.conditionValue,
          conditionData.operator,
          context.data
        );
      }

      return {
        success: true,
        result: conditionResult,
        matchedBranch,
        extractedActions,
        businessContext: {
          domain: this.getBusinessDomain(),
          conditionType: this.getConditionType(),
          evaluatedAt: new Date().toISOString()
        },
        metadata: {
          conditionPassed: conditionResult,
          actionsToExecute: extractedActions.length
        }
      };

    } catch (error) {
      return {
        success: false,
        result: false,
        error: `Business condition evaluation failed: ${error.message}`,
        businessContext: {
          domain: this.getBusinessDomain(),
          conditionType: this.getConditionType(),
          error: error.message
        }
      };
    }
  }

  getSupportedOperators(): string[] {
    return [
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'greater_than',
      'less_than',
      'greater_than_or_equal',
      'less_than_or_equal',
      'in',
      'not_in',
      'starts_with',
      'ends_with',
      'regex',
      'is_null',
      'is_not_null',
      'is_empty',
      'is_not_empty'
    ];
  }

  getConditionSchema(): object {
    return {
      type: 'object',
      properties: {
        conditionType: {
          type: 'string',
          enum: [
            'product_package',
            'user_segment',
            'subscription_status',
            'email_domain',
            'custom_field',
            'user_condition',
            'business_rule',
            'payment_method',
            'user_preferences',
            'subscription_tier',
            'user_activity',
            'geographic_location',
            'device_type',
            'browser_type',
            'time_based',
            'frequency_based'
          ]
        },
        operator: {
          type: 'string',
          enum: this.getSupportedOperators()
        },
        conditionValue: {
          type: 'object',
          description: 'Value to compare against, structure depends on conditionType'
        },
        businessRules: {
          type: 'object',
          description: 'Additional business-specific rules and configurations'
        },
        fallbackActions: {
          type: 'array',
          description: 'Actions to execute if condition fails'
        }
      },
      required: ['conditionType', 'operator', 'conditionValue']
    };
  }

  async execute(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<ExecutionResult> {
    this.logExecutionStart(step, context);

    try {
      // Use the new business condition evaluation
      const conditionResult = await this.evaluateBusinessCondition(step, context, execution);

      if (!conditionResult.success) {
        return this.createErrorResult(
          conditionResult.error || 'Business condition evaluation failed',
          {
            stepId: step.id,
            conditionType: step.data?.conditionType,
            businessDomain: this.getBusinessDomain(),
            error: conditionResult.error
          }
        );
      }

      // Handle if-else structure with extracted actions
      if (conditionResult.extractedActions && conditionResult.extractedActions.length > 0) {
        // Return the actions as the result so they can be executed
        const result = this.createSuccessResult(
          {
            conditionResult: conditionResult.result,
            matchedBranch: conditionResult.matchedBranch,
            extractedActions: conditionResult.extractedActions,
            businessContext: conditionResult.businessContext,
            evaluatedAt: new Date().toISOString()
          },
          [], // No next steps - actions will be handled by orchestration engine
          {
            conditionPassed: conditionResult.result,
            actionsToExecute: conditionResult.extractedActions,
            businessDomain: this.getBusinessDomain(),
            conditionType: this.getConditionType()
          }
        );

        this.logExecutionEnd(step, result);
        return result;
      }

      // Handle single condition evaluation
      const nextSteps = this.determineNextSteps(step, conditionResult.result);

      const result = this.createSuccessResult(
        {
          conditionType: step.data?.conditionType,
          conditionValue: step.data?.conditionValue,
          operator: step.data?.operator,
          customCondition: step.data?.condition,
          result: conditionResult.result,
          businessContext: conditionResult.businessContext,
          evaluatedAt: new Date().toISOString()
        },
        nextSteps,
        {
          conditionPassed: conditionResult.result,
          nextSteps,
          businessDomain: this.getBusinessDomain(),
          conditionType: this.getConditionType()
        }
      );

      this.logExecutionEnd(step, result);
      return result;

    } catch (error) {
      const result = this.createErrorResult(
        `Business condition execution failed: ${error.message}`,
        {
          stepId: step.id,
          conditionType: step.data?.conditionType,
          businessDomain: this.getBusinessDomain(),
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


    const conditionData = step.data;
    const schema = this.getConditionSchema() as any;

    // Check for if-else structure (JsonLogic)
    const hasIfElseStructure = conditionData?.if && Array.isArray(conditionData.if);

    // Check for single condition structure
    const hasSingleCondition = conditionData?.conditionType && conditionData?.operator && conditionData?.conditionValue;

    console.log(`[DEBUG] hasIfElseStructure: ${hasIfElseStructure}, hasSingleCondition: ${hasSingleCondition}`);

    if (!hasIfElseStructure && !hasSingleCondition) {
      errors.push('Either if-else structure or single condition (conditionType, operator, conditionValue) is required');
    }

    // Validate single condition structure if present
    if (hasSingleCondition) {
      // Validate conditionType
      if (conditionData.conditionType && !schema.properties.conditionType.enum.includes(conditionData.conditionType)) {
        errors.push(`Invalid conditionType: ${conditionData.conditionType}. Must be one of: ${schema.properties.conditionType.enum.join(', ')}`);
      }

      // Validate operator
      if (conditionData.operator && !this.getSupportedOperators().includes(conditionData.operator)) {
        errors.push(`Invalid operator: ${conditionData.operator}. Must be one of: ${this.getSupportedOperators().join(', ')}`);
      }

      // Validate conditionValue exists
      if (!conditionData.conditionValue) {
        errors.push('conditionValue is required for single condition structure');
      }

      // Business-specific validation based on conditionType
      if (conditionData.conditionType) {
        const businessValidation = this.validateBusinessCondition(conditionData);
        errors.push(...businessValidation.errors);
        warnings.push(...businessValidation.warnings);
      }
    }

    // Validate if-else structure
    if (hasIfElseStructure) {
      if (!Array.isArray(conditionData.if) || conditionData.if.length < 2) {
        errors.push('If-else structure must have at least 2 elements (condition, actions)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate business-specific condition logic
   */
  private validateBusinessCondition(conditionData: any): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const { conditionType, operator, conditionValue } = conditionData;

    // Business-specific validation rules
    switch (conditionType) {
      case 'product_package':
        if (operator === 'in' && (!Array.isArray(conditionValue) || conditionValue.length === 0)) {
          errors.push('product_package with "in" operator requires non-empty array of package values');
        }
        break;

      case 'user_segment':
        if (operator === 'equals' && typeof conditionValue !== 'string') {
          errors.push('user_segment with "equals" operator requires string value');
        }
        break;

      case 'subscription_status':
        const validStatuses = ['active', 'inactive', 'pending', 'cancelled', 'expired'];
        if (operator === 'equals' && !validStatuses.includes(conditionValue)) {
          errors.push(`subscription_status with "equals" operator requires one of: ${validStatuses.join(', ')}`);
        }
        break;

      case 'email_domain':
        if (operator === 'equals' && !this.isValidEmailDomain(conditionValue)) {
          warnings.push('email_domain value should be a valid domain format');
        }
        break;

      case 'user_condition':
        if (!conditionValue.field || !conditionValue.value) {
          errors.push('user_condition requires both field and value properties');
        }
        break;

      case 'payment_method':
        const validPaymentMethods = ['credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer'];
        if (operator === 'equals' && !validPaymentMethods.includes(conditionValue)) {
          errors.push(`payment_method with "equals" operator requires one of: ${validPaymentMethods.join(', ')}`);
        }
        break;

      case 'time_based':
        if (!this.isValidTimeCondition(conditionValue)) {
          errors.push('time_based condition requires valid time configuration');
        }
        break;

      case 'frequency_based':
        if (!this.isValidFrequencyCondition(conditionValue)) {
          errors.push('frequency_based condition requires valid frequency configuration');
        }
        break;
    }

    return { errors, warnings };
  }

  private isValidEmailDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,})$/;
    return domainRegex.test(domain);
  }

  private isValidTimeCondition(timeValue: any): boolean {
    if (typeof timeValue === 'object' && timeValue !== null) {
      return timeValue.hour !== undefined && timeValue.minute !== undefined;
    }
    return false;
  }

  private isValidFrequencyCondition(freqValue: any): boolean {
    if (typeof freqValue === 'object' && freqValue !== null) {
      return freqValue.interval !== undefined && freqValue.count !== undefined;
    }
    return false;
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

