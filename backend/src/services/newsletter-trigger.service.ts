import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DummyNewsletter } from '../database/entities/dummy-newsletter.entity';
import { DummyUser } from '../database/entities/dummy-user.entity';
import { WorkflowExecutionContext, TriggerData } from '../workflow/types';

@Injectable()
export class NewsletterTriggerService {
  private readonly logger = new Logger(NewsletterTriggerService.name);

  constructor(
    @InjectRepository(DummyNewsletter)
    private readonly newsletterRepository: Repository<DummyNewsletter>,
    @InjectRepository(DummyUser)
    private readonly userRepository: Repository<DummyUser>,
  ) {}

  /**
   * Retrieve all new newsletter subscriptions that need workflow processing
   */
  async retrieveTriggerData(secondsAgo: number = 30): Promise<TriggerData[]> {
    const cutoff = new Date(Date.now() - secondsAgo * 1000);

    this.logger.log(`Retrieving newsletter triggers from last ${secondsAgo} seconds`);

    const newsletters = await this.newsletterRepository
      .createQueryBuilder('newsletter')
      .leftJoinAndSelect('newsletter.user', 'user')
      .where('newsletter.subscribedAt >= :cutoff', { cutoff })
      .andWhere('newsletter.workflowProcessed = :processed', { processed: false })
      .andWhere('newsletter.status = :status', { status: 'subscribed' })
      .orderBy('newsletter.subscribedAt', 'ASC')
      .getMany();

    this.logger.log(`Found ${newsletters.length} new newsletter subscriptions to process`);

    return newsletters.map(newsletter => ({
      id: newsletter.id,
      userId: newsletter.userId,
      triggerType: 'newsletter_subscribed',
      data: {
        newsletterId: newsletter.id,
        email: newsletter.email,
        status: newsletter.status,
        emailVerified: newsletter.emailVerified,
        source: newsletter.source,
        preferences: newsletter.preferences,
        user: newsletter.user ? {
          id: newsletter.user.id,
          email: newsletter.user.email,
          name: newsletter.user.name,
          phoneNumber: newsletter.user.phoneNumber,
          timezone: newsletter.user.timezone
        } : null,
        metadata: newsletter.metadata,
        subscribedAt: newsletter.subscribedAt
      },
      createdAt: newsletter.subscribedAt || newsletter.createdAt
    }));
  }

  /**
   * Process a single newsletter trigger
   */
  async processTrigger(triggerData: TriggerData): Promise<WorkflowExecutionContext> {
    this.logger.log(`Processing newsletter trigger: ${triggerData.id}`);

    const executionContext: WorkflowExecutionContext = {
      executionId: `news_${triggerData.id}_${Date.now()}`,
      workflowId: '34', // Use the actual newsletter workflow ID
      triggerType: 'newsletter_subscribed',
      triggerId: triggerData.id,
      userId: triggerData.userId,
      triggerData: triggerData.data,
      metadata: {
        email: triggerData.data.email,
        source: triggerData.data.source,
        userEmail: triggerData.data.email,
        userName: triggerData.data.user?.name || triggerData.data.email.split('@')[0],
        newsletterId: triggerData.id,
        preferences: triggerData.data.preferences,
        emailVerified: triggerData.data.emailVerified
      },
      createdAt: new Date()
    };

    this.logger.log(`Created execution context for newsletter workflow: ${executionContext.workflowId}`);
    return executionContext;
  }

  /**
   * Mark newsletter as processed
   */
  async markAsProcessed(newsletterId: string): Promise<void> {
    await this.newsletterRepository.update(newsletterId, {
      workflowProcessed: true
    });
    this.logger.log(`Marked newsletter ${newsletterId} as processed`);
  }

  /**
   * Get newsletter by ID
   */
  async getNewsletterById(newsletterId: string): Promise<DummyNewsletter | null> {
    return await this.newsletterRepository.findOne({
      where: { id: newsletterId },
      relations: ['user']
    });
  }

  /**
   * Create a new newsletter subscription (for testing)
   */
  async createNewsletterSubscription(
    email: string,
    source: string = 'website',
    preferences?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      categories: string[];
      language: string;
    }
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
      preferences: preferences || {
        frequency: 'weekly',
        categories: ['general'],
        language: 'en'
      },
      subscribedAt: new Date(),
      workflowProcessed: false,
      metadata: { createdBy: 'newsletter-trigger-service' }
    });

    const savedNewsletter = await this.newsletterRepository.save(newsletter);
    this.logger.log(`Created new newsletter subscription: ${savedNewsletter.id} for email: ${email}`);
    return savedNewsletter;
  }

  /**
   * Get newsletter statistics
   */
  async getStatistics(): Promise<{
    total: number;
    processed: number;
    pending: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    byFrequency: Record<string, number>;
  }> {
    const total = await this.newsletterRepository.count();
    const processed = await this.newsletterRepository.count({
      where: { workflowProcessed: true }
    });
    const pending = await this.newsletterRepository.count({
      where: { workflowProcessed: false }
    });

    // Get newsletters by status
    const byStatusResult = await this.newsletterRepository
      .createQueryBuilder('newsletter')
      .select('newsletter.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('newsletter.status')
      .getRawMany();

    const byStatus = byStatusResult.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    // Get newsletters by source
    const bySourceResult = await this.newsletterRepository
      .createQueryBuilder('newsletter')
      .select('newsletter.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('newsletter.source')
      .getRawMany();

    const bySource = bySourceResult.reduce((acc, item) => {
      acc[item.source] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    // Get newsletters by frequency
    const byFrequencyResult = await this.newsletterRepository
      .createQueryBuilder('newsletter')
      .select("newsletter.preferences->>'frequency'", 'frequency')
      .addSelect('COUNT(*)', 'count')
      .groupBy("newsletter.preferences->>'frequency'")
      .getRawMany();

    const byFrequency = byFrequencyResult.reduce((acc, item) => {
      acc[item.frequency] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      processed,
      pending,
      byStatus,
      bySource,
      byFrequency
    };
  }

  /**
   * Get unprocessed newsletters for a specific time range
   */
  async getUnprocessedNewsletters(
    startDate: Date,
    endDate: Date
  ): Promise<DummyNewsletter[]> {
    return await this.newsletterRepository
      .createQueryBuilder('newsletter')
      .leftJoinAndSelect('newsletter.user', 'user')
      .where('newsletter.subscribedAt >= :startDate', { startDate })
      .andWhere('newsletter.subscribedAt <= :endDate', { endDate })
      .andWhere('newsletter.workflowProcessed = :processed', { processed: false })
      .andWhere('newsletter.status = :status', { status: 'subscribed' })
      .orderBy('newsletter.subscribedAt', 'ASC')
      .getMany();
  }

  /**
   * Retry failed newsletters
   */
  async retryFailedNewsletters(): Promise<number> {
    const failedNewsletters = await this.newsletterRepository
      .createQueryBuilder('newsletter')
      .where('newsletter.workflowProcessed = :processed', { processed: false })
      .andWhere('newsletter.status = :status', { status: 'subscribed' })
      .andWhere('newsletter.subscribedAt < :cutoff', {
        cutoff: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      })
      .getMany();

    this.logger.log(`Found ${failedNewsletters.length} newsletters to retry`);
    return failedNewsletters.length;
  }

  /**
   * Unsubscribe newsletter
   */
  async unsubscribeNewsletter(newsletterId: string): Promise<void> {
    await this.newsletterRepository.update(newsletterId, {
      status: 'unsubscribed',
      unsubscribedAt: new Date()
    });
    this.logger.log(`Unsubscribed newsletter: ${newsletterId}`);
  }

  /**
   * Verify email for newsletter
   */
  async verifyEmail(newsletterId: string): Promise<void> {
    await this.newsletterRepository.update(newsletterId, {
      emailVerified: true
    });
    this.logger.log(`Verified email for newsletter: ${newsletterId}`);
  }
}
