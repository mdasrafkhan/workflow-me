import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WorkflowService } from './workflow.service';
import { WorkflowOrchestrationEngine } from './execution/workflow-orchestration-engine';
import { WorkflowExecutionContext } from './types';
const jsonLogic = require('json-logic-js');

// Mock subscriber data
const mockSubscribers = [
  {
    id: 1,
    email: 'user1@example.com',
    payment: 'paid',
    created_at: new Date('2023-01-01'),
    subscription_package: 'premium',
    subscription_status: 'active',
    newsletter_subscribed: true,
    user_segment: 'new_user'
  },
  {
    id: 2,
    email: 'user2@example.com',
    payment: 'unpaid',
    created_at: new Date('2024-07-01'),
    subscription_package: 'basic',
    subscription_status: 'inactive',
    newsletter_subscribed: false,
    user_segment: 'returning_user'
  },
  {
    id: 3,
    email: 'user3@example.com',
    payment: 'paid',
    created_at: new Date('2024-08-01'),
    subscription_package: 'enterprise',
    subscription_status: 'active',
    newsletter_subscribed: true,
    user_segment: 'premium_user'
  },
];

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

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowOrchestrationEngine: WorkflowOrchestrationEngine
  ) {}

      @Cron('* * * * *') // Runs every minute
  async handleCron() {
    const startTime = Date.now();
    console.log('Executing workflow cron job...');

    // Process workflows using the orchestration engine
    const workflows = await this.workflowService.findAllWithJsonLogic();
    let successCount = 0;
    let errorCount = 0;

    for (const wf of workflows) {
      console.log(`Processing workflow: ${wf.name} (ID: ${wf.id})`);
      try {
        await this.executeWorkflowWithOrchestrationEngine(wf.jsonLogic, wf.id, wf.id, wf.name);
        successCount++;
      } catch (error) {
        console.error(`Error processing workflow ${wf.id}:`, error);
        errorCount++;
      }
    }

    // Process delayed executions (in a real implementation, you'd query the database)
    await this.processDelayedExecutions();

    // Record execution statistics
    const executionTime = Date.now() - startTime;
    this.lastExecutionTime = new Date();
    this.executionHistory.push({
      timestamp: this.lastExecutionTime,
      workflowsProcessed: workflows.length,
      successCount,
      errorCount,
      executionTime
    });

    // Keep only last 10 executions in history
    if (this.executionHistory.length > 10) {
      this.executionHistory = this.executionHistory.slice(-10);
    }

    console.log(`Cron job completed: ${workflows.length} workflows processed, ${successCount} successful, ${errorCount} errors, ${executionTime}ms`);
  }

  /**
   * Process delayed executions that are ready to run
   */
  private async processDelayedExecutions(): Promise<void> {
    const now = new Date();
    console.log(`Checking for delayed executions ready at ${now.toISOString()}`);

    // In a real implementation, you would:
    // 1. Query the database for pending delays where executeAt <= now
    // 2. Execute each delayed workflow step
    // 3. Mark delays as executed

    // For now, just log that we're checking
    console.log('Delayed execution processing would happen here');
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
   * Execute workflow using the orchestration engine
   */
  private async executeWorkflowWithOrchestrationEngine(jsonLogicRule: any, workflowId: string, workflowUuid: string, workflowName: string) {
    console.log(`Workflow ${workflowName} (UUID: ${workflowUuid}, ID: ${workflowId}): Executing with orchestration engine`);
    console.log(`JsonLogic Rule:`, JSON.stringify(jsonLogicRule, null, 2));

    // Process each subscriber with the orchestration engine
    for (const subscriber of mockSubscribers) {
      try {
        const executionId = `cron-${workflowId}-${subscriber.id}-${Date.now()}`;
        const context: WorkflowExecutionContext = {
          executionId,
          workflowId: workflowUuid, // Use workflow UUID instead of name
          triggerType: 'cron',
          triggerId: `cron-${workflowId}`,
          userId: subscriber.id.toString(),
          triggerData: {
            source: 'cron',
            timestamp: new Date(),
            workflowId
          },
          data: subscriber,
          metadata: {
            source: 'cron',
            timestamp: new Date(),
            userId: subscriber.id.toString(),
            workflowId
          },
          createdAt: new Date()
        };

        // Convert JsonLogic rule to WorkflowDefinition format
        const workflowDefinition = this.convertJsonLogicToWorkflowDefinition(jsonLogicRule, workflowId, workflowUuid, workflowName);

        console.log(`Workflow ${workflowId}: Generated workflow definition:`, JSON.stringify(workflowDefinition, null, 2));

        const result = await this.workflowOrchestrationEngine.executeWorkflow(workflowDefinition, context);

        console.log(`Workflow ${workflowId}: Subscriber ${subscriber.id} - Execution result:`, result);

        if (result.success) {
          console.log(`Workflow ${workflowId}: Subscriber ${subscriber.id} - Action executed successfully`);
        }
      } catch (error) {
        console.error(`Workflow ${workflowId}: Orchestration execution error for subscriber ${subscriber.id}:`, error);
      }
    }
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
          } else if (action.send_email) {
            stepType = 'action';
            actionType = 'send_email';
            actionName = 'send_email_step';
            // Add required email fields for validation
            if (action.send_email.data) {
              action.templateId = action.send_email.data.templateId;
              action.subject = action.send_email.data.subject;
              action.to = 'user@example.com'; // Default recipient
            }
          } else if (action.send_sms) {
            stepType = 'action';
            actionType = 'send_sms';
            actionName = 'send_sms_step';
          } else if (action.condition || action.if) {
            stepType = 'condition';
            actionType = 'custom';
            actionName = 'condition_step';
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

  /**
   * Execute workflow using JsonLogic (legacy method - kept for backward compatibility)
   */
  private async executeWorkflowWithJsonLogic(jsonLogicRule: any, workflowId: string) {
    console.log(`Workflow ${workflowId}: Executing with JsonLogic`);
    console.log(`JsonLogic Rule:`, JSON.stringify(jsonLogicRule, null, 2));

    // Process each subscriber with the JsonLogic rule
    for (const subscriber of mockSubscribers) {
      try {
        const result = jsonLogic.apply(jsonLogicRule, subscriber);
        console.log(`Workflow ${workflowId}: Subscriber ${subscriber.id} - Rule result: ${result}`);

        if (result === true || (typeof result === 'object' && result.execute === true)) {
          // Execute the action
          const action = result.action || 'default_action';
          await this.executeAction(action, subscriber, workflowId);
        }
      } catch (error) {
        console.error(`Workflow ${workflowId}: JsonLogic execution error for subscriber ${subscriber.id}:`, error);
      }
    }
  }

  /**
   * Execute action based on JsonLogic result
   */
  private async executeAction(action: string, subscriber: any, workflowId: string) {
    switch (action) {
      case 'delete':
        console.log(`Workflow ${workflowId}: ACTION - Deleting subscriber ${subscriber.id} (${subscriber.email}).`);
        // In a real app, this would call a service to delete the subscriber from the DB.
        break;
      case 'send_mail':
        console.log(`Workflow ${workflowId}: ACTION - Sending email to ${subscriber.email} for subscriber ${subscriber.id}.`);
        // In a real app, this would call an email service.
        break;
      default:
        console.log(`Workflow ${workflowId}: ACTION - Executing default action for subscriber ${subscriber.id}.`);
    }
  }


}
