import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DummySubscription } from '../database/entities/dummy-subscription.entity';
import { DummyUser } from '../database/entities/dummy-user.entity';
import { DummySubscriptionType } from '../database/entities/dummy-subscription-type.entity';
import { WorkflowExecutionSchedule } from '../database/entities/workflow-execution-schedule.entity';
import { WorkflowExecutionContext, TriggerData } from '../workflow/types';
import { VisualWorkflow } from '../workflow/visual-workflow.entity';

@Injectable()
export class SubscriptionTriggerService {
  private readonly logger = new Logger(SubscriptionTriggerService.name);

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
