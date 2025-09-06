import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../../database/entities/workflow-delay.entity';
import { DummyDataService } from '../../services/dummy-data.service';
import { EmailService } from '../../services/email.service';
import { SubscriptionTriggerService } from '../../services/subscription-trigger.service';
import { NewsletterTriggerService } from '../../services/newsletter-trigger.service';
import { SharedFlowService } from '../../services/shared-flow.service';
import { WorkflowActionService } from '../../services/workflow-action.service';
import { WorkflowStateMachineService } from '../state-machine/workflow-state-machine';
import {
  WorkflowExecutionContext,
  WorkflowDefinition,
  WorkflowStep,
  ActionExecutionParams,
  ActionExecutionResult,
  DelayConfig
} from '../types';

@Injectable()
export class WorkflowExecutionEngine {
  private readonly logger = new Logger(WorkflowExecutionEngine.name);

  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowDelay)
    private readonly delayRepository: Repository<WorkflowDelay>,
    private readonly dummyDataService: DummyDataService,
    private readonly emailService: EmailService,
    private readonly subscriptionTriggerService: SubscriptionTriggerService,
    private readonly newsletterTriggerService: NewsletterTriggerService,
    private readonly sharedFlowService: SharedFlowService,
    private readonly workflowActionService: WorkflowActionService,
    private readonly stateMachineService: WorkflowStateMachineService,
  ) {}

  // Main batch processing - runs every 30 seconds
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processBatchWorkflows(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Starting batch workflow processing...');

    try {
      // Process subscription workflows
      await this.processSubscriptionWorkflows();

      // Process newsletter workflows
      await this.processNewsletterWorkflows();

      // Process delayed executions
      await this.processDelayedExecutions();

      const processingTime = Date.now() - startTime;
      this.logger.log(`Batch processing completed in ${processingTime}ms`);

    } catch (error) {
      this.logger.error('Batch workflow processing failed:', error);
    }
  }

  // Process delayed executions - runs every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async processDelayedExecutions(): Promise<void> {
    const now = new Date();

    const pendingDelays = await this.delayRepository.find({
      where: {
        status: 'pending',
        executeAt: LessThan(now)
      }
    });

    this.logger.log(`Processing ${pendingDelays.length} delayed executions`);

    for (const delay of pendingDelays) {
      try {
        await this.resumeWorkflowExecution(delay);
        await this.delayRepository.update(delay.id, {
          status: 'executed',
          executedAt: new Date()
        });
      } catch (error) {
        this.logger.error(`Failed to resume delayed execution ${delay.executionId}:`, error);
        await this.delayRepository.update(delay.id, {
          status: 'failed',
          error: error.message
        });
      }
    }
  }


  private async processNewsletterWorkflows(): Promise<void> {
    const triggerData = await this.newsletterTriggerService.retrieveTriggerData(30);

    if (triggerData.length === 0) {
      this.logger.debug('No new newsletter triggers to process');
      return;
    }

    this.logger.log(`Processing ${triggerData.length} newsletter workflows`);

    for (const trigger of triggerData) {
      try {
        const context = await this.newsletterTriggerService.processTrigger(trigger);
        await this.executeWorkflowFromContext(context);
        await this.newsletterTriggerService.markAsProcessed(trigger.id);
      } catch (error) {
        this.logger.error(`Failed to process newsletter trigger ${trigger.id}:`, error);
      }
    }
  }

  async executeSubscriptionWorkflow(subscription: any): Promise<void> {
    const workflowId = this.determineWorkflowId(subscription.product);
    const executionId = uuidv4();

    this.logger.log(`Executing workflow ${workflowId} for subscription ${subscription.id}`);

    // Create execution context
    const context: WorkflowExecutionContext = {
      executionId,
      workflowId,
      triggerType: 'subscription_created',
      triggerId: subscription.id,
      userId: subscription.userId,
      triggerData: subscription,
      metadata: {
        product: subscription.product,
        userEmail: subscription.user?.email,
        userName: subscription.user?.name,
        subscriptionId: subscription.id
      },
      createdAt: new Date()
    };

    // Get workflow definition
    const workflow = this.getWorkflowDefinition(workflowId);

    // Create execution record
    const execution = await this.createExecutionRecord(workflowId, context, workflow);

    // Execute workflow
    await this.executeWorkflow(workflow as WorkflowDefinition, context, execution);
  }

  async executeWorkflowFromContext(context: WorkflowExecutionContext): Promise<void> {
    this.logger.log(`Executing workflow ${context.workflowId} for execution ${context.executionId}`);

    // Get workflow definition
    const workflow = this.getWorkflowDefinition(context.workflowId);

    // Create execution record
    const execution = await this.createExecutionRecord(context.workflowId, context, workflow);

    // Execute workflow
    await this.executeWorkflow(workflow as WorkflowDefinition, context, execution);
  }

  private async executeWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<void> {
    try {
      // Create state machine
      const stateMachine = this.stateMachineService.createMachine(
        context.executionId,
        workflow.steps,
        context
      );

      // Start the state machine
      stateMachine.start();
      stateMachine.send({ type: 'START' });

      // Execute each step
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];

        try {
          await this.executeStep(step, context, execution);

          // Update state machine
          stateMachine.send({
            type: 'STEP_COMPLETED',
            stepId: step.id,
            result: { success: true }
          });

          // Update execution record
          await this.updateExecutionState(execution.id, {
            currentStep: step.id,
            state: {
              currentState: 'running',
              context: context.metadata,
              history: [
                ...execution.state.history,
                {
                  stepId: step.id,
                  state: 'completed',
                  timestamp: new Date(),
                  result: { success: true }
                }
              ]
            }
          });

        } catch (error) {
          this.logger.error(`Step ${step.id} failed:`, error);

          // Update state machine
          stateMachine.send({
            type: 'STEP_FAILED',
            stepId: step.id,
            error: error.message
          });

          // Update execution record
          await this.updateExecutionState(execution.id, {
            currentStep: step.id,
            state: {
              currentState: 'failed',
              context: context.metadata,
              history: [
                ...execution.state.history,
                {
                  stepId: step.id,
                  state: 'failed',
                  timestamp: new Date(),
                  error: error.message
                }
              ]
            }
          });

          throw error;
        }
      }

      // Mark as completed
      await this.updateExecutionStatus(execution.id, 'completed');
      this.logger.log(`Workflow ${workflow.id} completed successfully`);

    } catch (error) {
      this.logger.error(`Workflow ${workflow.id} failed:`, error);
      await this.updateExecutionStatus(execution.id, 'failed', error.message);
      throw error;
    }
  }

  private async executeStep(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<void> {
    this.logger.debug(`Executing step: ${step.type} (${step.id})`);

    switch (step.type) {
      case 'trigger':
        // Trigger steps are handled by the trigger system
        break;

      case 'condition':
        await this.executeCondition(step, context);
        break;

      case 'action':
        await this.executeAction(step, context, execution);
        break;

      case 'delay':
        await this.executeDelay(step, context, execution);
        break;

      case 'shared-flow':
        await this.executeSharedFlow(step, context);
        break;

      case 'end':
        await this.executeEnd(step, context);
        break;

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeCondition(step: WorkflowStep, context: WorkflowExecutionContext): Promise<void> {
    const { conditionType, conditionValue, operator } = step.data;

    let matches = false;

    switch (conditionType) {
      case 'product_package':
        if (operator === 'equals') {
          matches = context.metadata.product === conditionValue;
        } else if (operator === 'not_equals') {
          matches = context.metadata.product !== conditionValue;
        } else if (operator === 'in') {
          const values = conditionValue.split(',').map(v => v.trim());
          matches = values.includes(context.metadata.product);
        } else if (operator === 'not_in') {
          const values = conditionValue.split(',').map(v => v.trim());
          matches = !values.includes(context.metadata.product);
        }
        break;

      case 'newsletter_status':
        matches = context.triggerData.status === conditionValue;
        break;

      default:
        this.logger.warn(`Unknown condition type: ${conditionType}`);
    }

    if (!matches) {
      this.logger.debug(`Condition not met: ${conditionType} ${operator} ${conditionValue}`);
      throw new Error(`Condition not met: ${conditionType} ${operator} ${conditionValue}`);
    }

    this.logger.debug(`Condition met: ${conditionType} ${operator} ${conditionValue}`);
  }

  private async executeAction(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<void> {
    const { actionType, actionName, actionData } = step.data;

    this.logger.debug(`Executing action: ${actionType} (${actionName})`);

    const actionParams: ActionExecutionParams = {
      actionType,
      actionName,
      actionData,
      context,
      executionId: context.executionId,
      stepId: step.id
    };

    const result = await this.workflowActionService.executeAction(actionParams);

    if (!result.success) {
      throw new Error(`Action execution failed: ${result.error}`);
    }

    this.logger.log(`Action ${actionType} executed successfully: ${actionName}`);
  }

  private async executeEmailAction(
    actionData: any,
    context: WorkflowExecutionContext,
    executionId: string,
    stepId: string
  ): Promise<void> {
    const result = await this.emailService.sendEmail({
      to: context.metadata.userEmail,
      subject: actionData.subject,
      templateId: actionData.templateId,
      data: {
        userName: context.metadata.userName,
        product: context.metadata.product,
        ...actionData.data
      },
      executionId,
      stepId
    });

    if (!result.success) {
      throw new Error(`Email sending failed: ${result.error}`);
    }

    this.logger.log(`Email sent successfully to ${context.metadata.userEmail}`);
  }

  private async executeSmsAction(
    actionData: any,
    context: WorkflowExecutionContext,
    executionId: string,
    stepId: string
  ): Promise<void> {
    // Mock SMS implementation
    this.logger.log(`[MOCK] SMS would be sent to ${context.metadata.phoneNumber}: ${actionData.message}`);
  }

  private async executeWebhookAction(
    actionData: any,
    context: WorkflowExecutionContext,
    executionId: string,
    stepId: string
  ): Promise<void> {
    // Mock webhook implementation
    this.logger.log(`[MOCK] Webhook would be triggered: ${actionData.url}`);
  }

  private async executeDelay(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<void> {
    const delayMs = this.parseDelay(step.data.delayType);

    if (delayMs > 0) {
      // Schedule delay
      await this.scheduleDelay({
        executionId: execution.id,
        stepId: step.id,
        delayType: 'fixed',
        delayMs,
        context,
        resumeAfter: new Date(Date.now() + delayMs)
      });

      // Update execution status to delayed
      await this.updateExecutionStatus(execution.id, 'delayed');

      this.logger.log(`Delay scheduled for ${delayMs}ms`);

      // Throw error to pause execution
      throw new Error('DELAY_SCHEDULED');
    }
  }

  private async executeSharedFlow(step: WorkflowStep, context: WorkflowExecutionContext): Promise<void> {
    const { flowName } = step.data;
    this.logger.log(`Executing shared flow: ${flowName}`);

    const result = await this.sharedFlowService.executeSharedFlow(
      flowName,
      context,
      context.executionId
    );

    if (!result.success) {
      throw new Error(`Shared flow execution failed: ${result.error}`);
    }

    this.logger.log(`Shared flow ${flowName} executed successfully`);
  }

  private async executeEnd(step: WorkflowStep, context: WorkflowExecutionContext): Promise<void> {
    this.logger.log(`Workflow ended: ${step.data.endReason || 'completed'}`);
  }

  private async scheduleDelay(config: DelayConfig): Promise<void> {
    const delay = this.delayRepository.create({
      executionId: config.executionId,
      stepId: config.stepId,
      delayType: config.delayType,
      delayMs: config.delayMs,
      scheduledAt: new Date(),
      executeAt: config.resumeAfter,
      status: 'pending',
      context: config.context
    });

    await this.delayRepository.save(delay);
  }

  private async resumeWorkflowExecution(delay: WorkflowDelay): Promise<void> {
    const execution = await this.executionRepository.findOne({
      where: { id: delay.executionId }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${delay.executionId}`);
    }

    // Resume workflow from the delayed step
    const workflow = execution.workflowDefinition;
    const stepIndex = workflow.steps.findIndex(s => s.id === delay.stepId);

    if (stepIndex === -1) {
      throw new Error(`Step not found: ${delay.stepId}`);
    }

    // Continue from the next step
    const remainingSteps = workflow.steps.slice(stepIndex + 1);

    for (const step of remainingSteps) {
      try {
        await this.executeStep(step, delay.context as WorkflowExecutionContext, execution);
      } catch (error) {
        if (error.message === 'DELAY_SCHEDULED') {
          // Another delay was scheduled, stop here
          return;
        }
        throw error;
      }
    }

    // Mark as completed if no more steps
    await this.updateExecutionStatus(execution.id, 'completed');
  }

  private determineWorkflowId(product: string): string {
    const workflowMap = {
      'united': 'segmented-welcome-flow',
      'podcast': 'segmented-welcome-flow',
      'newsletter': 'newsletter-welcome-flow',
      'default': 'generic-welcome-flow'
    };

    return workflowMap[product] || workflowMap['default'];
  }

  private getWorkflowDefinition(workflowId: string): WorkflowDefinition {
    // In a real implementation, this would fetch from database
    const workflows = {
      'segmented-welcome-flow': {
        id: 'segmented-welcome-flow',
        name: 'Segmented Welcome Flow',
        description: 'Welcome flow with product-specific branching',
        version: '1.0.0',
        steps: [
          {
            id: 'trigger',
            type: 'trigger' as const,
            data: { event: 'subscription_created' }
          },
          {
            id: 'condition_united',
            type: 'condition' as const,
            data: {
              conditionType: 'product_package',
              conditionValue: 'united',
              operator: 'equals'
            }
          },
          {
            id: 'action_united_email',
            type: 'action' as const,
            data: {
              actionType: 'send_email',
              actionName: 'United Welcome Email',
              actionData: {
                subject: 'Welcome to United! 🪅',
                templateId: 'united_welcome'
              }
            }
          },
          {
            id: 'condition_podcast',
            type: 'condition' as const,
            data: {
              conditionType: 'product_package',
              conditionValue: 'podcast',
              operator: 'equals'
            }
          },
          {
            id: 'action_podcast_email',
            type: 'action' as const,
            data: {
              actionType: 'send_email',
              actionName: 'Podcast Welcome Email',
              actionData: {
                subject: 'Welcome to the Podcast! 🎧',
                templateId: 'podcast_welcome'
              }
            }
          },
          {
            id: 'action_generic_email',
            type: 'action' as const,
            data: {
              actionType: 'send_email',
              actionName: 'Generic Welcome Email',
              actionData: {
                subject: 'Welcome! 🎉',
                templateId: 'generic_welcome'
              }
            }
          },
          {
            id: 'shared_flow',
            type: 'shared-flow' as const,
            data: {
              flowName: 'Welcome Follow-up Flow',
              description: 'All branches merge into this shared follow-up sequence'
            }
          },
          {
            id: 'delay_1',
            type: 'delay' as const,
            data: {
              delayType: '2_days'
            }
          },
          {
            id: 'action_engagement',
            type: 'action' as const,
            data: {
              actionType: 'send_email',
              actionName: 'Engagement Nudge Email',
              actionData: {
                subject: 'Getting Started Tips 💡',
                templateId: 'engagement_nudge'
              }
            }
          },
          {
            id: 'delay_2',
            type: 'delay' as const,
            data: {
              delayType: '5_days'
            }
          },
          {
            id: 'action_value',
            type: 'action' as const,
            data: {
              actionType: 'send_email',
              actionName: 'Value Highlight Email',
              actionData: {
                subject: 'Discover Your Key Benefits ✨',
                templateId: 'value_highlight'
              }
            }
          },
          {
            id: 'end',
            type: 'end' as const,
            data: {
              endReason: 'completed'
            }
          }
        ],
        metadata: {}
      },
      'newsletter-welcome-flow': {
        id: 'newsletter-welcome-flow',
        name: 'Newsletter Welcome Flow',
        description: 'Welcome flow for newsletter subscribers',
        version: '1.0.0',
        steps: [
          {
            id: 'trigger',
            type: 'trigger' as const,
            data: { event: 'newsletter_subscribed' }
          },
          {
            id: 'action_welcome',
            type: 'action' as const,
            data: {
              actionType: 'send_email',
              actionName: 'Newsletter Welcome Email',
              actionData: {
                subject: 'Welcome to Our Newsletter! 📧',
                templateId: 'newsletter_welcome'
              }
            }
          },
          {
            id: 'end',
            type: 'end' as const,
            data: {
              endReason: 'completed'
            }
          }
        ],
        metadata: {}
      }
    };

    return workflows[workflowId] || workflows['generic-welcome-flow'];
  }

  private parseDelay(delayType: string): number {
    const delayMap = {
      '2_days': 2 * 24 * 60 * 60 * 1000, // 2 days in ms
      '5_days': 5 * 24 * 60 * 60 * 1000, // 5 days in ms
      '1_week': 7 * 24 * 60 * 60 * 1000, // 1 week in ms
      '1_month': 30 * 24 * 60 * 60 * 1000, // 1 month in ms
      '15_seconds': 15 * 1000, // 15 seconds for testing
      '1_minute': 60 * 1000 // 1 minute for testing
    };

    return delayMap[delayType] || 0;
  }

  private async createExecutionRecord(
    workflowId: string,
    context: WorkflowExecutionContext,
    workflow: WorkflowDefinition
  ): Promise<WorkflowExecution> {
    const execution = this.executionRepository.create({
      executionId: context.executionId,
      workflowId,
      triggerType: context.triggerType,
      triggerId: context.triggerId,
      userId: context.userId,
      status: 'running',
      currentStep: 'start',
      state: {
        currentState: 'running',
        context: context.metadata,
        history: []
      },
      workflowDefinition: workflow,
      retryCount: 0,
      metadata: context.metadata
    });

    return await this.executionRepository.save(execution);
  }

  private async updateExecutionStatus(
    executionId: string,
    status: string,
    error?: string
  ): Promise<void> {
    const updateData: any = { status };

    if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'failed') {
      updateData.failedAt = new Date();
      updateData.error = error;
    }

    await this.executionRepository.update(executionId, updateData);
  }

  private async updateExecutionState(
    executionId: string,
    state: any
  ): Promise<void> {
    await this.executionRepository.update(executionId, state);
  }

  // Manual trigger for testing
  async triggerWorkflowForSubscription(subscriptionId: string): Promise<void> {
    const subscription = await this.dummyDataService.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['user', 'subscriptionType']
    });

    if (subscription) {
      await this.executeSubscriptionWorkflow(subscription);
    }
  }

  // Newsletter workflow execution
  async executeNewsletterWorkflow(newsletter: any): Promise<void> {
    this.logger.log(`Executing newsletter workflow for: ${newsletter.email}`);
    // Implementation for newsletter workflow
  }

  // Process subscription workflows (public method)
  async processSubscriptionWorkflows(): Promise<void> {
    this.logger.log('Processing subscription workflows...');
    // Implementation for processing workflows
  }

  // Get execution status
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution | null> {
    return await this.executionRepository.findOne({
      where: { executionId }
    });
  }

  // Get all executions
  async getAllExecutions(): Promise<WorkflowExecution[]> {
    return await this.executionRepository.find({
      order: { createdAt: 'DESC' },
      take: 100
    });
  }

  // Workflow Control Methods
  async startWorkflow(executionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const execution = await this.executionRepository.findOne({
        where: { executionId }
      });

      if (!execution) {
        return { success: false, message: 'Execution not found' };
      }

      if (execution.status === 'running') {
        return { success: false, message: 'Workflow is already running' };
      }

      // Update status to running
      await this.updateExecutionStatus(execution.id, 'running');

      // Resume workflow execution
      const workflow = execution.workflowDefinition;
      const context: WorkflowExecutionContext = {
        executionId: execution.executionId,
        workflowId: execution.workflowId,
        triggerType: execution.triggerType,
        triggerId: execution.triggerId,
        userId: execution.userId,
        triggerData: execution.state.context,
        metadata: execution.state.context,
        createdAt: execution.createdAt
      };

      // Continue execution from current step
      await this.executeWorkflow(workflow as WorkflowDefinition, context, execution);

      return { success: true, message: 'Workflow started successfully' };
    } catch (error) {
      this.logger.error(`Failed to start workflow ${executionId}:`, error);
      return { success: false, message: `Failed to start workflow: ${error.message}` };
    }
  }

  async stopWorkflow(executionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const execution = await this.executionRepository.findOne({
        where: { executionId }
      });

      if (!execution) {
        return { success: false, message: 'Execution not found' };
      }

      if (execution.status === 'completed' || execution.status === 'cancelled') {
        return { success: false, message: 'Workflow is not running' };
      }

      // Update status to cancelled
      await this.updateExecutionStatus(execution.id, 'cancelled');

      // Stop state machine if running
      const stateMachine = this.stateMachineService.getMachine(executionId);
      if (stateMachine) {
        stateMachine.send({ type: 'CANCEL' });
      }

      return { success: true, message: 'Workflow stopped successfully' };
    } catch (error) {
      this.logger.error(`Failed to stop workflow ${executionId}:`, error);
      return { success: false, message: `Failed to stop workflow: ${error.message}` };
    }
  }

  async pauseWorkflow(executionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const execution = await this.executionRepository.findOne({
        where: { executionId }
      });

      if (!execution) {
        return { success: false, message: 'Execution not found' };
      }

      if (execution.status !== 'running') {
        return { success: false, message: 'Workflow is not running' };
      }

      // Update status to delayed (paused)
      await this.updateExecutionStatus(execution.id, 'delayed');

      // Schedule resume for later (e.g., 1 hour)
      const resumeAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await this.scheduleDelay({
        executionId: execution.id,
        stepId: execution.currentStep,
        delayType: 'fixed',
        delayMs: 60 * 60 * 1000,
        context: execution.state.context as WorkflowExecutionContext,
        resumeAfter: resumeAt
      });

      return { success: true, message: 'Workflow paused successfully' };
    } catch (error) {
      this.logger.error(`Failed to pause workflow ${executionId}:`, error);
      return { success: false, message: `Failed to pause workflow: ${error.message}` };
    }
  }

  async resumeWorkflow(executionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const execution = await this.executionRepository.findOne({
        where: { executionId }
      });

      if (!execution) {
        return { success: false, message: 'Execution not found' };
      }

      if (execution.status !== 'delayed') {
        return { success: false, message: 'Workflow is not paused' };
      }

      // Resume workflow execution
      const workflow = execution.workflowDefinition;
      const context: WorkflowExecutionContext = {
        executionId: execution.executionId,
        workflowId: execution.workflowId,
        triggerType: execution.triggerType,
        triggerId: execution.triggerId,
        userId: execution.userId,
        triggerData: execution.state.context,
        metadata: execution.state.context,
        createdAt: execution.createdAt
      };

      // Continue execution from current step
      await this.executeWorkflow(workflow as WorkflowDefinition, context, execution);

      return { success: true, message: 'Workflow resumed successfully' };
    } catch (error) {
      this.logger.error(`Failed to resume workflow ${executionId}:`, error);
      return { success: false, message: `Failed to resume workflow: ${error.message}` };
    }
  }

  async cancelWorkflow(executionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const execution = await this.executionRepository.findOne({
        where: { executionId }
      });

      if (!execution) {
        return { success: false, message: 'Execution not found' };
      }

      if (execution.status === 'completed' || execution.status === 'cancelled') {
        return { success: false, message: 'Workflow is already finished' };
      }

      // Update status to cancelled
      await this.updateExecutionStatus(execution.id, 'cancelled');

      // Stop state machine if running
      const stateMachine = this.stateMachineService.getMachine(executionId);
      if (stateMachine) {
        stateMachine.send({ type: 'CANCEL' });
      }

      // Cancel any pending delays
      await this.delayRepository.update(
        { executionId: execution.id },
        { status: 'cancelled' }
      );

      return { success: true, message: 'Workflow cancelled successfully' };
    } catch (error) {
      this.logger.error(`Failed to cancel workflow ${executionId}:`, error);
      return { success: false, message: `Failed to cancel workflow: ${error.message}` };
    }
  }
}

// Helper function for TypeORM
function createLessThanOperator(date: Date) {
  return { $lt: date };
}
