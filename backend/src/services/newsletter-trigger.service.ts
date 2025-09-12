import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DummyNewsletter } from '../database/entities/dummy-newsletter.entity';
import { DummyUser } from '../database/entities/dummy-user.entity';
import { WorkflowExecutionContext, TriggerData } from '../workflow/types';
import { WorkflowTrigger, WorkflowTriggerContext, WorkflowTriggerResult } from '../workflow/interfaces/workflow-trigger.interface';

@Injectable()
export class NewsletterTriggerService implements WorkflowTrigger {
  private readonly logger = new Logger(NewsletterTriggerService.name);

  // WorkflowTrigger interface implementation
  readonly triggerType = 'newsletter_subscribed';
  readonly version = '1.0.0';
  readonly name = 'Newsletter Subscribed Trigger';
  readonly description = 'Triggers workflow when a user subscribes to newsletter';

  constructor(
    @InjectRepository(DummyNewsletter)
    private readonly newsletterRepository: Repository<DummyNewsletter>,
    @InjectRepository(DummyUser)
    private readonly userRepository: Repository<DummyUser>,
  ) {}

  // ============================================================================
  // WorkflowTrigger Interface Implementation
  // ============================================================================

  /**
   * Validate newsletter trigger data
   */
  validate(data: any): {
    isValid: boolean;
    context?: WorkflowTriggerContext;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Validate required fields
    if (!data.newsletterId) {
      errors.push('newsletterId is required');
    }
    if (!data.userId) {
      errors.push('userId is required');
    }
    if (!data.email) {
      errors.push('email is required');
    }
    if (!data.status) {
      errors.push('status is required');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Create standardized context
    const context: WorkflowTriggerContext = {
      executionId: `news_${data.newsletterId}_${Date.now()}`,
      workflowId: 'newsletter-welcome-workflow', // This will be determined by getWorkflowId
      triggerType: this.triggerType,
      triggerId: data.newsletterId,
      userId: data.userId,
      timestamp: new Date(data.subscribedAt || Date.now()),
      entityData: {
        id: data.newsletterId,
        type: 'event',
        data: {
          newsletterId: data.newsletterId,
          email: data.email,
          status: data.status,
          emailVerified: data.emailVerified,
          source: data.source,
          preferences: data.preferences,
          user: data.user,
          metadata: data.metadata,
          subscribedAt: data.subscribedAt
        }
      },
      triggerMetadata: {
        source: 'newsletter_subscribed',
        version: this.version,
        priority: 'normal',
        retryable: true,
        timeout: 30000 // 30 seconds
      },
      executionMetadata: {
        correlationId: data.correlationId,
        sessionId: data.sessionId,
        requestId: data.requestId,
        tags: ['newsletter', 'subscribed', 'email']
      }
    };

    return { isValid: true, context };
  }

  /**
   * Process newsletter trigger data
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
      const enrichedData = await this.enrichNewsletterData(validation.context!);

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
   * Get workflow ID for newsletter
   */
  getWorkflowId(context: WorkflowTriggerContext): string {
    // Determine workflow based on newsletter data or business rules
    const newsletterData = context.entityData.data;

    // Example: Different workflows based on source or preferences
    if (newsletterData.source === 'mobile_app') {
      return 'mobile-newsletter-welcome-workflow';
    } else if (newsletterData.preferences?.frequency === 'daily') {
      return 'daily-newsletter-welcome-workflow';
    } else {
      return 'standard-newsletter-welcome-workflow';
    }
  }

  /**
   * Check if this trigger should execute
   */
  shouldExecute(context: WorkflowTriggerContext): boolean {
    const newsletterData = context.entityData.data;

    // Only execute for subscribed newsletters
    if (newsletterData.status !== 'subscribed') {
      return false;
    }

    // Only execute if email is verified
    if (!newsletterData.emailVerified) {
      return false;
    }

    // Skip if user is from a blocked domain
    const blockedDomains = ['tempmail.com', '10minutemail.com'];
    const emailDomain = newsletterData.email.split('@')[1];
    if (blockedDomains.includes(emailDomain)) {
      return false;
    }

    return true;
  }

  /**
   * Enrich newsletter data with additional information
   */
  private async enrichNewsletterData(context: WorkflowTriggerContext): Promise<WorkflowTriggerContext> {
    // Example: Add enriched data here
    const enrichedData = {
      ...context.entityData.data,
      enrichedAt: new Date().toISOString(),
      userSegment: this.determineUserSegment(context.entityData.data),
      riskScore: this.calculateRiskScore(context.entityData.data)
    };

    return {
      ...context,
      entityData: {
        ...context.entityData,
        data: enrichedData
      }
    };
  }

  private determineUserSegment(newsletterData: any): string {
    // Simple segmentation logic
    if (newsletterData.preferences?.frequency === 'daily') {
      return 'high_engagement';
    } else if (newsletterData.preferences?.categories?.length > 2) {
      return 'diverse_interests';
    } else {
      return 'standard';
    }
  }

  private calculateRiskScore(newsletterData: any): number {
    // Simple risk scoring
    let score = 0;

    if (newsletterData.emailVerified) score += 20; // Email verification
    if (newsletterData.preferences?.language === 'en') score += 10; // English preference
    if (newsletterData.source === 'website') score += 5; // Website source

    return Math.min(score, 100);
  }

  /**
   * Retrieve all new newsletter subscriptions that need workflow processing
   */
  async retrieveTriggerData(lastRunTime?: Date): Promise<TriggerData[]> {
    // Use provided lastRunTime or fall back to 1 hour ago
    const cutoff = lastRunTime || new Date(Date.now() - 60 * 60 * 1000);

    const newsletters = await this.newsletterRepository
      .createQueryBuilder('newsletter')
      .leftJoinAndSelect('newsletter.user', 'user')
      .where('newsletter.subscribedAt > :cutoff', { cutoff })
      .andWhere('newsletter.workflowProcessed = :processed', { processed: false })
      .andWhere('newsletter.status = :status', { status: 'subscribed' })
      .orderBy('newsletter.subscribedAt', 'ASC')
      .getMany();

    // Only log when newsletters are found
    if (newsletters.length > 0) {
      this.logger.log(`Found ${newsletters.length} new newsletter subscriptions to process since ${cutoff.toISOString()}`);
    }

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
      data: triggerData.data,
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
