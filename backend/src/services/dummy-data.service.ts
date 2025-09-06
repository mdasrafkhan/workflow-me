import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DummyUser } from '../database/entities/dummy-user.entity';
import { DummySubscription } from '../database/entities/dummy-subscription.entity';
import { DummySubscriptionType } from '../database/entities/dummy-subscription-type.entity';
import { DummyNewsletter } from '../database/entities/dummy-newsletter.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../database/entities/workflow-delay.entity';
import { EmailLog } from '../database/entities/email-log.entity';

@Injectable()
export class DummyDataService {
  constructor(
    @InjectRepository(DummyUser)
    public readonly userRepository: Repository<DummyUser>,
    @InjectRepository(DummySubscription)
    public readonly subscriptionRepository: Repository<DummySubscription>,
    @InjectRepository(DummySubscriptionType)
    public readonly subscriptionTypeRepository: Repository<DummySubscriptionType>,
    @InjectRepository(DummyNewsletter)
    public readonly newsletterRepository: Repository<DummyNewsletter>,
    @InjectRepository(WorkflowExecution)
    public readonly executionRepository: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowDelay)
    public readonly delayRepository: Repository<WorkflowDelay>,
    @InjectRepository(EmailLog)
    public readonly emailLogRepository: Repository<EmailLog>,
  ) {}

  // Initialize dummy data
  async initializeDummyData(): Promise<void> {
    console.log('Initializing dummy data...');

    // Create subscription types
    await this.createSubscriptionTypes();

    // Create users
    await this.createUsers();

    // Create newsletters
    await this.createNewsletters();

    console.log('Dummy data initialized successfully');
  }

  private async createSubscriptionTypes(): Promise<void> {
    const subscriptionTypes = [
      {
        name: 'united_basic',
        displayName: 'United Basic',
        description: 'Basic United subscription',
        price: 9.99,
        currency: 'USD',
        billingCycle: 'monthly' as const,
        features: ['united_content', 'basic_support'],
        metadata: { product: 'united', tier: 'basic' }
      },
      {
        name: 'united_premium',
        displayName: 'United Premium',
        description: 'Premium United subscription',
        price: 19.99,
        currency: 'USD',
        billingCycle: 'monthly' as const,
        features: ['united_content', 'premium_support', 'exclusive_content'],
        metadata: { product: 'united', tier: 'premium' }
      },
      {
        name: 'podcast_basic',
        displayName: 'Podcast Basic',
        description: 'Basic Podcast subscription',
        price: 4.99,
        currency: 'USD',
        billingCycle: 'monthly' as const,
        features: ['podcast_access', 'basic_support'],
        metadata: { product: 'podcast', tier: 'basic' }
      },
      {
        name: 'newsletter_free',
        displayName: 'Newsletter Free',
        description: 'Free newsletter subscription',
        price: 0.00,
        currency: 'USD',
        billingCycle: 'monthly' as const,
        features: ['newsletter_access'],
        metadata: { product: 'newsletter', tier: 'free' }
      }
    ];

    for (const typeData of subscriptionTypes) {
      const existing = await this.subscriptionTypeRepository.findOne({
        where: { name: typeData.name }
      });

      if (!existing) {
        const subscriptionType = this.subscriptionTypeRepository.create(typeData);
        await this.subscriptionTypeRepository.save(subscriptionType);
        console.log(`Created subscription type: ${typeData.displayName}`);
      }
    }
  }

  private async createUsers(): Promise<void> {
    const users = [
      {
        email: 'john.doe@example.com',
        name: 'John Doe',
        phoneNumber: '+1234567890',
        timezone: 'America/New_York',
        preferences: { language: 'en', notifications: true }
      },
      {
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        phoneNumber: '+1234567891',
        timezone: 'America/Los_Angeles',
        preferences: { language: 'en', notifications: true }
      },
      {
        email: 'bob.wilson@example.com',
        name: 'Bob Wilson',
        phoneNumber: '+1234567892',
        timezone: 'Europe/London',
        preferences: { language: 'en', notifications: false }
      },
      {
        email: 'alice.brown@example.com',
        name: 'Alice Brown',
        phoneNumber: '+1234567893',
        timezone: 'Asia/Tokyo',
        preferences: { language: 'ja', notifications: true }
      },
      {
        email: 'charlie.davis@example.com',
        name: 'Charlie Davis',
        phoneNumber: '+1234567894',
        timezone: 'Australia/Sydney',
        preferences: { language: 'en', notifications: true }
      }
    ];

    for (const userData of users) {
      const existing = await this.userRepository.findOne({
        where: { email: userData.email }
      });

      if (!existing) {
        const user = this.userRepository.create(userData);
        await this.userRepository.save(user);
        console.log(`Created user: ${userData.name}`);
      }
    }
  }

  private async createNewsletters(): Promise<void> {
    const users = await this.userRepository.find();

    for (const user of users) {
      const existing = await this.newsletterRepository.findOne({
        where: { userId: user.id }
      });

      if (!existing) {
        const newsletter = this.newsletterRepository.create({
          userId: user.id,
          email: user.email,
          status: 'subscribed',
          emailVerified: true,
          source: 'website',
          preferences: {
            frequency: 'weekly',
            categories: ['technology', 'business'],
            language: 'en'
          },
          subscribedAt: new Date()
        });

        await this.newsletterRepository.save(newsletter);
        console.log(`Created newsletter subscription for: ${user.name}`);
      }
    }
  }

  // Create a new subscription (for testing)
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
      metadata: { createdBy: 'test' }
    });

    return await this.subscriptionRepository.save(subscription);
  }

  // Create a new newsletter subscription (for testing)
  async createNewsletterSubscription(
    email: string,
    source: string = 'website'
  ): Promise<DummyNewsletter> {
    // Find or create user
    let user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      user = this.userRepository.create({
        email,
        name: email.split('@')[0],
        isActive: true,
        timezone: 'UTC'
      });
      user = await this.userRepository.save(user);
    }

    const newsletter = this.newsletterRepository.create({
      userId: user.id,
      email,
      status: 'subscribed',
      emailVerified: true,
      source,
      preferences: {
        frequency: 'weekly',
        categories: ['general'],
        language: 'en'
      },
      subscribedAt: new Date(),
      workflowProcessed: false
    });

    return await this.newsletterRepository.save(newsletter);
  }

  // Get unprocessed subscriptions
  async getUnprocessedSubscriptions(secondsAgo: number = 30): Promise<DummySubscription[]> {
    const cutoff = new Date(Date.now() - secondsAgo * 1000);

    return await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .leftJoinAndSelect('subscription.subscriptionType', 'subscriptionType')
      .where('subscription.createdAt >= :cutoff', { cutoff })
      .andWhere('subscription.workflowProcessed = :processed', { processed: false })
      .andWhere('subscription.status = :status', { status: 'active' })
      .getMany();
  }

  // Get unprocessed newsletters
  async getUnprocessedNewsletters(secondsAgo: number = 30): Promise<DummyNewsletter[]> {
    const cutoff = new Date(Date.now() - secondsAgo * 1000);

    return await this.newsletterRepository
      .createQueryBuilder('newsletter')
      .leftJoinAndSelect('newsletter.user', 'user')
      .where('newsletter.subscribedAt >= :cutoff', { cutoff })
      .andWhere('newsletter.workflowProcessed = :processed', { processed: false })
      .andWhere('newsletter.status = :status', { status: 'subscribed' })
      .getMany();
  }

  // Mark subscription as processed
  async markSubscriptionProcessed(subscriptionId: string): Promise<void> {
    await this.subscriptionRepository.update(subscriptionId, {
      workflowProcessed: true
    });
  }

  // Mark newsletter as processed
  async markNewsletterProcessed(newsletterId: string): Promise<void> {
    await this.newsletterRepository.update(newsletterId, {
      workflowProcessed: true
    });
  }

  // Get all data for testing
  async getAllData() {
    const users = await this.userRepository.find({ relations: ['subscriptions', 'newsletters'] });
    const subscriptionTypes = await this.subscriptionTypeRepository.find();

    return {
      users: users.length,
      subscriptionTypes: subscriptionTypes.length,
      subscriptions: users.reduce((acc, user) => acc + user.subscriptions.length, 0),
      newsletters: users.reduce((acc, user) => acc + user.newsletters.length, 0)
    };
  }
}
