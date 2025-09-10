import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DummySubscription } from '../database/entities/dummy-subscription.entity';
import { DummyUser } from '../database/entities/dummy-user.entity';
import { DummySubscriptionType } from '../database/entities/dummy-subscription-type.entity';

export interface CreateSubscriptionRequest {
  userId: string;
  product: string;
  subscriptionTypeId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentReference?: string;
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionResponse {
  id: string;
  userId: string;
  product: string;
  status: string;
  amount: number;
  currency: string;
  expiresAt: Date;
  createdAt: Date;
  subscriptionType: {
    id: string;
    name: string;
    displayName: string;
    billingCycle: string;
    features: string[];
  };
}

@Injectable()
export class SubscriptionPurchaseService {
  private readonly logger = new Logger(SubscriptionPurchaseService.name);

  constructor(
    @InjectRepository(DummySubscription)
    private readonly subscriptionRepository: Repository<DummySubscription>,
    @InjectRepository(DummyUser)
    private readonly userRepository: Repository<DummyUser>,
    @InjectRepository(DummySubscriptionType)
    private readonly subscriptionTypeRepository: Repository<DummySubscriptionType>,
  ) {}

  /**
   * Create a new subscription when a user purchases one
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> {
    this.logger.log(`Creating subscription for user ${request.userId}, product: ${request.product}`);

    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: request.userId }
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${request.userId} not found`);
    }

    // Get subscription type
    let subscriptionType: DummySubscriptionType;
    if (request.subscriptionTypeId) {
      subscriptionType = await this.subscriptionTypeRepository.findOne({
        where: { id: request.subscriptionTypeId }
      });
      if (!subscriptionType) {
        throw new NotFoundException(`Subscription type with ID ${request.subscriptionTypeId} not found`);
      }
    } else {
      // Find subscription type by product
      subscriptionType = await this.subscriptionTypeRepository
        .createQueryBuilder('subscriptionType')
        .where('subscriptionType.metadata ->> :key = :value', {
          key: 'product',
          value: request.product
        })
        .andWhere('subscriptionType.isActive = :isActive', { isActive: true })
        .getOne();

      if (!subscriptionType) {
        throw new NotFoundException(`No active subscription type found for product: ${request.product}`);
      }
    }

    // Calculate subscription details
    const amount = request.amount ?? subscriptionType.price;
    const currency = request.currency ?? subscriptionType.currency;
    const expiresAt = this.calculateExpirationDate(subscriptionType.billingCycle);

    // Create subscription
    const subscription = this.subscriptionRepository.create({
      userId: request.userId,
      subscriptionTypeId: subscriptionType.id,
      product: request.product,
      status: 'active',
      amount,
      currency,
      expiresAt,
      workflowProcessed: false,
      metadata: {
        createdBy: 'subscription-purchase-service',
        paymentMethod: request.paymentMethod,
        paymentReference: request.paymentReference,
        ...request.metadata
      }
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    this.logger.log(`Successfully created subscription ${savedSubscription.id} for user ${request.userId}`);

    return {
      id: savedSubscription.id,
      userId: savedSubscription.userId,
      product: savedSubscription.product,
      status: savedSubscription.status,
      amount: savedSubscription.amount,
      currency: savedSubscription.currency,
      expiresAt: savedSubscription.expiresAt,
      createdAt: savedSubscription.createdAt,
      subscriptionType: {
        id: subscriptionType.id,
        name: subscriptionType.name,
        displayName: subscriptionType.displayName,
        billingCycle: subscriptionType.billingCycle,
        features: subscriptionType.features || []
      }
    };
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
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<DummySubscription[]> {
    return await this.subscriptionRepository.find({
      where: { userId },
      relations: ['subscriptionType'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<DummySubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
    }

    if (subscription.status !== 'active') {
      throw new BadRequestException(`Subscription ${subscriptionId} is not active and cannot be cancelled`);
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.metadata = {
      ...subscription.metadata,
      cancellationReason: reason,
      cancelledBy: 'subscription-purchase-service'
    };

    const updatedSubscription = await this.subscriptionRepository.save(subscription);
    this.logger.log(`Cancelled subscription ${subscriptionId}`);

    return updatedSubscription;
  }

  /**
   * Get available subscription types for a product
   */
  async getAvailableSubscriptionTypes(product?: string): Promise<DummySubscriptionType[]> {
    const query = this.subscriptionTypeRepository
      .createQueryBuilder('subscriptionType')
      .where('subscriptionType.isActive = :isActive', { isActive: true });

    if (product) {
      query.andWhere('subscriptionType.metadata ->> :key = :value', {
        key: 'product',
        value: product
      });
    }

    return await query.getMany();
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStatistics(): Promise<{
    total: number;
    active: number;
    cancelled: number;
    expired: number;
    byProduct: Record<string, number>;
    byStatus: Record<string, number>;
    revenue: {
      total: number;
      byProduct: Record<string, number>;
      byCurrency: Record<string, number>;
    };
  }> {
    const total = await this.subscriptionRepository.count();

    const active = await this.subscriptionRepository.count({
      where: { status: 'active' }
    });

    const cancelled = await this.subscriptionRepository.count({
      where: { status: 'cancelled' }
    });

    const expired = await this.subscriptionRepository.count({
      where: { status: 'expired' }
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

    // Get revenue statistics
    const revenueResult = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('subscription.product', 'product')
      .addSelect('subscription.currency', 'currency')
      .addSelect('SUM(subscription.amount)', 'total')
      .where('subscription.status = :status', { status: 'active' })
      .groupBy('subscription.product, subscription.currency')
      .getRawMany();

    const revenue = {
      total: 0,
      byProduct: {} as Record<string, number>,
      byCurrency: {} as Record<string, number>
    };

    revenueResult.forEach(item => {
      const amount = parseFloat(item.total) || 0;
      revenue.total += amount;
      revenue.byProduct[item.product] = (revenue.byProduct[item.product] || 0) + amount;
      revenue.byCurrency[item.currency] = (revenue.byCurrency[item.currency] || 0) + amount;
    });

    return {
      total,
      active,
      cancelled,
      expired,
      byProduct,
      byStatus,
      revenue
    };
  }

  /**
   * Calculate expiration date based on billing cycle
   */
  private calculateExpirationDate(billingCycle: string): Date {
    const now = new Date();

    switch (billingCycle) {
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'yearly':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      case 'lifetime':
        return new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days
    }
  }
}
