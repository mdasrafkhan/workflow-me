import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { WorkflowQueueService } from '../queue/workflow-queue.service';
import { DistributedLockService } from '../locks/distributed-lock.service';
import { WorkflowDatabaseService } from '../database/workflow.service';
import { DistributedSchedulerService } from '../scheduler/distributed-scheduler.service';

@Controller('workflow/distributed')
export class DistributedSystemController {
  constructor(
    private readonly workflowQueueService: WorkflowQueueService,
    private readonly distributedLock: DistributedLockService,
    private readonly workflowDatabaseService: WorkflowDatabaseService,
    private readonly distributedScheduler: DistributedSchedulerService
  ) {}

  /**
   * Get system status
   */
  @Get('status')
  async getSystemStatus() {
    const [schedulerStatus, queueStats] = await Promise.all([
      this.distributedScheduler.getSchedulerStatus(),
      Promise.all([
        this.workflowQueueService.getQueueStats('workflow-execution'),
        this.workflowQueueService.getQueueStats('workflow-delay'),
        this.workflowQueueService.getQueueStats('workflow-scheduler')
      ])
    ]);

    return {
      timestamp: new Date(),
      scheduler: schedulerStatus,
      queues: {
        workflowExecution: queueStats[0],
        workflowDelay: queueStats[1],
        workflowScheduler: queueStats[2]
      },
      system: {
        isHealthy: !schedulerStatus.isLocked || schedulerStatus.lockInfo?.ttl > 0,
        totalJobs: queueStats.reduce((sum, stats) => sum + stats.total, 0),
        activeJobs: queueStats.reduce((sum, stats) => sum + stats.active, 0)
      }
    };
  }

  /**
   * Get queue statistics
   */
  @Get('queues/:queueName/stats')
  async getQueueStats(@Param('queueName') queueName: string) {
    const validQueues = ['workflow-execution', 'workflow-delay', 'workflow-scheduler'];

    if (!validQueues.includes(queueName)) {
      throw new Error(`Invalid queue name: ${queueName}`);
    }

    return await this.workflowQueueService.getQueueStats(queueName as any);
  }

  /**
   * Get job status
   */
  @Get('jobs/:jobId')
  async getJobStatus(
    @Param('jobId') jobId: string,
    @Query('queue') queueName: string = 'workflow-execution'
  ) {
    const validQueues = ['workflow-execution', 'workflow-delay', 'workflow-scheduler'];

    if (!validQueues.includes(queueName)) {
      throw new Error(`Invalid queue name: ${queueName}`);
    }

    return await this.workflowQueueService.getJobStatus(jobId, queueName as any);
  }

  /**
   * Get execution statistics
   */
  @Get('executions/stats')
  async getExecutionStats(
    @Query('workflowId') workflowId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    return await this.workflowDatabaseService.getExecutionStatistics(
      workflowId,
      from,
      to
    );
  }

  /**
   * Get workflow executions with pagination
   */
  @Get('executions')
  async getWorkflowExecutions(
    @Query('workflowId') workflowId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('triggerType') triggerType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const filters = {
      workflowId,
      userId,
      status,
      triggerType,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    };

    return await this.workflowDatabaseService.getWorkflowExecutions(filters);
  }

  /**
   * Pause a queue
   */
  @Post('queues/:queueName/pause')
  async pauseQueue(@Param('queueName') queueName: string) {
    const validQueues = ['workflow-execution', 'workflow-delay', 'workflow-scheduler'];

    if (!validQueues.includes(queueName)) {
      throw new Error(`Invalid queue name: ${queueName}`);
    }

    await this.workflowQueueService.pauseQueue(queueName as any);
    return { message: `Queue ${queueName} paused successfully` };
  }

  /**
   * Resume a queue
   */
  @Post('queues/:queueName/resume')
  async resumeQueue(@Param('queueName') queueName: string) {
    const validQueues = ['workflow-execution', 'workflow-delay', 'workflow-scheduler'];

    if (!validQueues.includes(queueName)) {
      throw new Error(`Invalid queue name: ${queueName}`);
    }

    await this.workflowQueueService.resumeQueue(queueName as any);
    return { message: `Queue ${queueName} resumed successfully` };
  }

  /**
   * Clean old jobs
   */
  @Post('queues/:queueName/clean')
  async cleanOldJobs(
    @Param('queueName') queueName: string,
    @Query('grace') grace?: string
  ) {
    const validQueues = ['workflow-execution', 'workflow-delay', 'workflow-scheduler'];

    if (!validQueues.includes(queueName)) {
      throw new Error(`Invalid queue name: ${queueName}`);
    }

    const graceMs = grace ? parseInt(grace) : 5000;
    await this.workflowQueueService.cleanOldJobs(queueName as any, graceMs);
    return { message: `Cleaned old jobs from ${queueName} queue` };
  }

  /**
   * Force cleanup of old data
   */
  @Post('cleanup')
  async cleanupOldData() {
    await this.distributedScheduler.cleanupOldData();
    return { message: 'Old data cleanup completed' };
  }

  /**
   * Get lock information
   */
  @Get('locks/:key')
  async getLockInfo(@Param('key') key: string) {
    const lockInfo = await this.distributedLock.getLockInfo(key);
    return {
      key,
      exists: lockInfo?.exists || false,
      ttl: lockInfo?.ttl || 0,
      value: lockInfo?.value || null
    };
  }

  /**
   * Check if lock exists
   */
  @Get('locks/:key/exists')
  async isLocked(@Param('key') key: string) {
    const isLocked = await this.distributedLock.isLocked(key);
    return {
      key,
      isLocked
    };
  }
}
