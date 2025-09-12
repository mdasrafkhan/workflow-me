import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DummyUser } from '../database/entities/dummy-user.entity';
import { WorkflowExecutionSchedule } from '../database/entities/workflow-execution-schedule.entity';
import { TriggerData } from '../workflow/types';
import { WorkflowTrigger, WorkflowTriggerContext, WorkflowTriggerResult } from '../workflow/interfaces/workflow-trigger.interface';

@Injectable()
export class UserTriggerService implements WorkflowTrigger {
  private readonly logger = new Logger(UserTriggerService.name);
  private lastProcessedTime: Date | null = null;

  // WorkflowTrigger interface implementation
  readonly triggerType = 'user_created';
  readonly version = '1.0.0';
  readonly name = 'User Created Trigger';
  readonly description = 'Triggers workflow when a new user is created';

  constructor(
    @InjectRepository(DummyUser)
    private readonly userRepository: Repository<DummyUser>,
    @InjectRepository(WorkflowExecutionSchedule)
    private readonly executionScheduleRepository: Repository<WorkflowExecutionSchedule>,
  ) {}

  // ============================================================================
  // WorkflowTrigger Interface Implementation
  // ============================================================================

  /**
   * Validate user trigger data
   */
  validate(data: any): {
    isValid: boolean;
    context?: WorkflowTriggerContext;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Validate required fields
    if (!data.userId) {
      errors.push('userId is required');
    }
    if (!data.email) {
      errors.push('email is required');
    }
    if (!data.name) {
      errors.push('name is required');
    }
    if (!data.isActive) {
      errors.push('isActive is required');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Create standardized context
    const context: WorkflowTriggerContext = {
      executionId: `user_${data.userId}_${Date.now()}`,
      workflowId: 'user-onboarding-workflow', // This will be determined by getWorkflowId
      triggerType: this.triggerType,
      triggerId: data.userId,
      userId: data.userId,
      timestamp: new Date(data.createdAt || Date.now()),
      entityData: {
        id: data.userId,
        type: 'user',
        data: {
          userId: data.userId,
          email: data.email,
          name: data.name,
          phoneNumber: data.phoneNumber,
          isActive: data.isActive,
          timezone: data.timezone,
          preferences: data.preferences || {},
          user: data.user || {
            id: data.userId,
            email: data.email,
            name: data.name,
            phoneNumber: data.phoneNumber,
            isActive: data.isActive,
            timezone: data.timezone,
            preferences: data.preferences || {},
            isNew: true
          }
        }
      },
      triggerMetadata: {
        source: 'user_created',
        version: this.version,
        priority: 'high',
        retryable: true,
        timeout: 30000 // 30 seconds
      },
      executionMetadata: {
        correlationId: data.correlationId,
        sessionId: data.sessionId,
        requestId: data.requestId,
        tags: ['user', 'created', 'onboarding']
      }
    };

    return { isValid: true, context };
  }

  /**
   * Process user trigger data
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
      const enrichedData = await this.enrichUserData(validation.context!);

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
   * Get workflow ID for user
   */
  getWorkflowId(context: WorkflowTriggerContext): string {
    // Determine workflow based on user data or business rules
    const userData = context.entityData.data;

    // Example: Different workflows based on user source or preferences
    if (userData.preferences?.premium) {
      return 'premium-user-onboarding-workflow';
    } else if (userData.phoneNumber) {
      return 'verified-user-onboarding-workflow';
    } else {
      return 'standard-user-onboarding-workflow';
    }
  }

  /**
   * Check if this trigger should execute
   */
  shouldExecute(context: WorkflowTriggerContext): boolean {
    const userData = context.entityData.data;

    // Only execute for active users
    if (!userData.isActive) {
      return false;
    }

    // Skip if user is from a blocked domain
    const blockedDomains = ['tempmail.com', '10minutemail.com'];
    const emailDomain = userData.email.split('@')[1];
    if (blockedDomains.includes(emailDomain)) {
      return false;
    }

    return true;
  }

  /**
   * Enrich user data with additional information
   */
  private async enrichUserData(context: WorkflowTriggerContext): Promise<WorkflowTriggerContext> {
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

  private determineUserSegment(userData: any): string {
    // Simple segmentation logic
    if (userData.preferences?.premium) {
      return 'premium';
    } else if (userData.phoneNumber) {
      return 'verified';
    } else {
      return 'standard';
    }
  }

  private calculateRiskScore(userData: any): number {
    // Simple risk scoring
    let score = 0;

    if (userData.phoneNumber) score += 20; // Phone verification
    if (userData.preferences?.emailVerified) score += 10; // Email verification
    if (userData.timezone) score += 5; // Timezone set

    return Math.min(score, 100);
  }

  async retrieveTriggerData(workflowId: string): Promise<TriggerData[]> {
    const triggerType = 'user_created';

    // Use a fixed UUID for global user_created triggers to prevent duplicate processing
    const globalWorkflowId = '00000000-0000-0000-0000-000000000001';
    let executionSchedule = await this.executionScheduleRepository.findOne({
      where: { workflowId: globalWorkflowId, triggerType }
    });

    if (!executionSchedule) {
      // First run - process users from 1 hour ago
      executionSchedule = this.executionScheduleRepository.create({
        workflowId: globalWorkflowId,
        triggerType,
        lastExecutionTime: new Date(Date.now() - 60 * 60 * 1000)
      });
      await this.executionScheduleRepository.save(executionSchedule);
    }

    const cutoff = executionSchedule.lastExecutionTime;

    // Simple query: get all users created after the last execution time
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt > :cutoff', { cutoff })
      .andWhere('user.isActive = :active', { active: true })
      .orderBy('user.createdAt', 'ASC')
      .getMany();

    // Only log when users are found
    if (users.length > 0) {
      this.logger.log(`Found ${users.length} new users to process for workflow ${workflowId} since ${cutoff.toISOString()}`);
    }

    // ⚠️ CRITICAL FIX: Only update lastExecutionTime AFTER successful processing
    // This prevents data loss if server crashes during processing
    // The time update will be handled by the caller after successful processing

    return users.map(user => ({
      id: user.id,
      userId: user.id,
      triggerType: 'user_created',
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        timezone: user.timezone,
        preferences: user.preferences || {},
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          isActive: user.isActive,
          timezone: user.timezone,
          preferences: user.preferences || {},
          isNew: true // All retrieved users are new
        }
      },
      createdAt: user.createdAt
    }));
  }

  /**
   * Update last execution time after successful processing
   * This should be called by the caller after all users are processed successfully
   */
  async updateLastExecutionTime(workflowId: string, triggerType: string = 'user_created'): Promise<void> {
    // For user_created triggers, update the global execution time
    const globalWorkflowId = triggerType === 'user_created' ? '00000000-0000-0000-0000-000000000001' : workflowId;

    await this.executionScheduleRepository.update(
      { workflowId: globalWorkflowId, triggerType },
      { lastExecutionTime: new Date() }
    );
    this.logger.log(`Updated last execution time for ${globalWorkflowId} (${triggerType})`);
  }

  getLastProcessedTime(): Date | null {
    return this.lastProcessedTime;
  }
}
