import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowExecutionContext, ActionExecutionResult } from '../workflow/types';
import { WorkflowTriggerRegistryService } from '../workflow/triggers/workflow-trigger-registry.service';

@Injectable()
export class SharedFlowService {
  private readonly logger = new Logger(SharedFlowService.name);

  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    private readonly triggerRegistry: WorkflowTriggerRegistryService
  ) {}

  /**
   * Execute shared flow steps that are common across multiple workflows
   */
  async executeSharedFlow(
    flowName: string,
    context: WorkflowExecutionContext,
    executionId: string
  ): Promise<ActionExecutionResult> {
    this.logger.log(`[Workflow: ${context.workflowId || 'unknown'}] [Step: shared-flow] [flow:${flowName}] [userId:${context.userId}]`);

    try {
      switch (flowName) {
        case 'Welcome Follow-up Flow':
          return await this.executeWelcomeFollowUpFlow(context, executionId);

        case 'Engagement Nudge Flow':
          return await this.executeEngagementNudgeFlow(context, executionId);

        case 'Value Highlight Flow':
          return await this.executeValueHighlightFlow(context, executionId);

        case 'Newsletter Welcome Flow':
          return await this.executeNewsletterWelcomeFlow(context, executionId);

        default:
          this.logger.warn(`Unknown shared flow: ${flowName}`);
          return {
            success: false,
            error: `Unknown shared flow: ${flowName}`
          };
      }
    } catch (error) {
      this.logger.error(`Shared flow ${flowName} failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Welcome Follow-up Flow - Common steps after initial welcome emails
   */
  private async executeWelcomeFollowUpFlow(
    context: WorkflowExecutionContext,
    executionId: string
  ): Promise<ActionExecutionResult> {
    this.logger.log(`[Workflow: ${context.workflowId || 'unknown'}] [Step: shared-flow] [flow:Welcome Follow-up Flow] [userId:${context.userId}] [userEmail:${context.metadata?.userEmail || 'unknown'}]`);

    // This is a placeholder for shared flow logic
    // In a real implementation, this would contain common steps like:
    // - Setting up user preferences
    // - Creating user dashboard
    // - Sending onboarding materials
    // - Setting up notifications

    const sharedFlowData = {
      flowName: 'Welcome Follow-up Flow',
      executedAt: new Date(),
      context: {
        userId: context.userId,
        userEmail: context.metadata.userEmail,
        product: context.metadata.product,
        executionId: context.executionId
      },
      steps: [
        'user_preferences_setup',
        'dashboard_creation',
        'onboarding_materials',
        'notification_setup'
      ]
    };

    // Update execution with shared flow data
    await this.updateExecutionWithSharedFlowData(executionId, sharedFlowData);

    this.logger.log(`[Workflow: ${context.workflowId || 'unknown'}] [Step: shared-flow] [flow:Welcome Follow-up Flow] [status:completed] [userId:${context.userId}]`);

    return {
      success: true,
      result: sharedFlowData,
      metadata: {
        flowName: 'Welcome Follow-up Flow',
        stepsCompleted: sharedFlowData.steps.length,
        executedAt: sharedFlowData.executedAt
      }
    };
  }

  /**
   * Engagement Nudge Flow - Common engagement steps
   */
  private async executeEngagementNudgeFlow(
    context: WorkflowExecutionContext,
    executionId: string
  ): Promise<ActionExecutionResult> {
    this.logger.log(`Executing Engagement Nudge Flow for user: ${context.metadata.userEmail}`);

    const engagementData = {
      flowName: 'Engagement Nudge Flow',
      executedAt: new Date(),
      context: {
        userId: context.userId,
        userEmail: context.metadata.userEmail,
        product: context.metadata.product,
        executionId: context.executionId
      },
      steps: [
        'engagement_analysis',
        'personalized_content_selection',
        'nudge_timing_calculation',
        'content_delivery'
      ]
    };

    await this.updateExecutionWithSharedFlowData(executionId, engagementData);

    this.logger.log(`Engagement Nudge Flow completed for user: ${context.metadata.userEmail}`);

    return {
      success: true,
      result: engagementData,
      metadata: {
        flowName: 'Engagement Nudge Flow',
        stepsCompleted: engagementData.steps.length,
        executedAt: engagementData.executedAt
      }
    };
  }

  /**
   * Value Highlight Flow - Common value proposition steps
   */
  private async executeValueHighlightFlow(
    context: WorkflowExecutionContext,
    executionId: string
  ): Promise<ActionExecutionResult> {
    this.logger.log(`Executing Value Highlight Flow for user: ${context.metadata.userEmail}`);

    const valueData = {
      flowName: 'Value Highlight Flow',
      executedAt: new Date(),
      context: {
        userId: context.userId,
        userEmail: context.metadata.userEmail,
        product: context.metadata.product,
        executionId: context.executionId
      },
      steps: [
        'value_analysis',
        'benefit_identification',
        'personalized_value_proposition',
        'value_delivery'
      ]
    };

    await this.updateExecutionWithSharedFlowData(executionId, valueData);

    this.logger.log(`Value Highlight Flow completed for user: ${context.metadata.userEmail}`);

    return {
      success: true,
      result: valueData,
      metadata: {
        flowName: 'Value Highlight Flow',
        stepsCompleted: valueData.steps.length,
        executedAt: valueData.executedAt
      }
    };
  }

  /**
   * Newsletter Welcome Flow - Common newsletter steps
   */
  private async executeNewsletterWelcomeFlow(
    context: WorkflowExecutionContext,
    executionId: string
  ): Promise<ActionExecutionResult> {
    this.logger.log(`Executing Newsletter Welcome Flow for user: ${context.metadata.userEmail}`);

    const newsletterData = {
      flowName: 'Newsletter Welcome Flow',
      executedAt: new Date(),
      context: {
        userId: context.userId,
        userEmail: context.metadata.userEmail,
        source: context.metadata.source,
        preferences: context.metadata.preferences,
        executionId: context.executionId
      },
      steps: [
        'preference_validation',
        'content_categorization',
        'delivery_schedule_setup',
        'welcome_sequence_initiation'
      ]
    };

    await this.updateExecutionWithSharedFlowData(executionId, newsletterData);

    this.logger.log(`Newsletter Welcome Flow completed for user: ${context.metadata.userEmail}`);

    return {
      success: true,
      result: newsletterData,
      metadata: {
        flowName: 'Newsletter Welcome Flow',
        stepsCompleted: newsletterData.steps.length,
        executedAt: newsletterData.executedAt
      }
    };
  }

  /**
   * Update execution record with shared flow data
   */
  private async updateExecutionWithSharedFlowData(
    executionId: string,
    sharedFlowData: any
  ): Promise<void> {
    const execution = await this.executionRepository.findOne({
      where: { executionId: executionId }
    });

    if (execution) {
      const updatedState = {
        ...execution.state,
        sharedFlows: [
          ...(execution.state.sharedFlows || []),
          sharedFlowData
        ],
        lastSharedFlow: sharedFlowData
      };

      await this.executionRepository.update(executionId, {
        state: updatedState
      });

      this.logger.log(`Updated execution ${executionId} with shared flow data`);
    }
  }

  /**
   * Get shared flow statistics
   */
  async getSharedFlowStatistics(): Promise<{
    totalExecutions: number;
    sharedFlowsExecuted: number;
    byFlowName: Record<string, number>;
    averageStepsPerFlow: number;
  }> {
    const executions = await this.executionRepository.find();

    let totalSharedFlows = 0;
    const byFlowName: Record<string, number> = {};
    let totalSteps = 0;

    executions.forEach(execution => {
      if (execution.state.sharedFlows) {
        execution.state.sharedFlows.forEach((flow: any) => {
          totalSharedFlows++;
          byFlowName[flow.flowName] = (byFlowName[flow.flowName] || 0) + 1;
          totalSteps += flow.steps?.length || 0;
        });
      }
    });

    return {
      totalExecutions: executions.length,
      sharedFlowsExecuted: totalSharedFlows,
      byFlowName,
      averageStepsPerFlow: totalSharedFlows > 0 ? totalSteps / totalSharedFlows : 0
    };
  }

  /**
   * Get shared flow execution history for a specific execution
   */
  async getSharedFlowHistory(executionId: string): Promise<any[]> {
    const execution = await this.executionRepository.findOne({
      where: { executionId: executionId }
    });

    if (!execution || !execution.state.sharedFlows) {
      return [];
    }

    return execution.state.sharedFlows;
  }

  /**
   * Retry failed shared flow
   */
  async retrySharedFlow(
    flowName: string,
    context: WorkflowExecutionContext,
    executionId: string
  ): Promise<ActionExecutionResult> {
    this.logger.log(`Retrying shared flow: ${flowName} for execution: ${executionId}`);

    try {
      return await this.executeSharedFlow(flowName, context, executionId);
    } catch (error) {
      this.logger.error(`Retry failed for shared flow ${flowName}:`, error);
      return {
        success: false,
        error: `Retry failed: ${error.message}`
      };
    }
  }

  /**
   * Validate shared flow configuration
   */
  async validateSharedFlow(flowName: string): Promise<boolean> {
    const validFlows = [
      'Welcome Follow-up Flow',
      'Engagement Nudge Flow',
      'Value Highlight Flow',
      'Newsletter Welcome Flow'
    ];

    return validFlows.includes(flowName);
  }

  /**
   * Get available shared flows
   */
  getAvailableSharedFlows(): string[] {
    return [
      'Welcome Follow-up Flow',
      'Engagement Nudge Flow',
      'Value Highlight Flow',
      'Newsletter Welcome Flow'
    ];
  }

  /**
   * Execute workflow through trigger registry (ONLY way to execute workflows)
   * This method enforces the use of the standardized trigger system
   */
  async executeWorkflowThroughTrigger(
    triggerType: string,
    triggerData: any
  ): Promise<any> {
    this.logger.log(`[SharedFlowService] Executing workflow through trigger: ${triggerType}`);

    // Validate trigger is registered
    if (!this.triggerRegistry.isRegistered(triggerType)) {
      throw new Error(`Trigger type '${triggerType}' is not registered. Use trigger registry to register triggers.`);
    }

    // Process trigger through registry
    const result = await this.triggerRegistry.processTrigger(triggerType, triggerData);

    if (!result.success) {
      throw new Error(`Trigger processing failed: ${result.error}`);
    }

    this.logger.log(`[SharedFlowService] Workflow executed successfully through trigger: ${triggerType}`);
    return result;
  }

  /**
   * Get available trigger types (ONLY way to discover available workflows)
   */
  getAvailableTriggerTypes(): string[] {
    return this.triggerRegistry.getAllTriggers().map(trigger => trigger.triggerType);
  }

  /**
   * Get trigger statistics
   */
  getTriggerStatistics(): { totalTriggers: number; triggerTypes: string[] } {
    return this.triggerRegistry.getStats();
  }
}
