import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowQueueService, WorkflowJobData } from '../queue/workflow-queue.service';
import { DistributedLockService } from '../locks/distributed-lock.service';
import { WorkflowDatabaseService } from '../database/workflow.service';
import { WorkflowService } from '../workflow.service';
import { WorkflowOrchestrationEngine } from '../execution/workflow-orchestration-engine';
import { SubscriptionTriggerService } from '../../services/subscription-trigger.service';
import { NewsletterTriggerService } from '../../services/newsletter-trigger.service';
import { UserTriggerService } from '../../services/user-trigger.service';

@Injectable()
export class DistributedSchedulerService {
  private readonly logger = new Logger(DistributedSchedulerService.name);
  private readonly SCHEDULER_LOCK_KEY = 'workflow_scheduler_main';
  private readonly LOCK_TTL = 60000; // 1 minute
  private readonly MAX_CONCURRENT_WORKFLOWS = 100;

  constructor(
    private readonly workflowQueueService: WorkflowQueueService,
    private readonly distributedLock: DistributedLockService,
    private readonly workflowDatabaseService: WorkflowDatabaseService,
    private readonly workflowService: WorkflowService,
    private readonly workflowOrchestrationEngine: WorkflowOrchestrationEngine,
    private readonly subscriptionTriggerService: SubscriptionTriggerService,
    private readonly newsletterTriggerService: NewsletterTriggerService,
    private readonly userTriggerService: UserTriggerService
  ) {}

  /**
   * Main distributed cron job - only one pod will execute this
   */
  @Cron('* * * * *') // Runs every minute
  async handleDistributedCron(): Promise<void> {
    const startTime = Date.now();

    // Try to acquire distributed lock
    const lockAcquired = await this.distributedLock.acquireLock(
      this.SCHEDULER_LOCK_KEY,
      {
        ttl: this.LOCK_TTL,
        maxRetries: 3,
        retryDelay: 100
      }
    );

    if (!lockAcquired) {
      this.logger.debug('Scheduler lock not acquired, another pod is handling the cron job');
      return;
    }

    try {
      this.logger.log('Starting distributed workflow processing...');

      // Process all trigger types
      await Promise.all([
        this.processSubscriptionTriggers(),
        this.processNewsletterTriggers(),
        this.processUserTriggers(),
        this.processDelayedExecutions()
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`Distributed workflow processing completed in ${duration}ms`);

    } catch (error) {
      this.logger.error(`Distributed workflow processing failed: ${error.message}`);
    } finally {
      // Always release the lock
      await this.distributedLock.releaseLock(this.SCHEDULER_LOCK_KEY);
    }
  }

  /**
   * Process subscription triggers with queue-based execution
   */
  private async processSubscriptionTriggers(): Promise<void> {
    try {
      const workflows = await this.getWorkflowsForTriggerType('user_buys_subscription');

      for (const workflow of workflows) {
        const triggers = await this.subscriptionTriggerService.retrieveTriggerData(workflow.id);

        // Process triggers in batches to avoid overwhelming the system
        const batches = this.createBatches(triggers, 10);

        for (const batch of batches) {
          const jobs = batch.map(trigger => this.createWorkflowJob(trigger, 'user_buys_subscription', workflow.id));

          // Add jobs to queue with priority
          await Promise.all(jobs.map(job =>
            this.workflowQueueService.addWorkflowJob(job, {
              priority: 1, // High priority for subscription triggers
              attempts: 3
            })
          ));
        }

        // Update last execution time after successful processing
        if (triggers.length > 0) {
          await this.workflowDatabaseService.updateLastExecutionTime(
            workflow.id,
            'user_buys_subscription',
            new Date()
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error processing subscription triggers: ${error.message}`);
    }
  }

  /**
   * Process newsletter triggers with queue-based execution
   */
  private async processNewsletterTriggers(): Promise<void> {
    try {
      const workflows = await this.getWorkflowsForTriggerType('newsletter_subscribed');

      for (const workflow of workflows) {
        // Get last execution time for this workflow
        const lastExecutionTime = await this.workflowDatabaseService.getLastExecutionTime(
          workflow.id,
          'newsletter_subscribed'
        );

        const triggers = await this.newsletterTriggerService.retrieveTriggerData(lastExecutionTime);

        // Process triggers in batches
        const batches = this.createBatches(triggers, 15);

        for (const batch of batches) {
          const jobs = batch.map(trigger => this.createWorkflowJob(trigger, 'newsletter_subscribed', workflow.id));

          // Add jobs to queue with normal priority
          await Promise.all(jobs.map(job =>
            this.workflowQueueService.addWorkflowJob(job, {
              priority: 0, // Normal priority for newsletter triggers
              attempts: 3
            })
          ));
        }

        // Update last execution time after successful processing
        if (triggers.length > 0) {
          await this.workflowDatabaseService.updateLastExecutionTime(
            workflow.id,
            'newsletter_subscribed',
            new Date()
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error processing newsletter triggers: ${error.message}`);
    }
  }

  /**
   * Process user triggers with queue-based execution
   */
  private async processUserTriggers(): Promise<void> {
    // Only process user_created triggers - user_registers is handled separately
    const triggerType = 'user_created';

    try {
      const workflows = await this.getWorkflowsForTriggerType(triggerType);

      for (const workflow of workflows) {
        const triggers = await this.userTriggerService.retrieveTriggerData(workflow.id);

        // Process triggers in batches
        const batches = this.createBatches(triggers, 20);

        for (const batch of batches) {
          const jobs = batch.map(trigger => this.createWorkflowJob(trigger, triggerType, workflow.id));

          // Add jobs to queue with high priority for user triggers
          await Promise.all(jobs.map(job =>
            this.workflowQueueService.addWorkflowJob(job, {
              priority: 2, // Highest priority for user triggers
              attempts: 3
            })
          ));
        }

        // Update last execution time using the user trigger service's method
        if (triggers.length > 0) {
          await this.userTriggerService.updateLastExecutionTime(workflow.id, triggerType);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing ${triggerType} triggers: ${error.message}`);
    }
  }

  /**
   * Process delayed executions
   */
  private async processDelayedExecutions(): Promise<void> {
    try {
      const delayedExecutions = await this.workflowDatabaseService.processDelayedExecutions(50);

      for (const delay of delayedExecutions) {
        try {
          // Resume the workflow from the specific delay step (same as original implementation)
          await this.workflowOrchestrationEngine.resumeWorkflowFromDelay(delay);
          this.logger.log(`Resumed workflow from delay ${delay.id} for execution ${delay.executionId}`);
        } catch (error) {
          this.logger.error(`Failed to resume workflow from delay ${delay.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing delayed executions: ${error.message}`);
    }
  }

  /**
   * Create workflow job from trigger data
   */
  private createWorkflowJob(trigger: any, triggerType: string, workflowId: string): WorkflowJobData {
    return {
      executionId: `cron-${workflowId}-${trigger.userId || trigger.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      triggerType,
      triggerId: trigger.id,
      userId: trigger.userId || 'unknown',
      triggerData: trigger.data || trigger,
      metadata: {
        source: 'distributed_scheduler',
        timestamp: new Date(),
        workflowId,
        triggerType
      }
    };
  }

  /**
   * Get workflows for a specific trigger type
   */
  private async getWorkflowsForTriggerType(eventType: string): Promise<Array<{ id: string; name: string; jsonLogic: any }>> {
    try {
      const workflows = await this.workflowService.findAllWithJsonLogic();
      return workflows.filter(wf => {
        const rule = wf.jsonLogic;
        if (!rule) return false;

        // Check for parallel trigger structure
        if (rule.parallel && rule.parallel.trigger && rule.parallel.trigger.trigger) {
          return rule.parallel.trigger.trigger.event === eventType;
        }

        // Check for 'and' trigger structure
        if (rule.and && Array.isArray(rule.and)) {
          for (const condition of rule.and) {
            if (condition && condition.trigger && condition.trigger.event === eventType) {
              return true;
            }
          }
        }

        // Check for 'if' trigger structure
        if (rule.if && Array.isArray(rule.if)) {
          for (const branch of rule.if) {
            if (branch && branch.and && Array.isArray(branch.and)) {
              for (const condition of branch.and) {
                if (condition && condition.trigger && condition.trigger.event === eventType) {
                  return true;
                }
              }
            }
            if (branch && branch.trigger && branch.trigger.event === eventType) {
              return true;
            }
          }
        }

        // Check for direct trigger structure
        if (rule.trigger && rule.trigger.event === eventType) {
          return true;
        }

        return false;
      });
    } catch (error) {
      this.logger.error(`Error getting workflows for trigger type ${eventType}: ${error.message}`);
      return [];
    }
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get scheduler status
   */
  async getSchedulerStatus(): Promise<{
    isLocked: boolean;
    lockInfo: any;
    queueStats: any;
  }> {
    const isLocked = await this.distributedLock.isLocked(this.SCHEDULER_LOCK_KEY);
    const lockInfo = await this.distributedLock.getLockInfo(this.SCHEDULER_LOCK_KEY);

    const [workflowStats, delayStats, schedulerStats] = await Promise.all([
      this.workflowQueueService.getQueueStats('workflow-execution'),
      this.workflowQueueService.getQueueStats('workflow-delay'),
      this.workflowQueueService.getQueueStats('workflow-scheduler')
    ]);

    return {
      isLocked,
      lockInfo,
      queueStats: {
        workflow: workflowStats,
        delay: delayStats,
        scheduler: schedulerStats
      }
    };
  }

  /**
   * Force cleanup of old data
   */
  async cleanupOldData(): Promise<void> {
    const lockKey = 'cleanup_old_data';

    await this.distributedLock.withLock(lockKey, async () => {
      // Cleanup old executions
      await this.workflowDatabaseService.cleanupOldExecutions(30, 1000);

      // Cleanup old queue jobs
      await Promise.all([
        this.workflowQueueService.cleanOldJobs('workflow-execution', 5000),
        this.workflowQueueService.cleanOldJobs('workflow-delay', 5000),
        this.workflowQueueService.cleanOldJobs('workflow-scheduler', 5000)
      ]);

      this.logger.log('Old data cleanup completed');
    }, {
      ttl: 300000, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000
    });
  }
}
