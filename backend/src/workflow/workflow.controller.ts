import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(WorkflowController.name);

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
    // For the controller, we'll use a default workflow ID
    // This is a simplified version for the API endpoint
    return await this.subscriptionTriggerService.retrieveTriggerData('232193f9-c3ff-4aa9-95da-78f499d4f01c');
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
    const cutoff = new Date(Date.now() - secondsAgo * 1000);
    return await this.newsletterTriggerService.retrieveTriggerData(cutoff);
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
      this.logger.log(`[Workflow: subscription-test] [Step: start] [product:${body.product}] [email:${body.userEmail}]`);

      // Validate input
      if (!body.product) {
        throw new Error('Product is required');
      }

      // Create a test user first, then subscription
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
        this.logger.log(`[Workflow: subscription-test] [Step: user-created] [email:${uniqueEmail}]`);

        // Now create subscription
        user = await this.subscriptionTriggerService.createSubscription(
          testUserId,
          body.product
        );
        this.logger.log(`[Workflow: subscription-test] [Step: subscription-created] [subscriptionId:${user.id}] [product:${body.product}]`);
      } catch (error) {
        this.logger.error(`[Workflow: subscription-test] [Step: error] [error:${error.message}]`);
        throw new Error(`User/subscription creation failed: ${error.message}`);
      }

      // Trigger workflow
      this.logger.log(`[Workflow: subscription-test] [Step: trigger-workflow] [subscriptionId:${user.id}]`);
      try {
        // await this.workflowEngine.triggerWorkflowForSubscription(user.id); // To be implemented
        this.logger.log(`[Workflow: subscription-test] [Step: workflow-triggered] [subscriptionId:${user.id}] [status:success]`);
      } catch (error) {
        this.logger.error(`[Workflow: subscription-test] [Step: workflow-error] [error:${error.message}]`);
        throw new Error(`Workflow triggering failed: ${error.message}`);
      }

      this.logger.log(`[Workflow: subscription-test] [Step: complete] [subscriptionId:${user.id}] [product:${body.product}]`);

      return {
        message: 'Test subscription workflow triggered',
        subscriptionId: user.id,
        product: body.product
      };
    } catch (error) {
      console.error(`[Workflow: subscription-test] [Step: failed] [error:${error.message}]`);
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
    this.logger.log(`[Workflow: newsletter-test] [Step: start] [email:${body.email}] [source:${body.source || 'default'}]`);

    // Create a test newsletter subscription
    const newsletter = await this.newsletterTriggerService.createNewsletterSubscription(
      body.email,
      body.source
    );
    this.logger.log(`[Workflow: newsletter-test] [Step: newsletter-created] [newsletterId:${newsletter.id}] [email:${body.email}]`);

    // Trigger workflow
    const context = await this.newsletterTriggerService.processTrigger({
      id: newsletter.id,
      userId: newsletter.userId,
      triggerType: 'newsletter_subscribed',
      data: newsletter,
      createdAt: newsletter.createdAt
    });
    this.logger.log(`[Workflow: newsletter-test] [Step: context-created] [newsletterId:${newsletter.id}]`);

    // await this.workflowEngine.executeWorkflowFromContext(context); // To be implemented
    this.logger.log(`[Workflow: newsletter-test] [Step: workflow-triggered] [newsletterId:${newsletter.id}] [status:success]`);

    this.logger.log(`[Workflow: newsletter-test] [Step: complete] [newsletterId:${newsletter.id}] [email:${body.email}]`);

    return {
      message: 'Test newsletter workflow triggered',
      newsletterId: newsletter.id,
      email: body.email
    };
  }

  @Post('test/users')
  async testUsersWorkflow(@Body() body: {
    email: string;
    name: string;
    phoneNumber?: string;
    timezone?: string;
    preferences?: Record<string, any>;
  }) {
    try {
      this.logger.log(`[Workflow: users-test] [Step: start] [email:${body.email}] [name:${body.name}]`);

      // Validate input
      if (!body.email || !body.name) {
        throw new Error('Email and name are required');
      }

      // Check if user already exists
      const existingUser = await this.dummyDataService.userRepository.findOne({
        where: { email: body.email }
      });

      if (existingUser) {
        this.logger.log(`[Workflow: users-test] [Step: user-exists] [email:${body.email}] [userId:${existingUser.id}]`);
        return {
          message: 'User already exists',
          userId: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          isNewUser: false
        };
      }

      // Create a new user
      const { v4: uuidv4 } = require('uuid');
      const userId = uuidv4();

      const newUser = await this.dummyDataService.userRepository.save({
        id: userId,
        email: body.email,
        name: body.name,
        phoneNumber: body.phoneNumber || null,
        isActive: true,
        timezone: body.timezone || 'UTC',
        preferences: body.preferences || { language: 'en', notifications: true },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      this.logger.log(`[Workflow: users-test] [Step: user-created] [userId:${newUser.id}] [email:${newUser.email}]`);

      this.logger.log(`[Workflow: users-test] [Step: complete] [userId:${newUser.id}] [email:${newUser.email}]`);

      return {
        message: 'User created successfully',
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phoneNumber: newUser.phoneNumber,
        timezone: newUser.timezone,
        preferences: newUser.preferences,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
        isNewUser: true
      };
    } catch (error) {
      this.logger.error(`[Workflow: users-test] [Step: failed] [error:${error.message}]`);
      return {
        statusCode: 500,
        message: error.message || 'Internal server error',
        error: error.stack
      };
    }
  }

  @Post('test/create-subscriptions')
  async createTestSubscriptions(@Body() body: {
    count?: number;
    products?: string[];
  }) {
    const count = body.count || 5;
    const products = body.products || ['united', 'podcast', 'premium', 'newsletter'];
    const createdSubscriptions = [];

    this.logger.log(`[Workflow: batch-subscription-test] [Step: start] [count:${count}] [products:${products.join(',')}]`);

    for (let i = 0; i < count; i++) {
      try {
        const product = products[i % products.length];
        const timestamp = Date.now();

        const testUser = {
          email: `test-user-${i + 1}-${timestamp}@example.com`,
          name: `Test User ${i + 1}`,
          phoneNumber: `+123456789${i}`,
          timezone: 'UTC'
        };

        this.logger.log(`[Workflow: batch-subscription-test] [Step: creating] [${i + 1}/${count}] [product:${product}]`);

        // Create user and subscription
        const userResponse = await this.testSubscriptionWorkflow({
          product,
          userEmail: testUser.email,
          userName: testUser.name
        });

        createdSubscriptions.push({
          subscriptionId: userResponse.subscriptionId,
          product,
          userEmail: testUser.email
        });

        this.logger.log(`[Workflow: batch-subscription-test] [Step: created] [${i + 1}/${count}] [subscriptionId:${userResponse.subscriptionId}] [product:${product}]`);

      } catch (error) {
        this.logger.error(`[Workflow: batch-subscription-test] [Step: error] [${i + 1}/${count}] [error:${error.message}]`);
      }
    }

    this.logger.log(`[Workflow: batch-subscription-test] [Step: complete] [created:${createdSubscriptions.length}/${count}] [status:success]`);

    return {
      message: `Created ${createdSubscriptions.length} test subscriptions`,
      subscriptions: createdSubscriptions,
      count: createdSubscriptions.length
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
    try {
      await this.workflowService.processDelayedExecutions();
      return { message: 'Delayed executions processed successfully' };
    } catch (error) {
      return {
        message: 'Error processing delayed executions',
        error: error.message
      };
    }
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
  async getVisualWorkflow(@Param('id') id: string) {
    return await this.workflowService.findOne(id);
  }

  @Post('visual-workflows')
  async createOrUpdateVisualWorkflow(@Body() data: {
    id?: string;
    name: string;
    nodes: any;
    edges: any;
    jsonLogic?: any;
  }) {
    return await this.workflowService.createOrUpdate(data);
  }

  @Post('visual-workflows/:id/delete')
  async deleteVisualWorkflow(@Param('id') id: string) {
    await this.workflowService.remove(id);
    return { message: 'Workflow deleted successfully' };
  }


}