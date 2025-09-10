import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { SharedFlowService } from './shared-flow.service';
import { WorkflowExecutionContext, ActionExecutionParams, ActionExecutionResult } from '../workflow/types';

@Injectable()
export class WorkflowActionService {
  private readonly logger = new Logger(WorkflowActionService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly sharedFlowService: SharedFlowService,
  ) {}

  /**
   * Execute any workflow action based on action type
   */
  async executeAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    this.logger.log(`Executing action: ${params.actionType} (${params.actionName})`);

    try {
      switch (params.actionType) {
        case 'send_email':
          return await this.executeEmailAction(params);

        case 'send_sms':
          return await this.executeSmsAction(params);

        case 'trigger_webhook':
          return await this.executeWebhookAction(params);

        case 'execute_shared_flow':
          return await this.executeSharedFlowAction(params);

        case 'update_user':
          return await this.executeUpdateUserAction(params);

        case 'create_task':
          return await this.executeCreateTaskAction(params);

        case 'send_newsletter':
          return await this.executeSendNewsletterAction(params);

        case 'update_user_preferences':
          return await this.executeUpdatePreferencesAction(params);

        case 'create_user_dashboard':
          return await this.executeCreateDashboardAction(params);

        case 'schedule_follow_up':
          return await this.executeScheduleFollowUpAction(params);

        case 'log_activity':
          return await this.executeLogActivityAction(params);

        case 'send_notification':
          return await this.executeSendNotificationAction(params);

        default:
          this.logger.warn(`Unknown action type: ${params.actionType}`);
          return {
            success: false,
            error: `Unknown action type: ${params.actionType}`
          };
      }
    } catch (error) {
      this.logger.error(`Action execution failed: ${params.actionType}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute email action
   */
  private async executeEmailAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context, executionId, stepId } = params;

    // Log user details for verification
    const userName = context.metadata?.userName || context.data?.name || 'Unknown';
    const userEmail = context.metadata?.userEmail || context.data?.email || 'Unknown';

    this.logger.log(`📧 EMAIL ACTION EXECUTED - User: ${userName} (${userEmail}) - Subject: ${actionData.subject} - Template: ${actionData.templateId || 'default'}`);

    const result = await this.emailService.sendEmail({
      to: userEmail,
      subject: actionData.subject,
      templateId: actionData.templateId,
      data: {
        userName: userName,
        product: context.metadata?.product,
        ...actionData.data
      },
      executionId,
      stepId
    });

    if (!result.success) {
      this.logger.error(`❌ EMAIL FAILED - User: ${userName} (${userEmail}) - Error: ${result.error}`);
      return {
        success: false,
        error: `Email sending failed: ${result.error}`
      };
    }

    this.logger.log(`✅ EMAIL SENT SUCCESSFULLY - User: ${userName} (${userEmail}) - Message ID: ${result.messageId || 'N/A'}`);

    return {
      success: true,
      result: {
        messageId: result.messageId,
        to: userEmail,
        subject: actionData.subject,
        templateId: actionData.templateId
      },
      metadata: {
        actionType: 'send_email',
        actionName: params.actionName,
        executedAt: new Date()
      }
    };
  }

  /**
   * Execute SMS action
   */
  private async executeSmsAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context } = params;

    this.logger.log(`Sending SMS: ${actionData.message} to ${context.metadata.phoneNumber}`);

    // Mock SMS implementation - in production, integrate with SMS provider
    const smsResult = {
      messageId: `sms_${Date.now()}`,
      to: context.metadata.phoneNumber,
      message: actionData.message,
      status: 'sent'
    };

    this.logger.log(`[MOCK] SMS sent: ${smsResult.messageId}`);

    return {
      success: true,
      result: smsResult,
      metadata: {
        actionType: 'send_sms',
        actionName: params.actionName,
        executedAt: new Date()
      }
    };
  }

  /**
   * Execute webhook action
   */
  private async executeWebhookAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context } = params;

    this.logger.log(`Triggering webhook: ${actionData.url}`);

    // Mock webhook implementation - in production, use HTTP client
    const webhookResult = {
      url: actionData.url,
      method: actionData.method,
      statusCode: 200,
      response: { success: true, message: 'Webhook triggered successfully' }
    };

    this.logger.log(`[MOCK] Webhook triggered: ${actionData.url}`);

    return {
      success: true,
      result: webhookResult,
      metadata: {
        actionType: 'trigger_webhook',
        actionName: params.actionName,
        executedAt: new Date()
      }
    };
  }

  /**
   * Execute shared flow action
   */
  private async executeSharedFlowAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context, executionId } = params;

    this.logger.log(`Executing shared flow: ${actionData.flowName}`);

    const result = await this.sharedFlowService.executeSharedFlow(
      actionData.flowName,
      context,
      executionId
    );

    return {
      success: result.success,
      result: result.result,
      error: result.error,
      metadata: {
        actionType: 'execute_shared_flow',
        actionName: params.actionName,
        flowName: actionData.flowName,
        executedAt: new Date()
      }
    };
  }

  /**
   * Execute update user action
   */
  private async executeUpdateUserAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context } = params;

    this.logger.log(`Updating user: ${context.userId}`);

    // Mock user update - in production, update database
    const userResult = {
      userId: context.userId,
      updates: actionData.updates,
      updatedAt: new Date()
    };

    this.logger.log(`[MOCK] User updated:`, userResult);

    return {
      success: true,
      result: userResult,
      metadata: {
        actionType: 'update_user',
        actionName: params.actionName,
        executedAt: new Date()
      }
    };
  }

  /**
   * Execute create task action
   */
  private async executeCreateTaskAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context } = params;

    this.logger.log(`Creating task for user: ${context.userId}`);

    // Mock task creation - in production, create task in database
    const taskResult = {
      userId: context.userId,
      taskId: `task_${context.userId}_${Date.now()}`,
      title: actionData.title,
      description: actionData.description,
      priority: actionData.priority || 'medium',
      dueDate: actionData.dueDate,
      createdAt: new Date()
    };

    this.logger.log(`[MOCK] Task created:`, taskResult);

    return {
      success: true,
      result: taskResult,
      metadata: {
        actionType: 'create_task',
        actionName: params.actionName,
        executedAt: new Date()
      }
    };
  }

  /**
   * Execute send newsletter action
   */
  private async executeSendNewsletterAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context } = params;

    this.logger.log(`Sending newsletter: ${actionData.subject} to ${context.metadata.userEmail}`);

    // Use email service for newsletter sending
    const result = await this.emailService.sendEmail({
      to: context.metadata.userEmail,
      subject: actionData.subject,
      templateId: actionData.templateId || 'newsletter_template',
      data: {
        userName: context.metadata.userName,
        newsletterContent: actionData.content,
        ...actionData.data
      },
      executionId: context.executionId,
      stepId: params.stepId
    });

    if (!result.success) {
      return {
        success: false,
        error: `Newsletter sending failed: ${result.error}`
      };
    }

    return {
      success: true,
      result: {
        messageId: result.messageId,
        to: context.metadata.userEmail,
        subject: actionData.subject,
        templateId: actionData.templateId
      },
      metadata: {
        actionType: 'send_newsletter',
        actionName: params.actionName,
        executedAt: new Date()
      }
    };
  }

  /**
   * Execute update user preferences action
   */
  private async executeUpdatePreferencesAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context } = params;

    this.logger.log(`Updating user preferences for user: ${context.userId}`);

    // Mock preferences update - in production, update database
    const preferencesResult = {
      userId: context.userId,
      preferences: actionData.preferences,
      updatedAt: new Date()
    };

    this.logger.log(`[MOCK] User preferences updated:`, preferencesResult);

    return {
      success: true,
      result: preferencesResult,
      metadata: {
        actionType: 'update_user_preferences',
        actionName: params.actionName,
        executedAt: new Date()
      }
    };
  }

  /**
   * Execute create user dashboard action
   */
  private async executeCreateDashboardAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context } = params;

    this.logger.log(`Creating user dashboard for user: ${context.userId}`);

    // Mock dashboard creation - in production, create dashboard in database
    const dashboardResult = {
      userId: context.userId,
      dashboardId: `dashboard_${context.userId}_${Date.now()}`,
      configuration: actionData.configuration,
      createdAt: new Date()
    };

    this.logger.log(`[MOCK] User dashboard created:`, dashboardResult);

    return {
      success: true,
      result: dashboardResult,
      metadata: {
        actionType: 'create_user_dashboard',
        actionName: params.actionName,
        executedAt: new Date()
      }
    };
  }

  /**
   * Execute schedule follow-up action
   */
  private async executeScheduleFollowUpAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context } = params;

    this.logger.log(`Scheduling follow-up for user: ${context.userId}`);

    // Mock follow-up scheduling - in production, schedule in delay system
    const followUpResult = {
      userId: context.userId,
      followUpId: `followup_${context.userId}_${Date.now()}`,
      scheduledFor: actionData.scheduledFor,
      action: actionData.action,
      createdAt: new Date()
    };

    this.logger.log(`[MOCK] Follow-up scheduled:`, followUpResult);

    return {
      success: true,
      result: followUpResult,
      metadata: {
        actionType: 'schedule_follow_up',
        actionName: params.actionName,
        executedAt: new Date()
      }
    };
  }

  /**
   * Execute log activity action
   */
  private async executeLogActivityAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context } = params;

    // Get user details for logging
    const userName = context.metadata?.userName || context.data?.name || 'Unknown';
    const userEmail = context.metadata?.userEmail || context.data?.email || 'Unknown';

    this.logger.log(`🏁 WORKFLOW END - User: ${userName} (${userEmail}) - Activity: ${actionData.activity}`);

    // Mock activity logging - in production, log to database
    const activityResult = {
      userId: context.userId,
      activityId: `activity_${context.userId}_${Date.now()}`,
      activity: actionData.activity,
      metadata: actionData.metadata,
      loggedAt: new Date()
    };

    this.logger.log(`[MOCK] Activity logged: userId=${activityResult.userId}, activity=${activityResult.activity}`);

    return {
      success: true,
      result: activityResult,
      metadata: {
        actionType: 'log_activity',
        actionName: params.actionName,
        executedAt: new Date()
      }
    };
  }

  /**
   * Get available action types
   */
  getAvailableActionTypes(): string[] {
    return [
      'send_email',
      'send_sms',
      'trigger_webhook',
      'execute_shared_flow',
      'update_user',
      'create_task',
      'send_newsletter',
      'update_user_preferences',
      'create_user_dashboard',
      'schedule_follow_up',
      'log_activity'
    ];
  }

  /**
   * Validate action configuration
   */
  async validateAction(actionType: string, actionData: any): Promise<boolean> {
    const availableTypes = this.getAvailableActionTypes();

    if (!availableTypes.includes(actionType)) {
      return false;
    }

    // Add specific validation for each action type
    switch (actionType) {
      case 'send_email':
        return actionData.subject && actionData.templateId;

      case 'send_sms':
        return actionData.message && actionData.to;

      case 'trigger_webhook':
        return actionData.url && actionData.method;

      case 'execute_shared_flow':
        return actionData.flowName;

      case 'update_user':
        return actionData.updates;

      case 'create_task':
        return actionData.title && actionData.description;

      case 'send_newsletter':
        return actionData.subject && actionData.content;

      case 'update_user_preferences':
        return actionData.preferences;

      case 'create_user_dashboard':
        return actionData.configuration;

      case 'schedule_follow_up':
        return actionData.scheduledFor && actionData.action;

      case 'log_activity':
        return actionData.activity;

      default:
        return false;
    }
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotificationAction(params: ActionExecutionParams): Promise<ActionExecutionResult> {
    const { actionData, context, executionId, stepId } = params;

    this.logger.log(`Sending notification: ${actionData.title} to user ${context.metadata.userId}`);

    try {
      const {
        type,
        title,
        message,
        channels = ['email'],
        priority = 'normal'
      } = actionData;

      // Validate required fields
      if (!type || !title || !message) {
        return {
          success: false,
          error: `Missing required fields for notification: type, title, or message`
        };
      }

      // Send notification via appropriate channels
      const results = [];

      for (const channel of channels) {
        switch (channel) {
          case 'email':
            const emailResult = await this.emailService.sendEmail({
              to: context.metadata.userEmail,
              subject: title,
              templateId: 'notification',
              data: {
                userName: context.metadata.userName,
                message: message,
                type: type,
                priority: priority,
                ...actionData.data
              },
              executionId,
              stepId
            });
            results.push({ channel: 'email', success: emailResult.success, error: emailResult.error });
            break;

          case 'sms':
            // SMS implementation would go here
            this.logger.log(`Would send SMS notification: ${title} to ${context.metadata.userPhoneNumber}`);
            results.push({ channel: 'sms', success: true, error: null });
            break;

          default:
            this.logger.warn(`Unknown notification channel: ${channel}`);
            results.push({ channel, success: false, error: `Unknown channel: ${channel}` });
        }
      }

      const hasFailures = results.some(r => !r.success);

      return {
        success: !hasFailures,
        result: {
          action: 'send_notification',
          actionName: params.actionName,
          userId: context.metadata.userId,
          type: type,
          title: title,
          message: message,
          channels: channels,
          priority: priority,
          results: results,
          status: hasFailures ? 'partial' : 'sent',
          timestamp: new Date()
        },
        error: hasFailures ? `Some notification channels failed: ${results.filter(r => !r.success).map(r => r.error).join(', ')}` : undefined
      };

    } catch (error) {
      this.logger.error(`Notification action execution failed: ${params.actionName}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get action statistics
   */
  async getActionStatistics(): Promise<{
    totalActions: number;
    byActionType: Record<string, number>;
    successRate: number;
  }> {
    // This would typically query a database for action execution logs
    // For now, return mock data
    return {
      totalActions: 0,
      byActionType: {},
      successRate: 0
    };
  }
}
