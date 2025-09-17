import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, LessThan, In } from 'typeorm';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { WorkflowExecutionSchedule } from '../../database/entities/workflow-execution-schedule.entity';
import { WorkflowDelay } from '../../database/entities/workflow-delay.entity';
import { DistributedLockService } from '../locks/distributed-lock.service';
import { WorkflowExecutionContext } from '../types';

@Injectable()
export class WorkflowDatabaseService {
  private readonly logger = new Logger(WorkflowDatabaseService.name);

  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowExecutionSchedule)
    private readonly scheduleRepository: Repository<WorkflowExecutionSchedule>,
    @InjectRepository(WorkflowDelay)
    private readonly delayRepository: Repository<WorkflowDelay>,
    private readonly dataSource: DataSource,
    private readonly distributedLock: DistributedLockService
  ) {}

  /**
   * Safely update last execution time with distributed locking
   */
  async updateLastExecutionTime(
    workflowId: string,
    triggerType: string,
    lastExecutionTime: Date
  ): Promise<void> {
    const lockKey = `workflow_schedule:${workflowId}:${triggerType}`;

    await this.distributedLock.withLock(lockKey, async () => {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Use UPSERT to handle concurrent updates safely
        await queryRunner.query(`
          INSERT INTO workflow_executions_schedule ("workflowId", "triggerType", "lastExecutionTime", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, NOW(), NOW())
          ON CONFLICT ("workflowId", "triggerType")
          DO UPDATE SET
            "lastExecutionTime" = EXCLUDED."lastExecutionTime",
            "updatedAt" = NOW()
        `, [workflowId, triggerType, lastExecutionTime]);

        await queryRunner.commitTransaction();
        this.logger.log(`Updated last execution time for workflow ${workflowId}, trigger ${triggerType}`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`Failed to update last execution time: ${error.message}`);
        throw error;
      } finally {
        await queryRunner.release();
      }
    }, {
      ttl: 10000, // 10 seconds
      maxRetries: 3,
      retryDelay: 100
    });
  }

  /**
   * Get last execution time safely
   */
  async getLastExecutionTime(
    workflowId: string,
    triggerType: string
  ): Promise<Date | null> {
    const lockKey = `workflow_schedule:${workflowId}:${triggerType}`;

    return await this.distributedLock.withLock(lockKey, async () => {
      const schedule = await this.scheduleRepository.findOne({
        where: { workflowId, triggerType }
      });

      return schedule?.lastExecutionTime || null;
    }, {
      ttl: 5000, // 5 seconds
      maxRetries: 3,
      retryDelay: 50
    });
  }

  /**
   * Create workflow execution with duplicate prevention
   */
  async createWorkflowExecution(
    executionId: string,
    workflowId: string,
    context: WorkflowExecutionContext,
    workflowDefinition: any
  ): Promise<WorkflowExecution> {
    const lockKey = `workflow_execution:${workflowId}:${context.userId}:${context.triggerType}:${context.triggerId}`;

    return await this.distributedLock.withLock(lockKey, async () => {
      // Check for existing execution
      const existingExecution = await this.executionRepository.findOne({
        where: {
          workflowId,
          userId: context.userId,
          triggerType: context.triggerType,
          triggerId: context.triggerId
        }
      });

      if (existingExecution) {
        this.logger.warn(`Execution already exists for workflow ${workflowId}, user ${context.userId}`);
        return existingExecution;
      }

      // Create new execution
      const execution = this.executionRepository.create({
        executionId,
        workflowId,
        triggerType: context.triggerType,
        triggerId: context.triggerId,
        userId: context.userId,
        status: 'running',
        currentStep: 'start',
        workflowDefinition,
        state: {
          currentState: 'running',
          context: context.data || {},
          history: [],
          sharedFlows: []
        }
      });

      return await this.executionRepository.save(execution);
    }, {
      ttl: 15000, // 15 seconds
      maxRetries: 3,
      retryDelay: 100
    });
  }

  /**
   * Update workflow execution status safely
   */
  async updateWorkflowExecutionStatus(
    executionId: string,
    status: string,
    updates: Partial<WorkflowExecution> = {}
  ): Promise<void> {
    const lockKey = `workflow_execution_update:${executionId}`;

    await this.distributedLock.withLock(lockKey, async () => {
      await this.executionRepository.update(
        { executionId },
        {
          status: status as any,
          ...updates,
          updatedAt: new Date()
        }
      );
    }, {
      ttl: 10000, // 10 seconds
      maxRetries: 3,
      retryDelay: 100
    });
  }

  /**
   * Process delayed executions with batch processing
   */
  async processDelayedExecutions(batchSize: number = 50): Promise<WorkflowDelay[]> {
    const lockKey = 'delayed_executions_processing';

    return await this.distributedLock.withLock(lockKey, async () => {
      const now = new Date();

      // Get pending delays that are ready to execute
      const pendingDelays = await this.delayRepository.find({
        where: {
          status: 'pending',
          executeAt: LessThan(now)
        },
        order: { executeAt: 'ASC' },
        take: batchSize
      });

      if (pendingDelays.length === 0) {
        return [];
      }

      // Mark delays as processing to prevent duplicate processing
      const delayIds = pendingDelays.map(delay => delay.id);
      await this.delayRepository.update(
        { id: In(delayIds) },
        { status: 'processing' }
      );

      this.logger.log(`Processing ${pendingDelays.length} delayed executions`);
      return pendingDelays;
    }, {
      ttl: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 200
    });
  }

  /**
   * Mark delay as executed
   */
  async markDelayAsExecuted(
    delayId: string,
    result?: any,
    error?: string
  ): Promise<void> {
    const lockKey = `delay_execution:${delayId}`;

    await this.distributedLock.withLock(lockKey, async () => {
      await this.delayRepository.update(
        { id: delayId },
        {
          status: error ? 'failed' : 'executed',
          result: result || null,
          error: error || null,
          executedAt: new Date(),
          updatedAt: new Date()
        }
      );
    }, {
      ttl: 5000, // 5 seconds
      maxRetries: 3,
      retryDelay: 50
    });
  }

  /**
   * Get workflow executions with pagination and filtering
   */
  async getWorkflowExecutions(
    filters: {
      workflowId?: string;
      userId?: string;
      status?: string;
      triggerType?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ executions: WorkflowExecution[]; total: number }> {
    const {
      workflowId,
      userId,
      status,
      triggerType,
      limit = 50,
      offset = 0
    } = filters;

    const queryBuilder = this.executionRepository.createQueryBuilder('execution');

    if (workflowId) {
      queryBuilder.andWhere('execution.workflowId = :workflowId', { workflowId });
    }
    if (userId) {
      queryBuilder.andWhere('execution.userId = :userId', { userId });
    }
    if (status) {
      queryBuilder.andWhere('execution.status = :status', { status });
    }
    if (triggerType) {
      queryBuilder.andWhere('execution.triggerType = :triggerType', { triggerType });
    }

    const [executions, total] = await queryBuilder
      .orderBy('execution.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { executions, total };
  }

  /**
   * Get execution statistics
   */
  async getExecutionStatistics(
    workflowId?: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byTriggerType: Record<string, number>;
    averageExecutionTime: number;
  }> {
    const queryBuilder = this.executionRepository.createQueryBuilder('execution');

    if (workflowId) {
      queryBuilder.andWhere('execution.workflowId = :workflowId', { workflowId });
    }
    if (fromDate) {
      queryBuilder.andWhere('execution.createdAt >= :fromDate', { fromDate });
    }
    if (toDate) {
      queryBuilder.andWhere('execution.createdAt <= :toDate', { toDate });
    }

    const executions = await queryBuilder.getMany();

    const byStatus = executions.reduce((acc, exec) => {
      acc[exec.status] = (acc[exec.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byTriggerType = executions.reduce((acc, exec) => {
      acc[exec.triggerType] = (acc[exec.triggerType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average execution time (simplified)
    const completedExecutions = executions.filter(exec => exec.status === 'completed');
    const averageExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, exec) => {
          const duration = exec.completedAt
            ? exec.completedAt.getTime() - exec.createdAt.getTime()
            : 0;
          return sum + duration;
        }, 0) / completedExecutions.length
      : 0;

    return {
      total: executions.length,
      byStatus,
      byTriggerType,
      averageExecutionTime
    };
  }

  /**
   * Cleanup old executions
   */
  async cleanupOldExecutions(
    olderThanDays: number = 30,
    batchSize: number = 1000
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const lockKey = 'cleanup_old_executions';

    return await this.distributedLock.withLock(lockKey, async () => {
      const result = await this.executionRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .andWhere('status IN (:...statuses)', {
          statuses: ['completed', 'failed', 'cancelled']
        })
        .execute();

      const deletedCount = result.affected || 0;
      this.logger.log(`Cleaned up ${deletedCount} old executions`);
      return deletedCount;
    }, {
      ttl: 60000, // 1 minute
      maxRetries: 3,
      retryDelay: 500
    });
  }
}
