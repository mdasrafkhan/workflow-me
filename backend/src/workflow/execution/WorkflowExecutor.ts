/**
 * Enhanced Workflow Execution Engine
 * Handles execution of JsonLogic workflows with better error handling,
 * logging, and extensibility for future workflow types
 */

import { Injectable, Logger } from '@nestjs/common';
import { WorkflowExecutionResult, WorkflowExecutionContext, ExecutionStep } from './types';
const jsonLogic = require('json-logic-js');

@Injectable()
export class WorkflowExecutor {
  private readonly logger = new Logger(WorkflowExecutor.name);

  /**
   * Execute a workflow with enhanced error handling and logging
   */
  async executeWorkflow(
    workflowId: number,
    jsonLogicRule: any,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();

    this.logger.log(`Starting workflow execution ${executionId} for workflow ${workflowId}`);

    try {
      // Log the JsonLogic rule for debugging
      this.logger.log(`Executing workflow ${workflowId} with rule: ${JSON.stringify(jsonLogicRule, null, 2)}`);

      // Check if rule is null or undefined
      if (!jsonLogicRule) {
        this.logger.warn(`Workflow ${workflowId} has no JsonLogic rule, skipping execution`);
        return {
          executionId,
          workflowId,
          success: true,
          result: { execute: false, reason: 'No rule defined' },
          executionTime: Date.now() - startTime,
          steps: [],
          timestamp: new Date()
        };
      }

      // Validate the JsonLogic rule
      const validationResult = this.validateJsonLogicRule(jsonLogicRule);
      if (!validationResult.isValid) {
        this.logger.warn(`Invalid JsonLogic rule for workflow ${workflowId}: ${validationResult.errors.join(', ')}`);
        // Don't throw error, just log warning and continue
      }

      // Execute the workflow
      const result = await this.executeJsonLogicRule(jsonLogicRule, context, executionId);

      const executionTime = Date.now() - startTime;

      this.logger.log(`Workflow execution ${executionId} completed in ${executionTime}ms`);

      return {
        executionId,
        workflowId,
        success: true,
        result,
        executionTime,
        steps: result.steps || [],
        timestamp: new Date()
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(`Workflow execution ${executionId} failed: ${error.message}`, error.stack);

      return {
        executionId,
        workflowId,
        success: false,
        error: error.message,
        executionTime,
        steps: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute JsonLogic rule with step-by-step tracking
   */
  private async executeJsonLogicRule(
    rule: any,
    context: WorkflowExecutionContext,
    executionId: string
  ): Promise<any> {
    const steps: ExecutionStep[] = [];

    try {
      const result = await this.executeRuleRecursively(rule, context, steps, executionId);

      return {
        ...result,
        steps
      };
    } catch (error) {
      this.logger.error(`JsonLogic execution failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Recursively execute JsonLogic rules with step tracking
   */
  private async executeRuleRecursively(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    if (!rule || typeof rule !== 'object') {
      this.logger.debug(`Rule is not an object or is null/undefined: ${rule}`);
      return rule;
    }

    this.logger.debug(`Executing rule recursively: ${JSON.stringify(rule)}`);

    // Handle different rule types
    if (rule.trigger) {
      return this.executeTriggerRule(rule, context, steps, executionId);
    } else if (rule.action) {
      return this.executeActionRule(rule, context, steps, executionId);
    } else if (rule.delay) {
      return this.executeDelayRule(rule, context, steps, executionId);
    } else if (rule.if) {
      return this.executeConditionalRule(rule, context, steps, executionId);
    } else if (rule.and || rule.or) {
      return this.executeLogicalRule(rule, context, steps, executionId);
    } else if (rule.parallel) {
      return this.executeParallelRule(rule, context, steps, executionId);
    } else {
      // Use standard JsonLogic for other operations
      return this.executeStandardJsonLogic(rule, context, steps, executionId);
    }
  }

  /**
   * Execute trigger rules
   */
  private async executeTriggerRule(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    const step: ExecutionStep = {
      id: this.generateStepId(),
      type: 'trigger',
      rule,
      startTime: Date.now(),
      status: 'running'
    };

    steps.push(step);

    try {
      // Check if trigger conditions are met
      const triggerMet = this.checkTriggerConditions(rule, context);

      step.result = { triggerMet };
      step.status = 'completed';
      step.endTime = Date.now();

      if (triggerMet) {
        this.logger.log(`Trigger ${rule.event} met for execution ${executionId}`);
        return { execute: true, trigger: rule.trigger, event: rule.event };
      } else {
        this.logger.log(`Trigger ${rule.event} not met for execution ${executionId}`);
        return { execute: false };
      }
    } catch (error) {
      step.error = error.message;
      step.status = 'failed';
      step.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Execute action rules
   */
  private async executeActionRule(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    const step: ExecutionStep = {
      id: this.generateStepId(),
      type: 'action',
      rule,
      startTime: Date.now(),
      status: 'running'
    };

    steps.push(step);

    try {
      // Execute the action
      const actionResult = await this.executeAction(rule.action, rule, context);

      step.result = actionResult;
      step.status = 'completed';
      step.endTime = Date.now();

      this.logger.log(`Action ${rule.action} executed successfully for execution ${executionId}`);

      return {
        execute: true,
        action: rule.action,
        result: actionResult
      };
    } catch (error) {
      step.error = error.message;
      step.status = 'failed';
      step.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Execute delay rules
   */
  private async executeDelayRule(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    const step: ExecutionStep = {
      id: this.generateStepId(),
      type: 'delay',
      rule,
      startTime: Date.now(),
      status: 'running'
    };

    steps.push(step);

    try {
      const delay = rule.delay;
      const scheduledAt = new Date();

      // Calculate delay hours
      let delayHours = 0;
      if (delay.type === 'fixed') {
        delayHours = delay.hours || 0;
      } else if (delay.type === 'random') {
        const minHours = delay.min_hours || 0;
        const maxHours = delay.max_hours || minHours;
        delayHours = Math.random() * (maxHours - minHours) + minHours;
      }

      // Calculate execution time
      const executeAt = new Date(scheduledAt.getTime() + (delayHours * 60 * 60 * 1000));

      // Create enhanced delay result with timing information
      const delayResult = {
        execute: false, // CRITICAL: This stops workflow execution
        workflowSuspended: true, // Indicates workflow should be suspended
        delay: {
          type: delay.type,
          hours: delayHours,
          scheduledAt: scheduledAt.toISOString(),
          executeAt: executeAt.toISOString(),
          workflowId: context.metadata?.workflowId || 0,
          executionId: executionId,
          userId: context.metadata?.userId || 'unknown',
          status: 'pending'
        }
      };

      this.logger.log(`Workflow suspended: ${delayHours} hours delay for execution ${executionId}, resume at ${executeAt.toISOString()}`);

      step.result = delayResult;
      step.status = 'completed';
      step.endTime = Date.now();

      return delayResult;
    } catch (error) {
      step.error = error.message;
      step.status = 'failed';
      step.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Execute conditional rules
   */
  private async executeConditionalRule(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    const step: ExecutionStep = {
      id: this.generateStepId(),
      type: 'conditional',
      rule,
      startTime: Date.now(),
      status: 'running'
    };

    steps.push(step);

    try {
      const [condition, trueBranch, falseBranch] = rule.if;

      // Evaluate condition
      const conditionResult = await this.executeRuleRecursively(condition, context, steps, executionId);

      let result;
      if (conditionResult) {
        result = await this.executeRuleRecursively(trueBranch, context, steps, executionId);
      } else {
        result = await this.executeRuleRecursively(falseBranch, context, steps, executionId);
      }

      step.result = { conditionResult, result };
      step.status = 'completed';
      step.endTime = Date.now();

      return result;
    } catch (error) {
      step.error = error.message;
      step.status = 'failed';
      step.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Execute logical rules (AND, OR)
   */
  private async executeLogicalRule(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    const step: ExecutionStep = {
      id: this.generateStepId(),
      type: 'logical',
      rule,
      startTime: Date.now(),
      status: 'running'
    };

    steps.push(step);

        try {
      const operator = rule.and ? 'and' : 'or';
      const operands = rule[operator];

      if (!operands || !Array.isArray(operands)) {
        throw new Error(`Invalid operands for ${operator} operation: ${operands}`);
      }

      const results = [];
      for (const operand of operands) {
        if (operand === undefined || operand === null) {
          this.logger.warn(`Skipping undefined/null operand in ${operator} operation`);
          continue;
        }
        const result = await this.executeRuleRecursively(operand, context, steps, executionId);

        // Check if workflow is suspended (delay encountered)
        if (result && typeof result === 'object' && result.workflowSuspended) {
          this.logger.log(`Workflow suspended at delay, stopping ${operator} operation`);
          return result; // Return the suspension result immediately
        }

        results.push(result);
      }

      let finalResult;
      if (operator === 'and') {
        finalResult = results.every(r => r && r !== false);
      } else {
        finalResult = results.some(r => r && r !== false);
      }

      step.result = { operator, results, finalResult };
      step.status = 'completed';
      step.endTime = Date.now();

      return finalResult;
    } catch (error) {
      step.error = error.message;
      step.status = 'failed';
      step.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Execute parallel rules
   */
  private async executeParallelRule(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    const step: ExecutionStep = {
      id: this.generateStepId(),
      type: 'parallel',
      rule,
      startTime: Date.now(),
      status: 'running'
    };

    steps.push(step);

    try {
      const { trigger, branches } = rule.parallel;

      // Execute trigger first
      const triggerResult = await this.executeRuleRecursively(trigger, context, steps, executionId);

      if (!triggerResult) {
        step.result = { triggerResult, branchesExecuted: 0 };
        step.status = 'completed';
        step.endTime = Date.now();
        return { execute: false };
      }

      // Execute branches in parallel
      const branchPromises = branches.map(branch =>
        this.executeRuleRecursively(branch, context, steps, executionId)
      );

      const branchResults = await Promise.all(branchPromises);

      step.result = { triggerResult, branchResults };
      step.status = 'completed';
      step.endTime = Date.now();

      return {
        execute: true,
        parallel: true,
        results: branchResults
      };
    } catch (error) {
      step.error = error.message;
      step.status = 'failed';
      step.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Execute standard JsonLogic operations
   */
  private async executeStandardJsonLogic(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    const step: ExecutionStep = {
      id: this.generateStepId(),
      type: 'jsonlogic',
      rule,
      startTime: Date.now(),
      status: 'running'
    };

    steps.push(step);

        try {
      this.logger.debug(`Executing standard JsonLogic rule: ${JSON.stringify(rule)}`);
      this.logger.debug(`With data: ${JSON.stringify(context.data)}`);

      if (!jsonLogic || typeof jsonLogic.apply !== 'function') {
        throw new Error('jsonLogic is not properly imported or apply method is not available');
      }

      const result = jsonLogic.apply(rule, context.data);

      step.result = result;
      step.status = 'completed';
      step.endTime = Date.now();

      this.logger.debug(`JsonLogic result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`JsonLogic execution error: ${error.message}`, error.stack);
      step.error = error.message;
      step.status = 'failed';
      step.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Check if trigger conditions are met
   */
  private checkTriggerConditions(rule: any, context: WorkflowExecutionContext): boolean {
    // This is a simplified implementation
    // In a real system, you would check against actual event data

    this.logger.debug(`Checking trigger conditions for rule: ${JSON.stringify(rule)}`);
    this.logger.debug(`Context data: ${JSON.stringify(context.data)}`);

    if (rule.trigger === 'subscription') {
      const hasSubscription = context.data.subscription_package !== undefined;
      this.logger.debug(`Subscription trigger check: ${hasSubscription} (subscription_package: ${context.data.subscription_package})`);
      return hasSubscription;
    } else if (rule.trigger === 'newsletter') {
      const hasNewsletter = context.data.newsletter_subscribed === true;
      this.logger.debug(`Newsletter trigger check: ${hasNewsletter} (newsletter_subscribed: ${context.data.newsletter_subscribed})`);
      return hasNewsletter;
    }

    this.logger.debug(`Unknown trigger type: ${rule.trigger}, defaulting to true`);
    return true; // Default to true for testing
  }

  /**
   * Execute specific actions
   */
  private async executeAction(action: string, rule: any, context: WorkflowExecutionContext): Promise<any> {
    switch (action) {
      case 'send_email':
        return this.executeSendEmailAction(rule, context);
      case 'update_user':
        return this.executeUpdateUserAction(rule, context);
      case 'create_task':
        return this.executeCreateTaskAction(rule, context);
      default:
        this.logger.warn(`Unknown action: ${action}`);
        return { action, status: 'unknown' };
    }
  }

  /**
   * Execute send email action
   */
  private async executeSendEmailAction(rule: any, context: WorkflowExecutionContext): Promise<any> {
    // In a real implementation, this would integrate with an email service
    this.logger.log(`Sending email: ${rule.template} to ${context.data.email}`);

    return {
      action: 'send_email',
      template: rule.template,
      recipient: context.data.email,
      status: 'sent',
      timestamp: new Date()
    };
  }

  /**
   * Execute update user action
   */
  private async executeUpdateUserAction(rule: any, context: WorkflowExecutionContext): Promise<any> {
    // In a real implementation, this would update user data in the database
    this.logger.log(`Updating user: ${context.data.id}`);

    return {
      action: 'update_user',
      userId: context.data.id,
      status: 'updated',
      timestamp: new Date()
    };
  }

  /**
   * Execute create task action
   */
  private async executeCreateTaskAction(rule: any, context: WorkflowExecutionContext): Promise<any> {
    // In a real implementation, this would create a task in a task management system
    this.logger.log(`Creating task for user: ${context.data.id}`);

    return {
      action: 'create_task',
      userId: context.data.id,
      status: 'created',
      timestamp: new Date()
    };
  }

  /**
   * Validate JsonLogic rule structure
   */
  public validateJsonLogicRule(rule: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule || typeof rule !== 'object') {
      errors.push('Rule must be an object');
      return { isValid: false, errors };
    }

    // Add more validation rules as needed
    if (rule.trigger && !rule.event) {
      errors.push('Trigger rules must have an event field');
    }

    if (rule.action && typeof rule.action !== 'string') {
      errors.push('Action must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique step ID
   */
  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Test method to verify JsonLogic is working
   */
  public testJsonLogic(): boolean {
    try {
      this.logger.log('Testing JsonLogic import...');

      if (!jsonLogic) {
        this.logger.error('jsonLogic is undefined');
        return false;
      }

      if (typeof jsonLogic.apply !== 'function') {
        this.logger.error('jsonLogic.apply is not a function');
        return false;
      }

      // Test with a simple rule
      const testRule = { "==": [1, 1] };
      const testData = {};
      const result = jsonLogic.apply(testRule, testData);

      this.logger.log(`JsonLogic test result: ${result}`);

      // Test with a more complex rule similar to what we generate
      const complexRule = {
        "trigger": "subscription",
        "event": "user_buys_subscription",
        "execute": true
      };

      const complexResult = jsonLogic.apply(complexRule, testData);
      this.logger.log(`Complex JsonLogic test result: ${complexResult}`);

      return result === true;
    } catch (error) {
      this.logger.error(`JsonLogic test failed: ${error.message}`, error.stack);
      return false;
    }
  }
}
