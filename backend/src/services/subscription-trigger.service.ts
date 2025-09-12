import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DummySubscription } from '../database/entities/dummy-subscription.entity';
import { DummyUser } from '../database/entities/dummy-user.entity';
import { DummySubscriptionType } from '../database/entities/dummy-subscription-type.entity';
import { WorkflowExecutionSchedule } from '../database/entities/workflow-execution-schedule.entity';
import { WorkflowExecutionContext, TriggerData } from '../workflow/types';
import { VisualWorkflow } from '../workflow/visual-workflow.entity';
import { WorkflowTrigger, WorkflowTriggerContext, WorkflowTriggerResult } from '../workflow/interfaces/workflow-trigger.interface';

@Injectable()
export class SubscriptionTriggerService implements WorkflowTrigger {
  private readonly logger = new Logger(SubscriptionTriggerService.name);

  // WorkflowTrigger interface implementation
  readonly triggerType = 'subscription_created';
  readonly version = '1.0.0';
  readonly name = 'Subscription Created Trigger';
  readonly description = 'Triggers workflow when a user creates a subscription';

  constructor(
    @InjectRepository(DummySubscription)
    private readonly subscriptionRepository: Repository<DummySubscription>,
    @InjectRepository(DummyUser)
    private readonly userRepository: Repository<DummyUser>,
    @InjectRepository(DummySubscriptionType)
    private readonly subscriptionTypeRepository: Repository<DummySubscriptionType>,
    @InjectRepository(WorkflowExecutionSchedule)
    private readonly executionScheduleRepository: Repository<WorkflowExecutionSchedule>,
    @InjectRepository(VisualWorkflow)
    private readonly workflowRepository: Repository<VisualWorkflow>,
  ) {}

  // ============================================================================
  // WorkflowTrigger Interface Implementation
  // ============================================================================

  /**
   * Validate subscription trigger data
   */
  validate(data: any): {
    isValid: boolean;
    context?: WorkflowTriggerContext;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Validate required fields
    if (!data.subscriptionId) {
      errors.push('subscriptionId is required');
    }
    if (!data.userId) {
      errors.push('userId is required');
    }
    if (!data.product) {
      errors.push('product is required');
    }
    if (!data.status) {
      errors.push('status is required');
    }
    if (!data.user) {
      errors.push('user data is required');
    }
    if (!data.user.email) {
      errors.push('user email is required');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Create standardized context
    const context: WorkflowTriggerContext = {
      executionId: `sub_${data.subscriptionId}_${Date.now()}`,
      workflowId: this.determineWorkflowId(data.product),
      triggerType: this.triggerType,
      triggerId: data.subscriptionId,
      userId: data.userId,
      timestamp: new Date(data.createdAt || Date.now()),
      entityData: {
        id: data.subscriptionId,
        type: 'subscription',
        data: {
          subscriptionId: data.subscriptionId,
          product: data.product,
          product_package: data.product_package || data.product,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          user: data.user,
          subscriptionType: data.subscriptionType,
          metadata: data.metadata,
          createdAt: data.createdAt
        }
      },
      triggerMetadata: {
        source: 'subscription_created',
        version: this.version,
        priority: 'high',
        retryable: true,
        timeout: 30000 // 30 seconds
      },
      executionMetadata: {
        correlationId: data.correlationId,
        sessionId: data.sessionId,
        requestId: data.requestId,
        tags: ['subscription', 'created', 'user']
      }
    };

    return { isValid: true, context };
  }

  /**
   * Process subscription trigger data
   */
  async process(data: any): Promise<WorkflowTriggerResult> {
    try {
      // Validate first
      const validation = this.validate(data);
      if (!validation.isValid) {
        return {
          success: false,
          context: null as any,
          error: `Validation failed: ${validation.errors?.join(', ')}`
        };
      }

      // Additional processing logic here (e.g., enrich data, call external APIs)
      const enrichedData = await this.enrichSubscriptionData(validation.context!);

      return {
        success: true,
        context: enrichedData,
        metadata: {
          processedAt: new Date().toISOString(),
          enrichmentApplied: true
        }
      };
    } catch (error) {
      return {
        success: false,
        context: null as any,
        error: `Processing failed: ${error.message}`
      };
    }
  }

  /**
   * Get workflow ID for subscription
   */
  getWorkflowId(context: WorkflowTriggerContext): string {
    const product = context.entityData.data.product;
    return this.determineWorkflowId(product);
  }

  /**
   * Check if this trigger should execute
   */
  shouldExecute(context: WorkflowTriggerContext): boolean {
    const subscriptionData = context.entityData.data;

    // Only execute for active subscriptions
    if (subscriptionData.status !== 'active') {
      return false;
    }

    // Only execute if user is active
    if (!subscriptionData.user.isActive) {
      return false;
    }

    return true;
  }

  /**
   * Enrich subscription data with additional information
   */
  private async enrichSubscriptionData(context: WorkflowTriggerContext): Promise<WorkflowTriggerContext> {
    // Example: Add enriched data here
    const enrichedData = {
      ...context.entityData.data,
      enrichedAt: new Date().toISOString(),
      riskScore: this.calculateRiskScore(context.entityData.data),
      userSegment: this.determineUserSegment(context.entityData.data)
    };

    return {
      ...context,
      entityData: {
        ...context.entityData,
        data: enrichedData
      }
    };
  }

  private calculateRiskScore(subscriptionData: any): number {
    // Simple risk scoring
    let score = 0;

    if (subscriptionData.user.phoneNumber) score += 10;
    if (subscriptionData.amount > 0) score += 20;
    if (subscriptionData.subscriptionType?.features?.length > 0) score += 5;

    return Math.min(score, 100);
  }

  private determineUserSegment(subscriptionData: any): string {
    // Simple segmentation logic
    if (subscriptionData.product === 'premium') {
      return 'premium';
    } else if (subscriptionData.amount > 50) {
      return 'high_value';
    } else {
      return 'standard';
    }
  }

  /**
   * Look up workflow by name and return the actual workflow ID
   */
  private async lookupWorkflowByName(workflowName: string): Promise<string | null> {
    try {
      const workflow = await this.workflowRepository.findOne({
        where: { name: workflowName }
      });

      if (workflow) {
        this.logger.log(`Found workflow: ${workflowName} -> ${workflow.id}`);
        return workflow.id;
      } else {
        this.logger.warn(`Workflow not found by name: ${workflowName}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error looking up workflow by name ${workflowName}:`, error);
      return null;
    }
  }

  /**
   * Retrieve all new subscriptions that need workflow processing
   */
  async retrieveTriggerData(workflowIdOrName: string): Promise<TriggerData[]> {
    const triggerType = 'user_buys_subscription';

    // Check if the input is a workflow name or ID
    let workflowId: string;

    // If it looks like a UUID, use it directly; otherwise, look it up by name
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(workflowIdOrName)) {
      workflowId = workflowIdOrName;
    } else {
      // Look up workflow by name
      const lookedUpId = await this.lookupWorkflowByName(workflowIdOrName);
      if (!lookedUpId) {
        this.logger.warn(`No subscriptions to process - workflow not found: ${workflowIdOrName}`);
        return [];
      }
      workflowId = lookedUpId;
    }

    // Get or create execution schedule record for this specific workflow
    let executionSchedule = await this.executionScheduleRepository.findOne({
      where: { workflowId, triggerType }
    });

    if (!executionSchedule) {
      // First run for this workflow - process subscriptions from 1 hour ago
      executionSchedule = this.executionScheduleRepository.create({
        workflowId,
        triggerType,
        lastExecutionTime: new Date(Date.now() - 60 * 60 * 1000)
      });
      await this.executionScheduleRepository.save(executionSchedule);
    }

    const cutoff = executionSchedule.lastExecutionTime;

    const subscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .leftJoinAndSelect('subscription.subscriptionType', 'subscriptionType')
      .where('subscription.createdAt > :cutoff', { cutoff })
      .andWhere('subscription.workflowProcessed = :processed', { processed: false })
      .andWhere('subscription.status = :status', { status: 'active' })
      .orderBy('subscription.createdAt', 'ASC')
      .getMany();

    // Only log when subscriptions are found
    if (subscriptions.length > 0) {
      this.logger.log(`Found ${subscriptions.length} new subscriptions to process for workflow ${workflowId} since ${cutoff.toISOString()}`);
    }

    return subscriptions.map(subscription => ({
      id: subscription.id,
      userId: subscription.userId,
      triggerType: 'subscription_created',
      data: {
        subscriptionId: subscription.id,
        product: subscription.product,
        product_package: subscription.product, // Add product_package for workflow compatibility
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        user: {
          id: subscription.user.id,
          email: subscription.user.email,
          name: subscription.user.name,
          phoneNumber: subscription.user.phoneNumber,
          timezone: subscription.user.timezone
        },
        subscriptionType: subscription.subscriptionType ? {
          id: subscription.subscriptionType.id,
          name: subscription.subscriptionType.name,
          displayName: subscription.subscriptionType.displayName,
          price: subscription.subscriptionType.price,
          billingCycle: subscription.subscriptionType.billingCycle,
          features: subscription.subscriptionType.features
        } : null,
        metadata: subscription.metadata,
        createdAt: subscription.createdAt
      },
      createdAt: subscription.createdAt
    }));
  }

  /**
   * Process a single subscription trigger
   */
  async processTrigger(triggerData: TriggerData): Promise<WorkflowExecutionContext> {
    this.logger.log(`Processing subscription trigger: ${triggerData.id}`);

    const executionContext: WorkflowExecutionContext = {
      executionId: `sub_${triggerData.id}_${Date.now()}`,
      workflowId: this.determineWorkflowId(triggerData.data.product),
      triggerType: 'subscription_created',
      triggerId: triggerData.id,
      userId: triggerData.userId,
      triggerData: triggerData.data,
      data: triggerData.data,
      metadata: {
        product: triggerData.data.product,
        userEmail: triggerData.data.user.email,
        userName: triggerData.data.user.name,
        subscriptionId: triggerData.id,
        amount: triggerData.data.amount,
        currency: triggerData.data.currency,
        subscriptionType: triggerData.data.subscriptionType?.name,
        features: triggerData.data.subscriptionType?.features || []
      },
      createdAt: new Date()
    };

    this.logger.log(`Created execution context for workflow: ${executionContext.workflowId}`);
    return executionContext;
  }

  /**
   * Mark subscription as processed
   */
  async markAsProcessed(subscriptionId: string): Promise<void> {
    await this.subscriptionRepository.update(subscriptionId, {
      workflowProcessed: true
    });
    this.logger.log(`Marked subscription ${subscriptionId} as processed`);
  }

  /**
   * Update last execution time for subscription workflow processing
   * This should be called by the caller after all subscriptions are processed successfully
   */
  async updateLastExecutionTime(workflowId: string, triggerType: string = 'user_buys_subscription'): Promise<void> {
    await this.executionScheduleRepository.update(
      { workflowId, triggerType },
      { lastExecutionTime: new Date() }
    );
    this.logger.log(`Updated last execution time for workflow ${workflowId}`);
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(subscriptionId: string): Promise<DummySubscription | null> {
    return await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['user', 'subscriptionType']
    });
  }

  /**
   * Create a new subscription (for testing)
   */
  async createSubscription(
    userId: string,
    product: string,
    subscriptionTypeId?: string
  ): Promise<DummySubscription> {
    // Get subscription type if not provided
    if (!subscriptionTypeId) {
      const subscriptionType = await this.subscriptionTypeRepository
        .createQueryBuilder('subscriptionType')
        .where('subscriptionType.metadata ->> :key = :value', { key: 'product', value: product })
        .getOne();
      subscriptionTypeId = subscriptionType?.id;
    }

    if (!subscriptionTypeId) {
      throw new Error(`No subscription type found for product: ${product}`);
    }

    const subscription = this.subscriptionRepository.create({
      userId,
      subscriptionTypeId,
      product,
      status: 'active',
      amount: 0, // Will be set from subscription type
      currency: 'USD',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      workflowProcessed: false,
      metadata: { createdBy: 'subscription-trigger-service' }
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);
    this.logger.log(`Created new subscription: ${savedSubscription.id} for product: ${product}`);
    return savedSubscription;
  }

  /**
   * Get subscription statistics
   */
  async getStatistics(): Promise<{
    total: number;
    processed: number;
    pending: number;
    byProduct: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const total = await this.subscriptionRepository.count();
    const processed = await this.subscriptionRepository.count({
      where: { workflowProcessed: true }
    });
    const pending = await this.subscriptionRepository.count({
      where: { workflowProcessed: false }
    });

    // Get subscriptions by product
    const byProductResult = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('subscription.product', 'product')
      .addSelect('COUNT(*)', 'count')
      .groupBy('subscription.product')
      .getRawMany();

    const byProduct = byProductResult.reduce((acc, item) => {
      acc[item.product] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    // Get subscriptions by status
    const byStatusResult = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('subscription.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('subscription.status')
      .getRawMany();

    const byStatus = byStatusResult.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      processed,
      pending,
      byProduct,
      byStatus
    };
  }

  /**
   * Determine workflow ID based on product
   */
  private determineWorkflowId(product: string): string {
    const workflowMap = {
      'united': 'segmented-welcome-flow',
      'podcast': 'segmented-welcome-flow',
      'newsletter': 'newsletter-welcome-flow',
      'premium': 'segmented-welcome-flow',
      'default': 'generic-welcome-flow'
    };

    return workflowMap[product] || workflowMap['default'];
  }

  /**
   * Get unprocessed subscriptions for a specific time range
   */
  async getUnprocessedSubscriptions(
    startDate: Date,
    endDate: Date
  ): Promise<DummySubscription[]> {
    return await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .leftJoinAndSelect('subscription.subscriptionType', 'subscriptionType')
      .where('subscription.createdAt >= :startDate', { startDate })
      .andWhere('subscription.createdAt <= :endDate', { endDate })
      .andWhere('subscription.workflowProcessed = :processed', { processed: false })
      .andWhere('subscription.status = :status', { status: 'active' })
      .orderBy('subscription.createdAt', 'ASC')
      .getMany();
  }

  /**
   * Retry failed subscriptions
   */
  async retryFailedSubscriptions(): Promise<number> {
    const failedSubscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.workflowProcessed = :processed', { processed: false })
      .andWhere('subscription.status = :status', { status: 'active' })
      .andWhere('subscription.createdAt < :cutoff', {
        cutoff: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      })
      .getMany();

    this.logger.log(`Found ${failedSubscriptions.length} subscriptions to retry`);
    return failedSubscriptions.length;
  }
}
