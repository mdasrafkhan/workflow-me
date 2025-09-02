import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutor } from './execution/WorkflowExecutor';
import { WorkflowExecutionContext } from './execution/types';
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
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutor: WorkflowExecutor
  ) {}

      @Cron('* * * * *') // Runs every minute
  async handleCron() {
    console.log('Executing workflow cron job...');

    // Test JsonLogic first
    const jsonLogicTest = this.workflowExecutor.testJsonLogic();
    console.log(`JsonLogic test result: ${jsonLogicTest}`);

    const workflows = await this.workflowService.findAllWithJsonLogic();
    for (const wf of workflows) {
      console.log(`Processing workflow: ${wf.name} (ID: ${wf.id})`);
      await this.executeWorkflowWithNewEngine(wf.jsonLogic, wf.id);
    }
  }

  /**
   * Execute workflow using the new enhanced execution engine
   */
  private async executeWorkflowWithNewEngine(jsonLogicRule: any, workflowId: number) {
    console.log(`Workflow ${workflowId}: Executing with enhanced engine`);
    console.log(`JsonLogic Rule:`, JSON.stringify(jsonLogicRule, null, 2));

    // Process each subscriber with the enhanced execution engine
    for (const subscriber of mockSubscribers) {
      try {
        const context: WorkflowExecutionContext = {
          data: subscriber,
          metadata: {
            source: 'cron',
            timestamp: new Date(),
            userId: subscriber.id.toString()
          }
        };

        const result = await this.workflowExecutor.executeWorkflow(workflowId, jsonLogicRule, context);

        console.log(`Workflow ${workflowId}: Subscriber ${subscriber.id} - Execution result:`, result);

        if (result.success && result.result?.execute) {
          console.log(`Workflow ${workflowId}: Subscriber ${subscriber.id} - Action executed successfully`);
        }
      } catch (error) {
        console.error(`Workflow ${workflowId}: Enhanced execution error for subscriber ${subscriber.id}:`, error);
      }
    }
  }

  /**
   * Execute workflow using JsonLogic (legacy method - kept for backward compatibility)
   */
  private async executeWorkflowWithJsonLogic(jsonLogicRule: any, workflowId: number) {
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
  private async executeAction(action: string, subscriber: any, workflowId: number) {
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
