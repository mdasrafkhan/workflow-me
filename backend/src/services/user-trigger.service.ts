import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DummyUser } from '../database/entities/dummy-user.entity';
import { WorkflowExecutionSchedule } from '../database/entities/workflow-execution-schedule.entity';
import { TriggerData } from '../workflow/types';

@Injectable()
export class UserTriggerService {
  private readonly logger = new Logger(UserTriggerService.name);
  private lastProcessedTime: Date | null = null;

  constructor(
    @InjectRepository(DummyUser)
    private readonly userRepository: Repository<DummyUser>,
    @InjectRepository(WorkflowExecutionSchedule)
    private readonly executionScheduleRepository: Repository<WorkflowExecutionSchedule>,
  ) {}

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
