import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { WorkflowExecutionEngine } from './execution/workflow-execution-engine';
import { SubscriptionTriggerService } from '../services/subscription-trigger.service';
import { NewsletterTriggerService } from '../services/newsletter-trigger.service';
import { SharedFlowService } from '../services/shared-flow.service';
import { WorkflowActionService } from '../services/workflow-action.service';
import { WorkflowRecoveryService } from '../services/workflow-recovery.service';
import { EmailService } from '../services/email.service';
import { WorkflowService } from './workflow.service';

@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly workflowEngine: WorkflowExecutionEngine,
    private readonly subscriptionTriggerService: SubscriptionTriggerService,
    private readonly newsletterTriggerService: NewsletterTriggerService,
    private readonly sharedFlowService: SharedFlowService,
    private readonly workflowActionService: WorkflowActionService,
    private readonly workflowRecoveryService: WorkflowRecoveryService,
    private readonly emailService: EmailService,
    private readonly workflowService: WorkflowService,
  ) {}

  // Workflow Execution Endpoints
  @Get('executions')
  async getAllExecutions() {
    return await this.workflowEngine.getAllExecutions();
  }

  @Get('executions/:executionId')
  async getExecutionStatus(@Param('executionId') executionId: string) {
    return await this.workflowEngine.getExecutionStatus(executionId);
  }

  @Post('trigger/subscription')
  async triggerSubscriptionWorkflow(@Body() body: { subscriptionId: string }) {
    return await this.workflowEngine.triggerWorkflowForSubscription(body.subscriptionId);
  }

  // Workflow Control Endpoints
  @Post('executions/:executionId/start')
  async startWorkflow(@Param('executionId') executionId: string) {
    return await this.workflowEngine.startWorkflow(executionId);
  }

  @Post('executions/:executionId/stop')
  async stopWorkflow(@Param('executionId') executionId: string) {
    return await this.workflowEngine.stopWorkflow(executionId);
  }

  @Post('executions/:executionId/pause')
  async pauseWorkflow(@Param('executionId') executionId: string) {
    return await this.workflowEngine.pauseWorkflow(executionId);
  }

  @Post('executions/:executionId/resume')
  async resumeWorkflow(@Param('executionId') executionId: string) {
    return await this.workflowEngine.resumeWorkflow(executionId);
  }

  @Post('executions/:executionId/cancel')
  async cancelWorkflow(@Param('executionId') executionId: string) {
    return await this.workflowEngine.cancelWorkflow(executionId);
  }

  // Subscription Trigger Endpoints
  @Get('triggers/subscriptions')
  async getSubscriptionTriggers(@Query('secondsAgo') secondsAgo: number = 30) {
    return await this.subscriptionTriggerService.retrieveTriggerData(secondsAgo);
  }

  @Get('triggers/subscriptions/statistics')
  async getSubscriptionStatistics() {
    return await this.subscriptionTriggerService.getStatistics();
  }

  @Post('triggers/subscriptions/create')
  async createSubscription(@Body() body: {
    userId: string;
    product: string;
    subscriptionTypeId?: string;
  }) {
    return await this.subscriptionTriggerService.createSubscription(
      body.userId,
      body.product,
      body.subscriptionTypeId
    );
  }

  @Get('triggers/subscriptions/:subscriptionId')
  async getSubscription(@Param('subscriptionId') subscriptionId: string) {
    return await this.subscriptionTriggerService.getSubscriptionById(subscriptionId);
  }

  // Newsletter Trigger Endpoints
  @Get('triggers/newsletters')
  async getNewsletterTriggers(@Query('secondsAgo') secondsAgo: number = 30) {
    return await this.newsletterTriggerService.retrieveTriggerData(secondsAgo);
  }

  @Get('triggers/newsletters/statistics')
  async getNewsletterStatistics() {
    return await this.newsletterTriggerService.getStatistics();
  }

  @Post('triggers/newsletters/create')
  async createNewsletterSubscription(@Body() body: {
    email: string;
    source?: string;
    preferences?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      categories: string[];
      language: string;
    };
  }) {
    return await this.newsletterTriggerService.createNewsletterSubscription(
      body.email,
      body.source,
      body.preferences
    );
  }

  @Get('triggers/newsletters/:newsletterId')
  async getNewsletter(@Param('newsletterId') newsletterId: string) {
    return await this.newsletterTriggerService.getNewsletterById(newsletterId);
  }

  @Post('triggers/newsletters/:newsletterId/unsubscribe')
  async unsubscribeNewsletter(@Param('newsletterId') newsletterId: string) {
    return await this.newsletterTriggerService.unsubscribeNewsletter(newsletterId);
  }

  // Shared Flow Endpoints
  @Get('shared-flows')
  async getAvailableSharedFlows() {
    return await this.sharedFlowService.getAvailableSharedFlows();
  }

  @Get('shared-flows/statistics')
  async getSharedFlowStatistics() {
    return await this.sharedFlowService.getSharedFlowStatistics();
  }

  @Get('shared-flows/:executionId/history')
  async getSharedFlowHistory(@Param('executionId') executionId: string) {
    return await this.sharedFlowService.getSharedFlowHistory(executionId);
  }

  @Post('shared-flows/validate')
  async validateSharedFlow(@Body() body: { flowName: string }) {
    return {
      valid: await this.sharedFlowService.validateSharedFlow(body.flowName),
      flowName: body.flowName
    };
  }

  // Action Endpoints
  @Get('actions/types')
  async getAvailableActionTypes() {
    return await this.workflowActionService.getAvailableActionTypes();
  }

  @Get('actions/statistics')
  async getActionStatistics() {
    return await this.workflowActionService.getActionStatistics();
  }

  @Post('actions/validate')
  async validateAction(@Body() body: {
    actionType: string;
    actionData: any;
  }) {
    return {
      valid: await this.workflowActionService.validateAction(body.actionType, body.actionData),
      actionType: body.actionType
    };
  }

  // Email Endpoints
  @Get('emails/statistics')
  async getEmailStatistics(@Query('executionId') executionId?: string) {
    return await this.emailService.getEmailStats(executionId);
  }

  @Get('emails/:executionId')
  async getEmailsForExecution(@Param('executionId') executionId: string) {
    return await this.emailService.getEmailsForExecution(executionId);
  }

  // Test Endpoints
  @Post('test/subscription')
  async testSubscriptionWorkflow(@Body() body: {
    product: string;
    userEmail: string;
    userName: string;
  }) {
    // Create a test user
    const user = await this.subscriptionTriggerService.createSubscription(
      'test-user-id',
      body.product
    );

    // Trigger workflow
    await this.workflowEngine.triggerWorkflowForSubscription(user.id);

    return {
      message: 'Test subscription workflow triggered',
      subscriptionId: user.id,
      product: body.product
    };
  }

  @Post('test/newsletter')
  async testNewsletterWorkflow(@Body() body: {
    email: string;
    source?: string;
  }) {
    // Create a test newsletter subscription
    const newsletter = await this.newsletterTriggerService.createNewsletterSubscription(
      body.email,
      body.source
    );

    // Trigger workflow
    const context = await this.newsletterTriggerService.processTrigger({
      id: newsletter.id,
      userId: newsletter.userId,
      triggerType: 'newsletter_subscribed',
      data: newsletter,
      createdAt: newsletter.createdAt
    });

    await this.workflowEngine.executeWorkflowFromContext(context);

    return {
      message: 'Test newsletter workflow triggered',
      newsletterId: newsletter.id,
      email: body.email
    };
  }

  // Batch Processing Endpoints
  @Post('process/batch')
  async processBatchWorkflows() {
    await this.workflowEngine.processBatchWorkflows();
    return { message: 'Batch processing completed' };
  }

  @Post('process/delayed')
  async processDelayedExecutions() {
    await this.workflowEngine.processDelayedExecutions();
    return { message: 'Delayed executions processed' };
  }

  // Recovery Endpoints
  @Post('recovery/recover')
  async recoverWorkflows() {
    return await this.workflowRecoveryService.recoverWorkflows();
  }

  @Get('recovery/statistics')
  async getRecoveryStatistics() {
    return await this.workflowRecoveryService.getRecoveryStatistics();
  }

  @Post('recovery/cleanup')
  async cleanupOldData(@Query('daysOld') daysOld: number = 30) {
    return await this.workflowRecoveryService.cleanupOldData(daysOld);
  }

  @Get('recovery/validate')
  async validateWorkflowState() {
    return await this.workflowRecoveryService.validateWorkflowState();
  }

  // Visual Workflow Endpoints
  @Get('visual-workflows')
  async getAllVisualWorkflows() {
    return await this.workflowService.findAll();
  }

  @Get('visual-workflows/:id')
  async getVisualWorkflow(@Param('id') id: number) {
    return await this.workflowService.findOne(id);
  }

  @Post('visual-workflows')
  async createOrUpdateVisualWorkflow(@Body() data: {
    id?: number;
    name: string;
    nodes: any;
    edges: any;
    jsonLogic?: any;
  }) {
    return await this.workflowService.createOrUpdate(data);
  }

  @Post('visual-workflows/:id/delete')
  async deleteVisualWorkflow(@Param('id') id: number) {
    await this.workflowService.remove(id);
    return { message: 'Workflow deleted successfully' };
  }
}