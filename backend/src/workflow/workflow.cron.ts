import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LessThanOrEqual } from 'typeorm';
import { WorkflowService } from './workflow.service';
import { WorkflowOrchestrationEngine } from './execution/workflow-orchestration-engine';
import { WorkflowExecutionContext } from './types';
import { SubscriptionTriggerService } from '../services/subscription-trigger.service';
import { NewsletterTriggerService } from '../services/newsletter-trigger.service';
import { UserTriggerService } from '../services/user-trigger.service';

@Injectable()
export class WorkflowCron {
  private lastExecutionTime: Date | null = null;
  private executionHistory: Array<{
    timestamp: Date;
    workflowsProcessed: number;
    successCount: number;
    errorCount: number;
    executionTime: number;
  }> = [];

  // Cache for active trigger types to avoid checking on every cron run
  private activeTriggerTypesCache: string[] = [];
  private lastTriggerTypesCheck: Date | null = null;
  private readonly TRIGGER_TYPES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowOrchestrationEngine: WorkflowOrchestrationEngine,
    private readonly subscriptionTriggerService: SubscriptionTriggerService,
    private readonly newsletterTriggerService: NewsletterTriggerService,
    private readonly userTriggerService: UserTriggerService
  ) {}

      @Cron('* * * * *') // Runs every minute
  async handleCron() {
    const startTime = Date.now();

    let successCount = 0;
    let errorCount = 0;

    try {
      // First check which trigger types have active workflows
      const activeTriggerTypes = await this.getActiveTriggerTypes();

      if (activeTriggerTypes.length === 0) {
        return;
      }

      // Process subscription triggers only if workflows exist for this trigger type
      if (activeTriggerTypes.includes('user_buys_subscription')) {
        try {
          // Get all workflows that have user_buys_subscription triggers
          const subscriptionWorkflows = await this.getWorkflowsForTriggerType('user_buys_subscription');

          for (const workflow of subscriptionWorkflows) {
            try {
              // Use workflow ID directly
              const subscriptionTriggers = await this.subscriptionTriggerService.retrieveTriggerData(workflow.id);

              let processedCount = 0;
              for (const trigger of subscriptionTriggers) {
                try {
                  await this.processTriggerEvent(trigger, 'user_buys_subscription', workflow.id);
                  processedCount++;
                  successCount++;
                } catch (error) {
                  console.error(`Error processing subscription trigger ${trigger.id}:`, error);
                  errorCount++;
                }
              }

              // Update last execution time after successful processing
              if (processedCount > 0) {
                await this.subscriptionTriggerService.updateLastExecutionTime(workflow.id, 'user_buys_subscription');
              }
            } catch (error) {
              console.error(`Error processing subscription triggers for workflow ${workflow.id}:`, error);
              errorCount++;
            }
          }
        } catch (error) {
          console.error('Error in subscription triggers section:', error);
          errorCount++;
        }
      }

      // Process newsletter triggers only if workflows exist for this trigger type
      if (activeTriggerTypes.includes('newsletter_subscribed')) {
        try {
          const newsletterWorkflows = await this.getWorkflowsForTriggerType('newsletter_subscribed');

          for (const workflow of newsletterWorkflows) {
            try {
              const newsletterTriggers = await this.newsletterTriggerService.retrieveTriggerData(this.lastExecutionTime);

              let processedCount = 0;
              for (const trigger of newsletterTriggers) {
                try {
                  await this.processTriggerEvent(trigger, 'newsletter_subscribed', workflow.id);
                  processedCount++;
                  successCount++;
                } catch (error) {
                  console.error(`Error processing newsletter trigger ${trigger.id}:`, error);
                  errorCount++;
                }
              }

              // Only update lastExecutionTime after successful processing
              if (processedCount > 0) {
                // Newsletter trigger service doesn't have updateLastExecutionTime method
                // The lastExecutionTime is managed by the service itself
              }
            } catch (error) {
              console.error(`Error processing newsletter triggers for workflow ${workflow.id}:`, error);
              errorCount++;
            }
          }
        } catch (error) {
          console.error('Error processing newsletter triggers:', error);
          errorCount++;
        }
      }

      // Process user registration triggers only if workflows exist for this trigger type
      if (activeTriggerTypes.includes('user_registers')) {
        try {
          const userWorkflows = await this.getWorkflowsForTriggerType('user_registers');

          for (const workflow of userWorkflows) {
            try {
              const userTriggers = await this.userTriggerService.retrieveTriggerData(workflow.id);

              let processedCount = 0;
              for (const trigger of userTriggers) {
                try {
                  await this.processTriggerEvent(trigger, 'user_registers', workflow.id);
                  processedCount++;
                  successCount++;
                } catch (error) {
                  console.error(`Error processing user registration trigger ${trigger.id}:`, error);
                  errorCount++;
                }
              }

              // Only update lastExecutionTime after successful processing
              if (processedCount > 0) {
                await this.userTriggerService.updateLastExecutionTime(workflow.id, 'user_registers');
              }
            } catch (error) {
              console.error(`Error processing user registration triggers for workflow ${workflow.id}:`, error);
              errorCount++;
            }
          }
        } catch (error) {
          console.error('Error processing user registration triggers:', error);
          errorCount++;
        }
      }

      // Process user creation triggers for each workflow
      if (activeTriggerTypes.includes('user_created')) {
        try {
          // Get only workflows that have user_created triggers
          const workflows = await this.getWorkflowsForTriggerType('user_created');
          for (const workflow of workflows) {
            try {
              const userTriggers = await this.userTriggerService.retrieveTriggerData(workflow.id);

              let processedCount = 0;
              for (const trigger of userTriggers) {
                try {
                  await this.processTriggerEvent(trigger, 'user_created', workflow.id);
                  processedCount++;
                  successCount++;
                } catch (error) {
                  console.error(`Error processing user creation trigger ${trigger.id}:`, error);
                  errorCount++;
                }
              }

              // Only update lastExecutionTime after successful processing
              if (processedCount > 0) {
                await this.userTriggerService.updateLastExecutionTime(workflow.id, 'user_created');
              }
            } catch (error) {
              console.error(`Error processing user creation triggers for workflow ${workflow.id}:`, error);
              errorCount++;
            }
          }
        } catch (error) {
          console.error('Error in user creation triggers section:', error);
          errorCount++;
        }
      }

    } catch (error) {
      console.error('Error in cron job:', error);
      errorCount++;
    }

    // Process delayed executions
    await this.processDelayedExecutions();

    // Record execution statistics
    const executionTime = Date.now() - startTime;
    this.lastExecutionTime = new Date();
    this.executionHistory.push({
      timestamp: this.lastExecutionTime,
      workflowsProcessed: successCount + errorCount,
      successCount,
      errorCount,
      executionTime
    });

    // Keep only last 10 executions in history
    if (this.executionHistory.length > 10) {
      this.executionHistory = this.executionHistory.slice(-10);
    }

  }

  /**
   * Get active trigger types by checking which workflows exist for each trigger type
   * This prevents processing triggers when no workflows are configured for them
   * Uses caching to avoid checking on every cron run
   */
  private async getActiveTriggerTypes(): Promise<string[]> {
    // Check if cache is still valid
    const now = new Date();
    if (this.lastTriggerTypesCheck &&
        (now.getTime() - this.lastTriggerTypesCheck.getTime()) < this.TRIGGER_TYPES_CACHE_TTL) {
      return this.activeTriggerTypesCache;
    }

    try {
      const workflows = await this.workflowService.findAllWithJsonLogic();
      const activeTriggerTypes = new Set<string>();

      for (const workflow of workflows) {
        const rule = workflow.jsonLogic;
        if (!rule) continue;

        // Check for parallel trigger structure
        if (rule.parallel && rule.parallel.trigger && rule.parallel.trigger.trigger) {
          activeTriggerTypes.add(rule.parallel.trigger.trigger.event);
        }

        // Check for 'and' trigger structure (new format)
        if (rule.and && Array.isArray(rule.and)) {
          for (const condition of rule.and) {
            if (condition && condition.trigger && condition.trigger.event) {
              activeTriggerTypes.add(condition.trigger.event);
            }
          }
        }

        // Check for direct trigger structure
        if (rule.trigger && rule.trigger.event) {
          activeTriggerTypes.add(rule.trigger.event);
        }
      }

      // Update cache
      this.activeTriggerTypesCache = Array.from(activeTriggerTypes);
      this.lastTriggerTypesCheck = now;

      return this.activeTriggerTypesCache;
    } catch (error) {
      console.error('Error getting active trigger types:', error);
      return this.activeTriggerTypesCache; // Return cached value on error
    }
  }

  /**
   * Check if a user has a recent execution for a workflow (within last 24 hours)
   */
  private async hasRecentExecution(workflowId: string, userId: string): Promise<boolean> {
    try {
      // Check if there's a recent execution for this user and workflow
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Query the database for recent executions
      const recentExecutions = await this.workflowService.findRecentExecutions(workflowId, userId, twentyFourHoursAgo);

      return recentExecutions.length > 0;
    } catch (error) {
      console.error('Error checking for recent executions:', error);
      // If there's an error checking, allow execution to proceed
      return false;
    }
  }

  /**
   * Get workflows that match a specific trigger type
   * This is more efficient than loading all workflows and filtering
   */
  private async getWorkflowsForTriggerType(eventType: string): Promise<Array<{ id: string; name: string; jsonLogic: any }>> {
    try {
      const workflows = await this.workflowService.findAllWithJsonLogic();
      return workflows.filter(wf => {
        const rule = wf.jsonLogic;
        if (!rule) return false;

        // Check for parallel trigger structure
        if (rule.parallel && rule.parallel.trigger && rule.parallel.trigger.trigger) {
          return rule.parallel.trigger.trigger.event === eventType;
        }

        // Check for 'and' trigger structure (new format)
        if (rule.and && Array.isArray(rule.and)) {
          for (const condition of rule.and) {
            if (condition && condition.trigger && condition.trigger.event === eventType) {
              return true;
            }
          }
        }

        // Check for 'if' trigger structure (if-else format)
        if (rule.if && Array.isArray(rule.if)) {
          // Look for trigger in the if-else structure
          for (const branch of rule.if) {
            if (branch && branch.and && Array.isArray(branch.and)) {
              for (const condition of branch.and) {
                if (condition && condition.trigger && condition.trigger.event === eventType) {
                  return true;
                }
              }
            }
            // Also check direct trigger in if branches
            if (branch && branch.trigger && branch.trigger.event === eventType) {
              return true;
            }
          }
        }

        // Check for direct trigger structure
        if (rule.trigger && rule.trigger.event === eventType) {
          return true;
        }

        return false;
      });
    } catch (error) {
      console.error(`Error getting workflows for trigger type ${eventType}:`, error);
      return [];
    }
  }

  /**
   * Process a trigger event by finding matching workflows and executing them
   */
  private async processTriggerEvent(trigger: any, eventType: string, workflowId: string): Promise<void> {
    try {
      const executionId = `cron-${workflowId}-${trigger.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const context: WorkflowExecutionContext = {
        executionId,
        workflowId: workflowId,
        triggerType: eventType,
        triggerId: trigger.id,
        userId: trigger.userId,
        triggerData: trigger.data,
        data: trigger.data,
        metadata: {
          source: 'cron',
          timestamp: new Date(),
          userId: trigger.userId,
          workflowId: workflowId,
          eventType
        },
        createdAt: new Date()
      };

      // Get the workflow definition using findAllWithJsonLogic to match the ID format
      const workflows = await this.workflowService.findAllWithJsonLogic();
      const workflow = workflows.find(wf => wf.id === workflowId);

      if (!workflow) {
        console.error(`Workflow ${workflowId} not found`);
        return;
      }

      if (!workflow.jsonLogic) {
        console.error(`Workflow ${workflowId} has no JsonLogic rule`);
        return;
      }

      // Convert JsonLogic rule to WorkflowDefinition format
      const workflowDefinition = this.convertJsonLogicToWorkflowDefinition(workflow.jsonLogic, workflow.id, workflow.id, workflow.name);

      const result = await this.workflowOrchestrationEngine.executeWorkflow(workflowDefinition, context);

      if (result.success) {

        // Mark trigger as processed to prevent duplicate processing
        try {
          if (eventType === 'user_buys_subscription') {
            await this.subscriptionTriggerService.markAsProcessed(trigger.id);
          } else if (eventType === 'newsletter_subscribed') {
            await this.newsletterTriggerService.markAsProcessed(trigger.id);
          }
        } catch (markError) {
          console.error(`Error marking trigger ${trigger.id} as processed:`, markError);
        }
      }
    } catch (error) {
      console.error(`Error executing workflow ${workflowId} for user ${trigger.userId}:`, error);
    }
  }

  /**
   * Process delayed executions that are ready to run
   */
  private async processDelayedExecutions(): Promise<void> {
    const now = new Date();

    try {
      // Use the workflow service to process delayed executions
      await this.workflowService.processDelayedExecutions();
    } catch (error) {
      console.error('Error in processDelayedExecutions:', error);
    }
  }

  /**
   * Get cron job status and statistics
   */
  getCronStatus(): {
    isRunning: boolean;
    lastExecutionTime: Date | null;
    executionHistory: Array<{
      timestamp: Date;
      workflowsProcessed: number;
      successCount: number;
      errorCount: number;
      executionTime: number;
    }>;
    nextExecutionTime: Date;
    schedule: string;
  } {
    const now = new Date();
    const nextExecutionTime = new Date(now.getTime() + 60000); // Next minute

    return {
      isRunning: true, // Cron is always "running" if the service is up
      lastExecutionTime: this.lastExecutionTime,
      executionHistory: this.executionHistory,
      nextExecutionTime,
      schedule: 'Every minute (* * * * *)'
    };
  }

  /**
   * Get detailed cron job metrics
   */
  getCronMetrics(): {
    totalExecutions: number;
    averageExecutionTime: number;
    successRate: number;
    totalWorkflowsProcessed: number;
    last24Hours: {
      executions: number;
      totalWorkflows: number;
      averageTime: number;
      successRate: number;
    };
  } {
    const totalExecutions = this.executionHistory.length;
    const totalWorkflows = this.executionHistory.reduce((sum, exec) => sum + exec.workflowsProcessed, 0);
    const totalTime = this.executionHistory.reduce((sum, exec) => sum + exec.executionTime, 0);
    const totalSuccess = this.executionHistory.reduce((sum, exec) => sum + exec.successCount, 0);
    const totalErrors = this.executionHistory.reduce((sum, exec) => sum + exec.errorCount, 0);

    const averageExecutionTime = totalExecutions > 0 ? totalTime / totalExecutions : 0;
    const successRate = totalWorkflows > 0 ? (totalSuccess / totalWorkflows) * 100 : 0;

    // Last 24 hours (assuming executions are recent)
    const last24Hours = {
      executions: totalExecutions,
      totalWorkflows,
      averageTime: averageExecutionTime,
      successRate
    };

    return {
      totalExecutions,
      averageExecutionTime,
      successRate,
      totalWorkflowsProcessed: totalWorkflows,
      last24Hours
    };
  }


  /**
   * Convert JsonLogic rule to WorkflowDefinition format
   */
  private convertDelayTypeToMs(delayType: string): number {
    if (!delayType) return 1000; // Default 1 second

    const delayMap: { [key: string]: number } = {
      '1_second': 1000,
      '5_seconds': 5000,
      '10_seconds': 10000,
      '30_seconds': 30000,
      '1_minute': 60000,
      '2_minutes': 120000,
      '5_minutes': 300000,
      '10_minutes': 600000,
      '30_minutes': 1800000,
      '1_hour': 3600000,
      '2_hours': 7200000,
      '6_hours': 21600000,
      '12_hours': 43200000,
      '1_day': 86400000,
      '2_days': 172800000,
      '3_days': 259200000,
      '5_days': 432000000,
      '1_week': 604800000,
      '2_weeks': 1209600000,
      '1_month': 2592000000
    };

    return delayMap[delayType] || 1000; // Default to 1 second if not found
  }

  private convertJsonLogicToWorkflowDefinition(jsonLogicRule: any, workflowId: string, workflowUuid: string, workflowName: string) {
    // This is a simplified conversion - in a real system, you'd have a proper converter
    let steps: any[] = [];

    // Handle different JsonLogic structures
    if (jsonLogicRule.steps) {
      // Direct steps array
      steps = jsonLogicRule.steps.map((step: any, index: number) => ({
        id: `step_${index}`,
        type: step.type || 'action',
        data: step,
        rule: step
      }));
    } else if (jsonLogicRule.and && Array.isArray(jsonLogicRule.and)) {
      // Direct 'and' structure - process each action as a separate step
      const actions = jsonLogicRule.and;
      steps = actions.map((action: any, actionIndex: number) => {
        // Determine step type and action details based on action keys
        let stepType = 'action';
        let actionType = 'custom';
        let actionName = 'custom_step';

        if (action.delay) {
          stepType = 'delay';
          actionType = 'delay';
          actionName = 'delay_step';
          // Add required delay fields for validation
          action.type = action.delay.type || '1_day';
          action.delayMs = this.convertDelayTypeToMs(action.delay.type);
        } else if (action.send_email || action['Send Mail'] || action['send_mail']) {
          stepType = 'action';
          actionType = 'send_email';
          actionName = 'send_email_step';
          // Add required email fields for validation
          const emailData = action.send_email || action['Send Mail'] || action['send_mail'];
          if (emailData) {
            action.templateId = emailData.data?.templateId || 'welcome_email';
            action.subject = emailData.data?.subject || 'Welcome to our service!';
            action.to = emailData.data?.to || 'user@example.com';
          }
        } else if (action.send_sms) {
          stepType = 'action';
          actionType = 'send_sms';
          actionName = 'send_sms_step';
        } else if (action.condition || action.if) {
          stepType = 'condition';
          actionType = 'custom';
          actionName = 'condition_step';
          // Add required condition fields for validation
          if (action.condition) {
            action.conditionType = action.condition.conditionType || 'custom_field';
            action.conditionValue = action.condition.conditionValue || action.condition;
            action.operator = action.condition.operator || 'equals';
          }
        } else if (action['=='] && Array.isArray(action['==']) && action['=='].length === 2) {
          // Handle JsonLogic condition like {"==": [{"var": "user.preferences.notifications"}, true]}
          stepType = 'condition';
          actionType = 'custom';
          actionName = 'condition_step';

          const [varPath, value] = action['=='];
          if (varPath && varPath.var) {
            const fieldPath = varPath.var;
            action.conditionType = 'user_condition';
            action.conditionValue = {
              field: fieldPath,
              value: value
            };
            action.operator = 'equals';
          }
        } else if (action.sharedFlow) {
          stepType = 'shared-flow';
          actionType = 'custom';
          actionName = 'shared_flow_step';
          // Add required flowName for shared flow validation
          action.flowName = action.sharedFlow.name || 'default_flow';
        } else if (action.end) {
          stepType = 'end';
          actionType = 'custom';
          actionName = 'end_step';
        } else {
          // For any other action, use 'custom' as the action type
          stepType = 'action';
          actionType = 'custom';
          actionName = 'custom_step';
        }

        return {
          id: `step_${actionIndex}`,
          type: stepType,
          data: {
            ...action,
            actionType,
            actionName
          },
          rule: action
        };
      });
    } else if (jsonLogicRule.parallel && jsonLogicRule.parallel.branches) {
      // Parallel structure with branches
      steps = jsonLogicRule.parallel.branches.map((branch: any, index: number) => {
        // Extract all actions from the branch
        const actions = branch.and || branch.or || [branch];

        // Process each action in the branch as a separate step
        return actions.map((action: any, actionIndex: number) => {
          // Determine step type and action details based on action keys
          let stepType = 'action';
          let actionType = 'custom';
          let actionName = 'custom_step';

          if (action.delay) {
            stepType = 'delay';
            actionType = 'delay';
            actionName = 'delay_step';
            // Add required delay fields for validation
            action.type = action.delay.type || '1_day';
            action.delayMs = this.convertDelayTypeToMs(action.delay.type);
          } else if (action.send_email || action['Send Mail'] || action['send_mail']) {
            stepType = 'action';
            actionType = 'send_email';
            actionName = 'send_email_step';
            // Add required email fields for validation
            const emailData = action.send_email || action['Send Mail'] || action['send_mail'];
            if (emailData && emailData.data) {
              action.templateId = emailData.data.templateId;
              action.subject = emailData.data.subject;
              action.to = emailData.data.to || 'user@example.com';
            }
          } else if (action.send_sms) {
            stepType = 'action';
            actionType = 'send_sms';
            actionName = 'send_sms_step';
          } else if (action.condition || action.if) {
            stepType = 'condition';
            actionType = 'custom';
            actionName = 'condition_step';
            // Add required condition fields for validation
            if (action.condition) {
              action.conditionType = action.condition.conditionType || 'custom_field';
              action.conditionValue = action.condition.conditionValue || action.condition;
              action.operator = action.condition.operator || 'equals';
            }
          } else if (action['=='] && Array.isArray(action['==']) && action['=='].length === 2) {
            // Handle JsonLogic condition like {"==": [{"var": "user.preferences.notifications"}, true]}
            stepType = 'condition';
            actionType = 'custom';
            actionName = 'condition_step';

            const [varPath, value] = action['=='];
            if (varPath && varPath.var) {
              const fieldPath = varPath.var;
              action.conditionType = 'user_condition';
              action.conditionValue = {
                field: fieldPath,
                value: value
              };
              action.operator = 'equals';
            }
          } else if (action.sharedFlow) {
            stepType = 'shared-flow';
            actionType = 'custom';
            actionName = 'shared_flow_step';
            // Add required flowName for shared flow validation
            action.flowName = action.sharedFlow.name || 'default_flow';
          } else if (action.end) {
            stepType = 'end';
            actionType = 'custom';
            actionName = 'end_step';
          } else {
            // For any other action, use 'custom' as the action type
            stepType = 'action';
            actionType = 'custom';
            actionName = 'custom_step';
          }

          return {
            id: `step_${index}_${actionIndex}`,
            type: stepType,
            data: {
              ...action,
              actionType,
              actionName
            },
            rule: action
          };
        });
      }).flat(); // Flatten the array since we're now creating multiple steps per branch
    }

    return {
      id: workflowUuid,
      name: workflowName,
      description: `${workflowName} converted from JsonLogic`,
      version: '1.0.0',
      metadata: {
        source: 'cron',
        convertedAt: new Date().toISOString(),
        originalRule: jsonLogicRule
      },
      steps
    };
  }



}
