/**
 * Enhanced Workflow Execution Engine
 * Handles execution of JsonLogic workflows with better error handling,
 * logging, and extensibility for future workflow types
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowExecutionResult, WorkflowExecutionContext, ExecutionStep } from './types';
import { ActionService, ActionContext } from '../../services/action.service';
import { SharedFlowService } from '../../services/shared-flow.service';
import { WorkflowDelay } from '../../database/entities/workflow-delay.entity';
const jsonLogic = require('json-logic-js');

@Injectable()
export class WorkflowExecutor {
  private readonly logger = new Logger(WorkflowExecutor.name);

  constructor(
    private readonly actionService: ActionService,
    private readonly sharedFlowService: SharedFlowService,
    @InjectRepository(WorkflowDelay)
    private readonly delayRepository: Repository<WorkflowDelay>
  ) {}

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
    } else if (rule.always !== undefined) {
      return this.executeAlwaysRule(rule, context, steps, executionId);
    } else if (rule.end !== undefined) {
      return this.executeEndRule(rule, context, steps, executionId);
    } else if (rule.split) {
      return this.executeSplitRule(rule, context, steps, executionId);
    } else if (rule.url) {
      return this.executeUrlRule(rule, context, steps, executionId);
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
      let delayType = 'fixed';

      // Handle different delay type formats from frontend
      if (delay.type === 'fixed') {
        delayHours = delay.hours || 0;
        delayType = 'fixed';
      } else if (delay.type === 'random') {
        const minHours = delay.min_hours || 0;
        const maxHours = delay.max_hours || minHours;
        delayHours = Math.random() * (maxHours - minHours) + minHours;
        delayType = 'random';
      } else {
        // Handle frontend delay type mappings (e.g., "2_days", "1_week", etc.)
        const delayMap = {
          '1_hour': 1,
          '1_day': 24,
          '2_days': 48,
          '3_days': 72,
          '5_days': 120,
          '1_week': 168,
          '2_weeks': 336,
          '1_month': 720
        };

        delayHours = delayMap[delay.type] || delay.hours || 24; // Default to 24 hours
        delayType = 'fixed';
      }

      // Calculate execution time
      const executeAt = new Date(scheduledAt.getTime() + (delayHours * 60 * 60 * 1000));

      // Save delay to database
      const delayRecord = this.delayRepository.create({
        executionId: executionId,
        stepId: step.id,
        delayType: delayType, // Use the processed delayType
        delayMs: delayHours * 60 * 60 * 1000, // Convert hours to milliseconds
        scheduledAt: scheduledAt,
        executeAt: executeAt,
        status: 'pending',
        context: {
          workflowId: context.metadata?.workflowId || 0,
          userId: context.metadata?.userId || 'unknown',
          originalDelayType: delay.type, // Keep original for reference
          ...context.data
        },
        retryCount: 0
      });

      await this.delayRepository.save(delayRecord);

      this.logger.log(`Delay saved to database: ${delayRecord.id} - ${delayHours} hours delay for execution ${executionId}, resume at ${executeAt.toISOString()}`);

      // Create enhanced delay result with timing information
      const delayResult = {
        execute: false, // CRITICAL: This stops workflow execution
        workflowSuspended: true, // Indicates workflow should be suspended
        delay: {
          id: delayRecord.id,
          type: delayType, // Use the processed delayType
          originalType: delay.type, // Keep original for reference
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

      // Check for custom operations first
      const customResult = await this.executeCustomOperations(rule, context.data, context);
      if (customResult !== null) {
        step.result = customResult;
        step.status = 'completed';
        step.endTime = Date.now();
        this.logger.debug(`Custom operation result: ${JSON.stringify(customResult)}`);
        return customResult;
      }

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
   * Execute specific actions using ActionService
   */
  private async executeAction(action: string, rule: any, context: WorkflowExecutionContext): Promise<any> {
    this.logger.log(`Executing action: ${action}`);
    this.logger.debug(`Action rule: ${JSON.stringify(rule)}`);
    this.logger.debug(`Context data: ${JSON.stringify(context.data)}`);

    // Extract action properties from rule
    const actionType = rule.action || action;
    const actionName = rule.actionName || rule.name || `${actionType}_action`;
    const actionDetails = rule.actionDetails || rule.details || rule;

    this.logger.debug(`Rule object: ${JSON.stringify(rule)}`);
    this.logger.debug(`Action details: ${JSON.stringify(actionDetails)}`);

    // Log action properties for debugging
    this.logger.log(`Action Properties:`);
    this.logger.log(`  - Action Type: ${actionType}`);
    this.logger.log(`  - Action Name: ${actionName}`);
    this.logger.log(`  - Action Details: ${JSON.stringify(actionDetails)}`);
    this.logger.log(`  - User ID: ${(context as any).userId || 'unknown'}`);
    this.logger.log(`  - User Email: ${(context as any).metadata?.userEmail || 'unknown'}`);

    // Create user data object from context
    const userData = {
      id: (context as any).userId,
      email: (context as any).metadata?.userEmail,
      name: (context as any).metadata?.userName,
      product: (context as any).metadata?.product,
      subscriptionId: (context as any).metadata?.subscriptionId,
      ...(context as any).triggerData
    };

    // Create action context
    const actionContext: ActionContext = {
      actionType: actionType,
      actionName: actionName,
      actionDetails: actionDetails,
      userData: userData,
      metadata: context.metadata
    };

    this.logger.debug(`Action context userData: ${JSON.stringify(userData)}`);
    this.logger.debug(`Action context metadata: ${JSON.stringify(context.metadata)}`);

    // Validate action context
    const validation = this.actionService.validateActionContext(actionContext);
    if (!validation.isValid) {
      this.logger.error(`Invalid action context: ${validation.errors.join(', ')}`);
      throw new Error(`Invalid action context: ${validation.errors.join(', ')}`);
    }

    // Execute action using ActionService
    const result = await this.actionService.executeAction(actionContext);

    this.logger.log(`Action execution completed: ${JSON.stringify(result)}`);

    return result;
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
  public async testJsonLogic(): Promise<boolean> {
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

      // Test with a simple standard JsonLogic rule
      const testRule = { "==": [1, 1] };
      const testData = {};
      const result = jsonLogic.apply(testRule, testData);

      this.logger.log(`Standard JsonLogic test result: ${result}`);

      // Test with our custom execution engine using a complex rule
      const complexRule = {
        "trigger": "subscription",
        "event": "user_buys_subscription",
        "execute": true
      };

      const context = {
        data: {
          subscription_package: "premium",
          user_id: "test-user"
        },
        metadata: {
          source: 'test',
          timestamp: new Date(),
          userId: 'test-user'
        }
      };

      // Use our custom execution engine instead of standard JsonLogic
      const complexResult = await this.executeRuleRecursively(complexRule, context, [], 'test-execution');
      this.logger.log(`Custom execution engine test result: ${JSON.stringify(complexResult)}`);

      // Test with the user's workflow that contains 'always' operation
      const userWorkflowRule = {
        "if": [
          {
            "trigger": "subscription",
            "event": "user_buys_subscription",
            "execute": true
          },
          {
            "and": [
              {
                "always": true
              },
              {
                "delay": {
                  "hours": 168,
                  "type": "fixed"
                }
              },
              {
                "action": "send_email",
                "template": "welcome_basic",
                "subject": "Welcome to our service!",
                "type": "welcome"
              },
              {
                "split": {
                  "type": "conditional",
                  "execute": true
                }
              },
              {
                "url": {
                  "type": "admin",
                  "value": "www.google.com"
                }
              },
              {
                "end": true
              }
            ]
          },
          {
            "always": false
          }
        ]
      };

      const userWorkflowResult = await this.executeRuleRecursively(userWorkflowRule, context, [], 'test-user-workflow');
      this.logger.log(`User workflow test result: ${JSON.stringify(userWorkflowResult)}`);

      return result === true && complexResult !== undefined && userWorkflowResult !== undefined;
    } catch (error) {
      this.logger.error(`JsonLogic test failed: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Execute always rules - always returns true or false
   */
  private async executeAlwaysRule(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    const step: ExecutionStep = {
      id: this.generateStepId(),
      type: 'always',
      rule,
      startTime: Date.now(),
      status: 'running'
    };

    steps.push(step);

    try {
      const result = {
        execute: rule.always,
        always: rule.always
      };

      step.result = result;
      step.status = 'completed';
      step.endTime = Date.now();

      this.logger.log(`Always rule executed: ${rule.always} for execution ${executionId}`);
      return result;
    } catch (error) {
      step.error = error.message;
      step.status = 'failed';
      step.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Execute end rules - terminates workflow execution
   */
  private async executeEndRule(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    const step: ExecutionStep = {
      id: this.generateStepId(),
      type: 'end',
      rule,
      startTime: Date.now(),
      status: 'running'
    };

    steps.push(step);

    try {
      const result = {
        execute: false,
        end: true,
        workflowTerminated: true
      };

      step.result = result;
      step.status = 'completed';
      step.endTime = Date.now();

      this.logger.log(`End rule executed - workflow terminated for execution ${executionId}`);
      return result;
    } catch (error) {
      step.error = error.message;
      step.status = 'failed';
      step.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Execute split rules - conditional branching
   */
  private async executeSplitRule(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    const step: ExecutionStep = {
      id: this.generateStepId(),
      type: 'split',
      rule,
      startTime: Date.now(),
      status: 'running'
    };

    steps.push(step);

    try {
      const split = rule.split;
      let shouldExecute = false;

      if (split.type === 'conditional') {
        // For conditional splits, check if execute is true
        shouldExecute = split.execute === true;
      }

      const result = {
        execute: shouldExecute,
        split: {
          type: split.type,
          execute: shouldExecute
        }
      };

      step.result = result;
      step.status = 'completed';
      step.endTime = Date.now();

      this.logger.log(`Split rule executed: ${shouldExecute} for execution ${executionId}`);
      return result;
    } catch (error) {
      step.error = error.message;
      step.status = 'failed';
      step.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Execute URL rules - URL configuration
   */
  private async executeUrlRule(
    rule: any,
    context: WorkflowExecutionContext,
    steps: ExecutionStep[],
    executionId: string
  ): Promise<any> {
    const step: ExecutionStep = {
      id: this.generateStepId(),
      type: 'url',
      rule,
      startTime: Date.now(),
      status: 'running'
    };

    steps.push(step);

    try {
      const url = rule.url;
      const result = {
        execute: true,
        url: {
          type: url.type,
          value: url.value
        }
      };

      step.result = result;
      step.status = 'completed';
      step.endTime = Date.now();

      this.logger.log(`URL rule executed: ${url.value} for execution ${executionId}`);
      return result;
    } catch (error) {
      step.error = error.message;
      step.status = 'failed';
      step.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Execute custom operations that are not part of standard JsonLogic
   */
  private async executeCustomOperations(rule: any, data: any, context?: WorkflowExecutionContext): Promise<any> {
    // Handle send_email operation
    if (rule && typeof rule === 'object' && rule.send_email !== undefined) {
      this.logger.debug(`Executing send_email custom operation: ${JSON.stringify(rule.send_email)}`);

      // Extract action properties
      const actionType = 'send_email';
      const actionName = rule.send_email.actionName || rule.send_email.name || 'send_email_action';
      const actionDetails = {
        template: rule.send_email.template,
        subject: rule.send_email.subject,
        to: rule.send_email.to || data.email,
        data: rule.send_email.data,
        priority: rule.send_email.priority || 'normal',
        category: rule.send_email.category || 'workflow'
      };

      // Log action properties for debugging
      this.logger.log(`Custom Send Email Action Properties:`);
      this.logger.log(`  - Action Type: ${actionType}`);
      this.logger.log(`  - Action Name: ${actionName}`);
      this.logger.log(`  - Template: ${actionDetails.template}`);
      this.logger.log(`  - Subject: ${actionDetails.subject}`);
      this.logger.log(`  - To: ${actionDetails.to}`);
      this.logger.log(`  - User ID: ${data.id || 'unknown'}`);
      this.logger.log(`  - User Email: ${data.email || 'unknown'}`);

      // If we have context, use ActionService for proper execution
      if (context) {
        const actionContext: ActionContext = {
          actionType: actionType,
          actionName: actionName,
          actionDetails: actionDetails,
          userData: data,
          metadata: context.metadata
        };

        try {
          const result = await this.actionService.executeAction(actionContext);
          this.logger.log(`Custom send_email action executed via ActionService: ${JSON.stringify(result)}`);
          return result;
        } catch (error) {
          this.logger.error(`Custom send_email action failed: ${error.message}`);
          return {
            success: false,
            action: 'send_email',
            error: error.message,
            executed: false
          };
        }
      } else {
        // Fallback for when context is not available
        this.logger.log(`[MOCK] Would send email: ${actionDetails.subject || 'No subject'} to ${actionDetails.to || 'unknown'}`);
        return {
          success: true,
          action: 'send_email',
          actionName: actionName,
          subject: actionDetails.subject,
          template: actionDetails.template,
          to: actionDetails.to,
          executed: true
        };
      }
    }

    // Handle product_package condition
    if (rule && typeof rule === 'object' && rule.product_package !== undefined) {
      const expectedPackage = rule.product_package;
      const actualPackage = data.subscription_package || data.package || data.product;

      this.logger.debug(`Checking product_package: expected=${expectedPackage}, actual=${actualPackage}`);

      // Map package names to actual product values
      const packageMapping = {
        'package_1': 'united',
        'package_2': 'podcast',
        'package_3': 'newsletter'
      };

      const mappedExpected = packageMapping[expectedPackage] || expectedPackage;

      return actualPackage === mappedExpected;
    }

    // Handle product_package with negation
    if (rule && typeof rule === 'object' && rule.product_package && rule.product_package['!']) {
      const negationRule = rule.product_package['!'];

      if (negationRule.in && Array.isArray(negationRule.in)) {
        const actualPackage = data.subscription_package || data.package || data.product;
        const packageMapping = {
          'package_1': 'united',
          'package_2': 'podcast',
          'package_3': 'newsletter'
        };

        const mappedPackages = negationRule.in.map(pkg => packageMapping[pkg] || pkg);

        this.logger.debug(`Checking product_package negation: actual=${actualPackage}, not_in=${mappedPackages}`);

        return !mappedPackages.includes(actualPackage);
      }
    }

    // Handle sharedFlow operation
    if (rule && typeof rule === 'object' && rule.sharedFlow !== undefined) {
      this.logger.debug(`Executing sharedFlow custom operation: ${JSON.stringify(rule.sharedFlow)}`);

      if (!context) {
        this.logger.warn('Context not available for sharedFlow operation');
        return {
          success: false,
          error: 'Context not available for sharedFlow operation',
          executed: false
        };
      }

      try {
        // Create a compatible context for SharedFlowService
        const compatibleContext = {
          executionId: 'unknown',
          workflowId: context.metadata?.workflowId?.toString() || '0',
          triggerType: 'manual',
          triggerId: 'unknown',
          userId: context.metadata?.userId || 'unknown',
          triggerData: context.data,
          data: context.data,
          metadata: context.metadata || {},
          createdAt: new Date()
        };

        // Use the shared flow service to execute the shared flow
        const result = await this.sharedFlowService.executeSharedFlow(
          rule.sharedFlow.name || 'Unknown Flow',
          compatibleContext,
          'unknown'
        );

        this.logger.log(`Shared flow execution completed: ${JSON.stringify(result)}`);
        return {
          success: result.success,
          operation: 'sharedFlow',
          flowName: rule.sharedFlow.name,
          result: result.result,
          error: result.error,
          executed: true
        };
      } catch (error) {
        this.logger.error(`Shared flow execution failed: ${error.message}`);
        return {
          success: false,
          operation: 'sharedFlow',
          flowName: rule.sharedFlow.name,
          error: error.message,
          executed: false
        };
      }
    }

    return null; // No custom operation matched
  }
}
