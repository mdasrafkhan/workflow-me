import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { SubscriptionPurchaseService } from '../services/subscription-purchase.service';
import {
  CreateSubscriptionDto,
  SubscriptionResponseDto,
  CancelSubscriptionDto,
  SubscriptionStatisticsDto,
  SubscriptionTypeDto
} from '../dto/subscription-purchase.dto';

@Controller('subscriptions')
export class SubscriptionPurchaseController {
  constructor(
    private readonly subscriptionPurchaseService: SubscriptionPurchaseService,
  ) {}

  /**
   * Create a new subscription when a user purchases one
   */
  @Post('purchase')
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    return await this.subscriptionPurchaseService.createSubscription(createSubscriptionDto);
  }

  /**
   * Get subscription by ID
   */
  @Get(':subscriptionId')
  async getSubscription(
    @Param('subscriptionId') subscriptionId: string
  ): Promise<SubscriptionResponseDto | null> {
    const subscription = await this.subscriptionPurchaseService.getSubscriptionById(subscriptionId);

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      product: subscription.product,
      status: subscription.status,
      amount: subscription.amount,
      currency: subscription.currency,
      expiresAt: subscription.expiresAt,
      createdAt: subscription.createdAt,
      subscriptionType: {
        id: subscription.subscriptionType.id,
        name: subscription.subscriptionType.name,
        displayName: subscription.subscriptionType.displayName,
        billingCycle: subscription.subscriptionType.billingCycle,
        features: subscription.subscriptionType.features || []
      }
    };
  }

  /**
   * Get all subscriptions for a user
   */
  @Get('user/:userId')
  async getUserSubscriptions(
    @Param('userId') userId: string
  ): Promise<SubscriptionResponseDto[]> {
    const subscriptions = await this.subscriptionPurchaseService.getUserSubscriptions(userId);

    return subscriptions.map(subscription => ({
      id: subscription.id,
      userId: subscription.userId,
      product: subscription.product,
      status: subscription.status,
      amount: subscription.amount,
      currency: subscription.currency,
      expiresAt: subscription.expiresAt,
      createdAt: subscription.createdAt,
      subscriptionType: {
        id: subscription.subscriptionType.id,
        name: subscription.subscriptionType.name,
        displayName: subscription.subscriptionType.displayName,
        billingCycle: subscription.subscriptionType.billingCycle,
        features: subscription.subscriptionType.features || []
      }
    }));
  }

  /**
   * Cancel a subscription
   */
  @Put(':subscriptionId/cancel')
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() cancelSubscriptionDto: CancelSubscriptionDto
  ): Promise<{ message: string; subscription: SubscriptionResponseDto }> {
    const subscription = await this.subscriptionPurchaseService.cancelSubscription(
      subscriptionId,
      cancelSubscriptionDto.reason
    );

    return {
      message: 'Subscription cancelled successfully',
      subscription: {
        id: subscription.id,
        userId: subscription.userId,
        product: subscription.product,
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        expiresAt: subscription.expiresAt,
        createdAt: subscription.createdAt,
        subscriptionType: {
          id: subscription.subscriptionType.id,
          name: subscription.subscriptionType.name,
          displayName: subscription.subscriptionType.displayName,
          billingCycle: subscription.subscriptionType.billingCycle,
          features: subscription.subscriptionType.features || []
        }
      }
    };
  }

  /**
   * Get available subscription types
   */
  @Get('types/available')
  async getAvailableSubscriptionTypes(
    @Query('product') product?: string
  ): Promise<SubscriptionTypeDto[]> {
    const subscriptionTypes = await this.subscriptionPurchaseService.getAvailableSubscriptionTypes(product);

    return subscriptionTypes.map(type => ({
      id: type.id,
      name: type.name,
      displayName: type.displayName,
      description: type.description,
      price: type.price,
      currency: type.currency,
      billingCycle: type.billingCycle,
      isActive: type.isActive,
      features: type.features || [],
      metadata: type.metadata,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt
    }));
  }

  /**
   * Get subscription statistics
   */
  @Get('statistics/overview')
  async getSubscriptionStatistics(): Promise<SubscriptionStatisticsDto> {
    return await this.subscriptionPurchaseService.getSubscriptionStatistics();
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }
}
