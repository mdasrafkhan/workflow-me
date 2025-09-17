import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { WorkflowExecutionContext } from '../types';

export interface WorkflowJobData {
  executionId: string;
  workflowId: string;
  triggerType: string;
  triggerId: string;
  userId: string;
  triggerData: any;
  metadata: any;
  priority?: number;
  delay?: number;
  attempts?: number;
}

export interface WorkflowJobResult {
  success: boolean;
  executionId: string;
  workflowId: string;
  result?: any;
  error?: string;
  metadata?: any;
}

@Injectable()
export class WorkflowQueueService {
  private readonly logger = new Logger(WorkflowQueueService.name);

  constructor(
    @InjectQueue('workflow-execution') private workflowQueue: Queue<WorkflowJobData>,
    @InjectQueue('workflow-delay') private delayQueue: Queue<WorkflowJobData>,
    @InjectQueue('workflow-scheduler') private schedulerQueue: Queue<any>
  ) {
    this.logger.log('WorkflowQueueService initialized successfully');
    this.initializeQueues();
  }

  /**
   * Initialize queues and start processing
   */
  private async initializeQueues() {
    try {
      // Start processing for all queues
      await this.workflowQueue.resume();
      await this.delayQueue.resume();
      await this.schedulerQueue.resume();

      this.logger.log('All queues started processing');
    } catch (error) {
      this.logger.error(`Failed to initialize queues: ${error.message}`);
    }
  }

  /**
   * Add a workflow execution job to the queue
   */
  async addWorkflowJob(
    data: WorkflowJobData,
    options: {
      priority?: number;
      delay?: number;
      attempts?: number;
      removeOnComplete?: number;
      removeOnFail?: number;
    } = {}
  ): Promise<Job<WorkflowJobData>> {
    const jobOptions = {
      priority: data.priority || options.priority || 0,
      delay: data.delay || options.delay || 0,
      attempts: data.attempts || options.attempts || 3,
      removeOnComplete: options.removeOnComplete || 10,
      removeOnFail: options.removeOnFail || 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };

    const job = await this.workflowQueue.add('execute-workflow', data, jobOptions);
    this.logger.log(`Added workflow job ${job.id} for workflow ${data.workflowId}`);
    return job;
  }

  /**
   * Add a delayed workflow execution job
   */
  async addDelayedWorkflowJob(
    data: WorkflowJobData,
    delayMs: number,
    options: {
      priority?: number;
      attempts?: number;
    } = {}
  ): Promise<Job<WorkflowJobData>> {
    const jobOptions = {
      priority: data.priority || options.priority || 0,
      delay: delayMs,
      attempts: data.attempts || options.attempts || 3,
      removeOnComplete: 10,
      removeOnFail: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };

    const job = await this.delayQueue.add('execute-delayed-workflow', data, jobOptions);
    this.logger.log(`Added delayed workflow job ${job.id} for workflow ${data.workflowId} (delay: ${delayMs}ms)`);
    return job;
  }

  /**
   * Add a scheduler job (for cron-like processing)
   */
  async addSchedulerJob(
    data: any,
    options: {
      priority?: number;
      delay?: number;
      repeat?: { cron: string };
    } = {}
  ): Promise<Job<any>> {
    const jobOptions = {
      priority: options.priority || 0,
      delay: options.delay || 0,
      repeat: options.repeat,
      removeOnComplete: 5,
      removeOnFail: 3,
    };

    const job = await this.schedulerQueue.add('process-scheduler', data, jobOptions);
    this.logger.log(`Added scheduler job ${job.id}`);
    return job;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string, queueName: 'workflow-execution' | 'workflow-delay' | 'workflow-scheduler'): Promise<any> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      data: job.data,
      progress: job.progress(),
      state: await job.getState(),
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: 'workflow-execution' | 'workflow-delay' | 'workflow-scheduler'): Promise<any> {
    const queue = this.getQueue(queueName);
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(queueName: 'workflow-execution' | 'workflow-delay' | 'workflow-scheduler', grace: number = 5000): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
    this.logger.log(`Cleaned old jobs from ${queueName} queue`);
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: 'workflow-execution' | 'workflow-delay' | 'workflow-scheduler'): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Paused ${queueName} queue`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: 'workflow-execution' | 'workflow-delay' | 'workflow-scheduler'): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Resumed ${queueName} queue`);
  }

  /**
   * Get queue instance
   */
  private getQueue(queueName: 'workflow-execution' | 'workflow-delay' | 'workflow-scheduler'): Queue {
    switch (queueName) {
      case 'workflow-execution':
        return this.workflowQueue;
      case 'workflow-delay':
        return this.delayQueue;
      case 'workflow-scheduler':
        return this.schedulerQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}
