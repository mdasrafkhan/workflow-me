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

    // Get or create execution schedule record for this specific workflow
    let executionSchedule = await this.executionScheduleRepository.findOne({
      where: { workflowId, triggerType }
    });

    if (!executionSchedule) {
      // First run for this workflow - process users from 1 hour ago
      executionSchedule = this.executionScheduleRepository.create({
        workflowId,
        triggerType,
        lastExecutionTime: new Date(Date.now() - 60 * 60 * 1000)
      });
      await this.executionScheduleRepository.save(executionSchedule);
    }

    const cutoff = executionSchedule.lastExecutionTime;
    this.logger.log(`Retrieving user creation triggers for workflow ${workflowId} since ${cutoff.toISOString()}`);

    // Query users created since last execution for this workflow
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt > :cutoff', { cutoff })
      .andWhere('user.isActive = :active', { active: true })
      .orderBy('user.createdAt', 'ASC')
      .getMany();

    this.logger.log(`Found ${users.length} new users to process for workflow ${workflowId} since last run`);

    // Update last execution time to now (only after successful query)
    executionSchedule.lastExecutionTime = new Date();
    await this.executionScheduleRepository.save(executionSchedule);

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

  getLastProcessedTime(): Date | null {
    return this.lastProcessedTime;
  }
}
