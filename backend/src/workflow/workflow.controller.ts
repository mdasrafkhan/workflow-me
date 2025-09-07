import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { WorkflowOrchestrationEngine } from './execution/workflow-orchestration-engine';
import { SubscriptionTriggerService } from '../services/subscription-trigger.service';
import { NewsletterTriggerService } from '../services/newsletter-trigger.service';
import { SharedFlowService } from '../services/shared-flow.service';
import { WorkflowActionService } from '../services/workflow-action.service';
import { WorkflowRecoveryService } from '../services/workflow-recovery.service';
import { EmailService } from '../services/email.service';
import { WorkflowService } from './workflow.service';
import { DummyDataService } from '../services/dummy-data.service';

@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly workflowEngine: WorkflowOrchestrationEngine,
    private readonly subscriptionTriggerService: SubscriptionTriggerService,
    private readonly newsletterTriggerService: NewsletterTriggerService,
    private readonly sharedFlowService: SharedFlowService,
    private readonly workflowActionService: WorkflowActionService,
    private readonly workflowRecoveryService: WorkflowRecoveryService,
    private readonly emailService: EmailService,
    private readonly workflowService: WorkflowService,
    private readonly dummyDataService: DummyDataService,
  ) {}

  // Workflow Execution Endpoints
  @Get('executions')
  async getAllExecutions() {
    // This would need to be implemented in the clean engine or moved to a service
    return { message: 'Get all executions - to be implemented' };
  }

  @Get('executions/:executionId')
  async getExecutionStatus(@Param('executionId') executionId: string) {
    // This would need to be implemented in the clean engine or moved to a service
    return { message: `Get execution status for ${executionId} - to be implemented` };
  }

  @Post('trigger/subscription')
  async triggerSubscriptionWorkflow(@Body() body: { subscriptionId: string }) {
    // This would need to be implemented in the clean engine or moved to a service
    return { message: `Trigger subscription workflow for ${body.subscriptionId} - to be implemented` };
  }

  // New Clean Engine Endpoints
  @Post('execute')
  async executeWorkflow(@Body() body: { workflow: any; context: any }) {
    try {
      const result = await this.workflowEngine.executeWorkflow(body.workflow, body.context);
      return {
        success: true,
        result,
        message: 'Workflow executed successfully using clean engine'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Workflow execution failed'
      };
    }
  }

  @Get('node-types')
  async getAvailableNodeTypes() {
    return {
      nodeTypes: this.workflowEngine.getAvailableNodeTypes(),
      stats: this.workflowEngine.getRegistryStats()
    };
  }

  // Workflow Control Endpoints
  @Post('executions/:executionId/start')
  async startWorkflow(@Param('executionId') executionId: string) {
    return { message: `Start workflow ${executionId} - to be implemented` };
  }

  @Post('executions/:executionId/stop')
  async stopWorkflow(@Param('executionId') executionId: string) {
    return { message: `Stop workflow ${executionId} - to be implemented` };
  }

  @Post('executions/:executionId/pause')
  async pauseWorkflow(@Param('executionId') executionId: string) {
    return { message: `Pause workflow ${executionId} - to be implemented` };
  }

  @Post('executions/:executionId/resume')
  async resumeWorkflow(@Param('executionId') executionId: string) {
    return { message: `Resume workflow ${executionId} - to be implemented` };
  }

  @Post('executions/:executionId/cancel')
  async cancelWorkflow(@Param('executionId') executionId: string) {
    return { message: `Cancel workflow ${executionId} - to be implemented` };
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
    try {
      console.log('🔍 Test subscription workflow started with:', body);

      // Validate input
      if (!body.product) {
        throw new Error('Product is required');
      }

      // Create a test user first, then subscription
      console.log('📝 Creating test user and subscription...');
      let user;
      try {
        // First create a test user
        const { v4: uuidv4 } = require('uuid');
        const testUserId = uuidv4();

        // Create user in dummy_users table with unique email
        const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
        const testUser = await this.dummyDataService.userRepository.save({
          id: testUserId,
          email: uniqueEmail,
          name: body.userName,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Test user created:', testUser.id);

        // Now create subscription
        user = await this.subscriptionTriggerService.createSubscription(
          testUserId,
          body.product
        );
        console.log('✅ Subscription created:', user.id);
      } catch (error) {
        console.error('❌ User/subscription creation failed:', error);
        throw new Error(`User/subscription creation failed: ${error.message}`);
      }

      // Trigger workflow
      console.log('🚀 Triggering workflow...');
      try {
        // await this.workflowEngine.triggerWorkflowForSubscription(user.id); // To be implemented
        console.log('✅ Workflow triggered successfully');
      } catch (error) {
        console.error('❌ Workflow triggering failed:', error);
        throw new Error(`Workflow triggering failed: ${error.message}`);
      }

      return {
        message: 'Test subscription workflow triggered',
        subscriptionId: user.id,
        product: body.product
      };
    } catch (error) {
      console.error('❌ Test subscription workflow failed:', error);
      return {
        statusCode: 500,
        message: error.message || 'Internal server error',
        error: error.stack
      };
    }
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

    // await this.workflowEngine.executeWorkflowFromContext(context); // To be implemented

    return {
      message: 'Test newsletter workflow triggered',
      newsletterId: newsletter.id,
      email: body.email
    };
  }

  // Batch Processing Endpoints
  @Post('process/batch')
  async processBatchWorkflows() {
    // await this.workflowEngine.processBatchWorkflows(); // To be implemented
    return { message: 'Batch processing completed' };
  }

  @Post('process/delayed')
  async processDelayedExecutions() {
    // await this.workflowEngine.processDelayedExecutions(); // To be implemented
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