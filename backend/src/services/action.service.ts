import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';

export interface ActionContext {
  actionType: string;
  actionName: string;
  actionDetails: any;
  userData: any;
  metadata: any;
}

export interface ActionResult {
  success: boolean;
  actionType: string;
  actionName: string;
  result?: any;
  error?: string;
  executionTime: number;
  timestamp: Date;
}

@Injectable()
export class ActionService {
  private readonly logger = new Logger(ActionService.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Execute an action based on the action context
   */
  async executeAction(context: ActionContext): Promise<ActionResult> {
    const startTime = Date.now();
    const { actionType, actionName, actionDetails, userData, metadata } = context;

    this.logger.log(`Executing action: ${actionType} - ${actionName}`);
    this.logger.debug(`Action details: ${JSON.stringify(actionDetails)}`);
    this.logger.debug(`User data: ${JSON.stringify(userData)}`);
    this.logger.debug(`Metadata: ${JSON.stringify(metadata)}`);

    try {
      let result: any;

      switch (actionType.toLowerCase()) {
        case 'send_email':
          result = await this.executeSendEmailAction(actionName, actionDetails, userData, metadata, context);
          break;
        case 'update_user':
          result = await this.executeUpdateUserAction(actionName, actionDetails, userData, metadata);
          break;
        case 'create_task':
          result = await this.executeCreateTaskAction(actionName, actionDetails, userData, metadata);
          break;
        case 'send_notification':
          result = await this.executeSendNotificationAction(actionName, actionDetails, userData, metadata);
          break;
        case 'update_subscription':
          result = await this.executeUpdateSubscriptionAction(actionName, actionDetails, userData, metadata);
          break;
        case 'custom':
          result = await this.executeCustomAction(actionName, actionDetails, userData, metadata);
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      const executionTime = Date.now() - startTime;

      this.logger.log(`Action ${actionType} - ${actionName} executed successfully in ${executionTime}ms`);

      return {
        success: true,
        actionType,
        actionName,
        result,
        executionTime,
        timestamp: new Date()
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(`Action ${actionType} - ${actionName} failed: ${error.message}`, error.stack);

      return {
        success: false,
        actionType,
        actionName,
        error: error.message,
        executionTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute send email action
   */
  private async executeSendEmailAction(
    actionName: string,
    actionDetails: any,
    userData: any,
    metadata: any,
    context?: any
  ): Promise<any> {
    this.logger.log(`Executing send email action: ${actionName}`);
    this.logger.debug(`Email details: ${JSON.stringify(actionDetails)}`);
    this.logger.debug(`User data: ${JSON.stringify(userData)}`);
    this.logger.debug(`Metadata: ${JSON.stringify(metadata)}`);

    const {
      template,
      templateId,
      subject,
      to,
      data: templateData,
      priority = 'normal',
      category = 'workflow'
    } = actionDetails;

    // Use templateId if template is not available
    const finalTemplate = template || templateId;

    // Use the to field directly from actionDetails (workflow provides this)
    const finalTo = to;

    this.logger.debug(`Final template: ${finalTemplate}, Final to: ${finalTo}, Subject: ${subject}`);
    this.logger.debug(`actionDetails: ${JSON.stringify(actionDetails)}`);
    this.logger.debug(`template: ${template}, templateId: ${templateId}`);

    // Validate required fields
    if (!finalTemplate || !subject || !finalTo) {
      throw new Error(`Missing required fields for email action ${actionName}: template/templateId, subject, or to`);
    }

    // Prepare email data
    const emailData = {
      to: finalTo,
      subject: subject,
      templateId: finalTemplate,
      data: {
        ...templateData,
        user: userData,
        actionName: actionName,
        metadata: metadata
      }
    };

    this.logger.log(`Sending email via EmailService: ${finalTemplate} to ${finalTo}`);

    // Call the actual email service with execution context
    const emailResult = await this.emailService.sendEmail({
      ...emailData,
      executionId: context.executionId,
      stepId: context.currentStep || 'unknown'
    });

    this.logger.log(`Email sent successfully: ${JSON.stringify(emailResult)}`);

    return {
      action: 'send_email',
      actionName: actionName,
      template: template,
      recipient: to,
      subject: subject,
      emailResult: emailResult,
      status: 'sent',
      timestamp: new Date()
    };
  }

  /**
   * Execute update user action
   */
  private async executeUpdateUserAction(
    actionName: string,
    actionDetails: any,
    userData: any,
    metadata: any
  ): Promise<any> {
    this.logger.log(`Executing update user action: ${actionName}`);
    this.logger.debug(`Update details: ${JSON.stringify(actionDetails)}`);

    const {
      fields,
      values,
      operation = 'update'
    } = actionDetails;

    // Validate required fields
    if (!fields || !values) {
      throw new Error(`Missing required fields for update user action ${actionName}: fields or values`);
    }

    // In a real implementation, this would update user data in the database
    this.logger.log(`Would update user ${userData.id} with fields: ${JSON.stringify(fields)}`);

    return {
      action: 'update_user',
      actionName: actionName,
      userId: userData.id,
      fields: fields,
      values: values,
      operation: operation,
      status: 'updated',
      timestamp: new Date()
    };
  }

  /**
   * Execute create task action
   */
  private async executeCreateTaskAction(
    actionName: string,
    actionDetails: any,
    userData: any,
    metadata: any
  ): Promise<any> {
    this.logger.log(`Executing create task action: ${actionName}`);
    this.logger.debug(`Task details: ${JSON.stringify(actionDetails)}`);

    const {
      title,
      description,
      priority = 'medium',
      assignee,
      dueDate,
      category = 'workflow'
    } = actionDetails;

    // Validate required fields
    if (!title) {
      throw new Error(`Missing required field for create task action ${actionName}: title`);
    }

    // In a real implementation, this would create a task in a task management system
    this.logger.log(`Would create task: ${title} for user ${userData.id}`);

    return {
      action: 'create_task',
      actionName: actionName,
      userId: userData.id,
      title: title,
      description: description,
      priority: priority,
      assignee: assignee || userData.id,
      dueDate: dueDate,
      category: category,
      status: 'created',
      timestamp: new Date()
    };
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotificationAction(
    actionName: string,
    actionDetails: any,
    userData: any,
    metadata: any
  ): Promise<any> {
    this.logger.log(`Executing send notification action: ${actionName}`);
    this.logger.debug(`Notification details: ${JSON.stringify(actionDetails)}`);

    const {
      type,
      title,
      message,
      channels = ['email'],
      priority = 'normal'
    } = actionDetails;

    // Validate required fields
    if (!type || !title || !message) {
      throw new Error(`Missing required fields for notification action ${actionName}: type, title, or message`);
    }

    // In a real implementation, this would send notifications via various channels
    this.logger.log(`Would send ${type} notification: ${title} to user ${userData.id}`);

    return {
      action: 'send_notification',
      actionName: actionName,
      userId: userData.id,
      type: type,
      title: title,
      message: message,
      channels: channels,
      priority: priority,
      status: 'sent',
      timestamp: new Date()
    };
  }

  /**
   * Execute update subscription action
   */
  private async executeUpdateSubscriptionAction(
    actionName: string,
    actionDetails: any,
    userData: any,
    metadata: any
  ): Promise<any> {
    this.logger.log(`Executing update subscription action: ${actionName}`);
    this.logger.debug(`Subscription details: ${JSON.stringify(actionDetails)}`);

    const {
      package: packageName,
      status,
      features,
      billingCycle,
      amount
    } = actionDetails;

    // Validate required fields
    if (!packageName || !status) {
      throw new Error(`Missing required fields for update subscription action ${actionName}: package or status`);
    }

    // In a real implementation, this would update subscription in the database
    this.logger.log(`Would update subscription for user ${userData.id} to package: ${packageName}`);

    return {
      action: 'update_subscription',
      actionName: actionName,
      userId: userData.id,
      package: packageName,
      status: status,
      features: features,
      billingCycle: billingCycle,
      amount: amount,
      updateStatus: 'updated',
      timestamp: new Date()
    };
  }

  /**
   * Get available action types
   */
  getAvailableActionTypes(): string[] {
    return [
      'send_email',
      'update_user',
      'create_task',
      'send_notification',
      'update_subscription'
    ];
  }

  /**
   * Execute custom action
   */
  private async executeCustomAction(
    actionName: string,
    actionDetails: any,
    userData: any,
    metadata: any
  ): Promise<any> {
    this.logger.log(`Executing custom action: ${actionName}`);

    // Mock implementation for custom actions
    const result = {
      success: true,
      action: 'custom',
      actionName,
      result: {
        executed: true,
        actionType: actionDetails.actionType || 'custom',
        executedAt: new Date().toISOString()
      },
      metadata: {
        userId: userData.id,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };

    this.logger.log(`Custom action ${actionName} completed successfully`);
    return result;
  }

  /**
   * Validate action context
   */
  validateActionContext(context: ActionContext): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!context.actionType) {
      errors.push('Action type is required');
    }

    if (!context.actionName) {
      errors.push('Action name is required');
    }

    if (!context.actionDetails) {
      errors.push('Action details are required');
    }

    if (!context.userData) {
      errors.push('User data is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
