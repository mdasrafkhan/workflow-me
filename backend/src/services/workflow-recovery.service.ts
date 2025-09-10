import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../database/entities/workflow-delay.entity';
import { WorkflowExecutionContext } from '../workflow/types';
import { WorkflowOrchestrationEngine } from '../workflow/execution/workflow-orchestration-engine';

@Injectable()
export class WorkflowRecoveryService {
  private readonly logger = new Logger(WorkflowRecoveryService.name);

  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowDelay)
    private readonly delayRepository: Repository<WorkflowDelay>,
    private readonly orchestrationEngine: WorkflowOrchestrationEngine
  ) {}

  /**
   * Recover workflows after system restart
   */
  async recoverWorkflows(): Promise<{
    recovered: number;
    failed: number;
    details: string[];
  }> {
    this.logger.log('Starting workflow recovery after system restart...');

    const results = {
      recovered: 0,
      failed: 0,
      details: [] as string[]
    };

    try {
      // 1. Recover running workflows that were interrupted
      const runningWorkflows = await this.executionRepository.find({
        where: { status: 'running' }
      });

      for (const execution of runningWorkflows) {
        try {
          await this.recoverRunningWorkflow(execution);
          results.recovered++;
          results.details.push(`Recovered running workflow: ${execution.executionId}`);
        } catch (error) {
          results.failed++;
          results.details.push(`Failed to recover running workflow ${execution.executionId}: ${error.message}`);
          this.logger.error(`Failed to recover running workflow ${execution.executionId}:`, error);
        }
      }

      // 2. Recover delayed workflows that should have executed
      const overdueDelays = await this.delayRepository.find({
        where: {
          status: 'pending',
          executeAt: LessThan(new Date())
        }
      });

      for (const delay of overdueDelays) {
        try {
          await this.recoverDelayedWorkflow(delay);
          results.recovered++;
          results.details.push(`Recovered delayed workflow: ${delay.executionId}`);
        } catch (error) {
          results.failed++;
          results.details.push(`Failed to recover delayed workflow ${delay.executionId}: ${error.message}`);
          this.logger.error(`Failed to recover delayed workflow ${delay.executionId}:`, error);
        }
      }

      // 3. Clean up old failed delays (older than 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const deletedFailedDelays = await this.delayRepository.delete({
        status: 'failed',
        executedAt: LessThan(oneDayAgo)
      });

      if (deletedFailedDelays.affected > 0) {
        results.details.push(`Cleaned up ${deletedFailedDelays.affected} old failed delays`);
      }

      // 4. Mark stale workflows as failed
      const staleWorkflows = await this.executionRepository.find({
        where: {
          status: 'running',
          updatedAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)) // 24 hours ago
        }
      });

      for (const execution of staleWorkflows) {
        try {
          await this.executionRepository.update(execution.id, {
            status: 'failed',
            error: 'Workflow marked as failed due to system restart timeout',
            failedAt: new Date()
          });
          results.details.push(`Marked stale workflow as failed: ${execution.executionId}`);
        } catch (error) {
          results.failed++;
          results.details.push(`Failed to mark stale workflow as failed ${execution.executionId}: ${error.message}`);
        }
      }

      this.logger.log(`Workflow recovery completed: ${results.recovered} recovered, ${results.failed} failed`);
      return results;

    } catch (error) {
      this.logger.error('Workflow recovery failed:', error);
      results.failed++;
      results.details.push(`Recovery process failed: ${error.message}`);
      return results;
    }
  }

  /**
   * Recover a running workflow that was interrupted
   */
  private async recoverRunningWorkflow(execution: WorkflowExecution): Promise<void> {
    this.logger.log(`Recovering running workflow: ${execution.executionId}`);

    // Update the execution status to indicate it needs to be restarted
    const updatedState = {
      ...execution.state,
      recovery: {
        lastRecoveryAt: new Date(),
        recoveredAt: new Date(),
        recoveryCount: (execution.state.recovery?.recoveryCount || 0) + 1
      }
    };

    const updatedMetadata = {
      ...(execution.metadata || {}),
      recoveryReason: 'system_restart',
      previousStatus: 'running'
    };

    await this.executionRepository
      .createQueryBuilder()
      .update(WorkflowExecution)
      .set({
        status: 'pending',
        state: () => `'${JSON.stringify(updatedState)}'`,
        metadata: () => `'${JSON.stringify(updatedMetadata)}'`
      })
      .where('id = :id', { id: execution.id })
      .execute();

    // The workflow will be picked up by the next batch processing cycle
  }

  /**
   * Recover a delayed workflow that should have executed
   */
  private async recoverDelayedWorkflow(delay: WorkflowDelay): Promise<void> {
    this.logger.log(`Recovering delayed workflow: ${delay.executionId}`);

    // Instead of just marking as executed, actually process the delay
    // This will resume the workflow properly
    try {
      await this.orchestrationEngine.resumeWorkflowFromDelay(delay);
      this.logger.log(`Successfully recovered delayed workflow: ${delay.executionId}`);
    } catch (error) {
      this.logger.error(`Failed to recover delayed workflow ${delay.executionId}:`, error);

      // Mark as failed if recovery fails
      await this.delayRepository.update(delay.id, {
        status: 'failed',
        executedAt: new Date(),
        error: `Recovery failed: ${error.message}`
      });
      throw error;
    }
  }

  /**
   * Get recovery statistics
   */
  async getRecoveryStatistics(): Promise<{
    totalExecutions: number;
    runningExecutions: number;
    delayedExecutions: number;
    failedExecutions: number;
    pendingDelays: number;
    overdueDelays: number;
  }> {
    const totalExecutions = await this.executionRepository.count();
    const runningExecutions = await this.executionRepository.count({
      where: { status: 'running' }
    });
    const delayedExecutions = await this.executionRepository.count({
      where: { status: 'delayed' }
    });
    const failedExecutions = await this.executionRepository.count({
      where: { status: 'failed' }
    });
    const pendingDelays = await this.delayRepository.count({
      where: { status: 'pending' }
    });
    const overdueDelays = await this.delayRepository.count({
      where: {
        status: 'pending',
        executeAt: LessThan(new Date())
      }
    });

    return {
      totalExecutions,
      runningExecutions,
      delayedExecutions,
      failedExecutions,
      pendingDelays,
      overdueDelays
    };
  }

  /**
   * Clean up old execution data
   */
  async cleanupOldData(daysOld: number = 30): Promise<{
    deletedExecutions: number;
    deletedDelays: number;
    deletedEmails: number;
  }> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    this.logger.log(`Cleaning up data older than ${daysOld} days`);

    // Delete old completed executions
    const deletedExecutions = await this.executionRepository
      .createQueryBuilder()
      .delete()
      .where('status IN (:...statuses)', { statuses: ['completed', 'cancelled'] })
      .andWhere('updatedAt < :cutoff', { cutoff: cutoffDate })
      .execute();

    // Delete old executed delays
    const deletedDelays = await this.delayRepository
      .createQueryBuilder()
      .delete()
      .where('status = :status', { status: 'executed' })
      .andWhere('executedAt < :cutoff', { cutoff: cutoffDate })
      .execute();

    // Note: Email logs cleanup would be handled by EmailService
    const deletedEmails = 0; // Placeholder

    this.logger.log(`Cleanup completed: ${deletedExecutions.affected} executions, ${deletedDelays.affected} delays deleted`);

    return {
      deletedExecutions: deletedExecutions.affected || 0,
      deletedDelays: deletedDelays.affected || 0,
      deletedEmails
    };
  }

  /**
   * Validate workflow state consistency
   */
  async validateWorkflowState(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check for orphaned delays
      const orphanedDelays = await this.delayRepository
        .createQueryBuilder('delay')
        .leftJoin('delay.execution', 'execution')
        .where('execution.id IS NULL')
        .getCount();

      if (orphanedDelays > 0) {
        issues.push(`Found ${orphanedDelays} orphaned delays`);
      }

      // Check for executions with invalid states
      const invalidExecutions = await this.executionRepository
        .createQueryBuilder('execution')
        .where('execution.status NOT IN (:...validStatuses)', {
          validStatuses: ['pending', 'running', 'delayed', 'completed', 'failed', 'cancelled']
        })
        .getCount();

      if (invalidExecutions > 0) {
        issues.push(`Found ${invalidExecutions} executions with invalid status`);
      }

      // Check for running workflows without state machine
      const runningWithoutState = await this.executionRepository
        .createQueryBuilder('execution')
        .where('execution.status = :status', { status: 'running' })
        .andWhere('execution.state IS NULL')
        .getCount();

      if (runningWithoutState > 0) {
        issues.push(`Found ${runningWithoutState} running workflows without state`);
      }

      return {
        valid: issues.length === 0,
        issues
      };

    } catch (error) {
      this.logger.error('Workflow state validation failed:', error);
      return {
        valid: false,
        issues: [`Validation failed: ${error.message}`]
      };
    }
  }
}

