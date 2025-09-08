/**
 * Delay Scheduler for Workflow Execution
 * Handles scheduling and tracking of delayed workflow actions
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface DelayExecution {
  id: string;
  workflowId: string;
  executionId: string;
  userId: string;
  delayType: 'fixed' | 'random';
  delayHours: number;
  scheduledAt: Date;
  executeAt: Date;
  status: 'pending' | 'executed' | 'cancelled';
  context: any; // User data and workflow context
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DelayScheduler {
  private readonly logger = new Logger(DelayScheduler.name);

  constructor(
    // In a real implementation, you'd inject a repository for DelayExecution
    // @InjectRepository(DelayExecution)
    // private delayExecutionRepo: Repository<DelayExecution>
  ) {}

  /**
   * Schedule a delay execution
   */
  async scheduleDelay(
    workflowId: string,
    executionId: string,
    userId: string,
    delayConfig: {
      type: 'fixed' | 'random';
      hours?: number;
      min_hours?: number;
      max_hours?: number;
    },
    context: any
  ): Promise<DelayExecution> {
    const delayHours = this.calculateDelayHours(delayConfig);
    const scheduledAt = new Date();
    const executeAt = new Date(scheduledAt.getTime() + (delayHours * 60 * 60 * 1000));

    const delayExecution: DelayExecution = {
      id: `delay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      executionId,
      userId,
      delayType: delayConfig.type,
      delayHours,
      scheduledAt,
      executeAt,
      status: 'pending',
      context,
      createdAt: scheduledAt,
      updatedAt: scheduledAt
    };

    this.logger.log(`Scheduled delay: ${delayHours} hours for execution ${executionId}, execute at ${executeAt.toISOString()}`);

    // In a real implementation, save to database
    // await this.delayExecutionRepo.save(delayExecution);

    return delayExecution;
  }

  /**
   * Get all pending delays that should be executed now
   */
  async getPendingDelays(): Promise<DelayExecution[]> {
    const now = new Date();

    // In a real implementation, query the database
    // return await this.delayExecutionRepo.find({
    //   where: {
    //     status: 'pending',
    //     executeAt: LessThanOrEqual(now)
    //   }
    // });

    // For now, return empty array
    return [];
  }

  /**
   * Mark a delay as executed
   */
  async markDelayExecuted(delayId: string): Promise<void> {
    this.logger.log(`Marking delay ${delayId} as executed`);

    // In a real implementation, update the database
    // await this.delayExecutionRepo.update(delayId, {
    //   status: 'executed',
    //   updatedAt: new Date()
    // });
  }

  /**
   * Calculate delay hours based on configuration
   */
  private calculateDelayHours(delayConfig: {
    type: 'fixed' | 'random';
    hours?: number;
    min_hours?: number;
    max_hours?: number;
  }): number {
    if (delayConfig.type === 'fixed') {
      return delayConfig.hours || 0;
    } else if (delayConfig.type === 'random') {
      const minHours = delayConfig.min_hours || 0;
      const maxHours = delayConfig.max_hours || minHours;
      return Math.random() * (maxHours - minHours) + minHours;
    }
    return 0;
  }

  /**
   * Enhanced delay JsonLogic that includes timing information
   */
  static createEnhancedDelayLogic(
    delayConfig: {
      type: 'fixed' | 'random';
      hours?: number;
      min_hours?: number;
      max_hours?: number;
    },
    executionContext: {
      workflowId: string;
      executionId: string;
      userId: string;
      scheduledAt: Date;
    }
  ): any {
    const delayHours = delayConfig.type === 'fixed'
      ? delayConfig.hours || 0
      : Math.random() * ((delayConfig.max_hours || 0) - (delayConfig.min_hours || 0)) + (delayConfig.min_hours || 0);

    const executeAt = new Date(executionContext.scheduledAt.getTime() + (delayHours * 60 * 60 * 1000));

    return {
      "delay": {
        "type": delayConfig.type,
        "hours": delayHours,
        "scheduledAt": executionContext.scheduledAt.toISOString(),
        "executeAt": executeAt.toISOString(),
        "workflowId": executionContext.workflowId,
        "executionId": executionContext.executionId,
        "userId": executionContext.userId,
        "status": "pending"
      }
    };
  }
}
