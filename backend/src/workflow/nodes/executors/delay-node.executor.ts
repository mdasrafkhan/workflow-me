import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseNodeExecutor } from './base-node.executor';
import {
  ExecutionResult,
  ValidationResult,
  WorkflowStep,
  WorkflowExecutionContext,
  WorkflowExecution
} from '../interfaces/node-executor.interface';
import { WorkflowDelay } from '../../../database/entities/workflow-delay.entity';

/**
 * Delay Node Executor
 * Handles delay/timing operations in workflows
 */
@Injectable()
export class DelayNodeExecutor extends BaseNodeExecutor {
  constructor(
    @InjectRepository(WorkflowDelay)
    private readonly delayRepository: Repository<WorkflowDelay>
  ) {
    super();
  }

  getNodeType(): string {
    return 'delay';
  }

  getDependencies(): string[] {
    return ['WorkflowDelay'];
  }

  async execute(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<ExecutionResult> {
    this.logExecutionStart(step, context);

    try {
      const delayData = step.data;
      const scheduledAt = new Date();

      // Calculate delay hours
      const { delayHours, delayType } = this.calculateDelay(delayData);

      // Calculate execution time
      const executeAt = new Date(scheduledAt.getTime() + (delayHours * 60 * 60 * 1000));

      // Save delay to database
      const delayRecord = this.delayRepository.create({
        executionId: execution.id,
        stepId: step.id,
        delayType: delayType,
        delayMs: delayHours * 60 * 60 * 1000,
        scheduledAt: scheduledAt,
        executeAt: executeAt,
        status: 'pending',
        context: {
          workflowId: context.metadata?.workflowId || 0,
          userId: context.metadata?.userId || 'unknown',
          originalDelayType: delayData.type,
          ...context.data
        },
        retryCount: 0
      });

      await this.delayRepository.save(delayRecord);

      this.logger.log(`Delay scheduled: ${delayHours} hours for execution ${execution.id}, resume at ${executeAt.toISOString()}`);

      const result = this.createSuccessResult(
        {
          delayId: delayRecord.id,
          delayHours,
          executeAt: executeAt.toISOString(),
          status: 'pending'
        },
        undefined, // No next steps - workflow is suspended
        {
          workflowSuspended: true,
          resumeAt: executeAt.toISOString()
        }
      );

      this.logExecutionEnd(step, result);
      return result;

    } catch (error) {
      const result = this.createErrorResult(
        `Delay execution failed: ${error.message}`,
        { stepId: step.id, error: error.message }
      );

      this.logExecutionEnd(step, result);
      return result;
    }
  }

  validate(step: WorkflowStep): ValidationResult {
    const baseValidation = super.validate(step);
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];

    // Validate delay-specific properties
    if (!step.data?.type) {
      errors.push('Delay type is required');
    }

    if (step.data?.type === 'custom' && !step.data?.customDelay) {
      errors.push('Custom delay value is required when type is custom');
    }

    // Validate delay type
    const validTypes = ['1_hour', '1_day', '2_days', '3_days', '5_days', '1_week', '2_weeks', '1_month', 'custom'];
    if (step.data?.type && !validTypes.includes(step.data.type)) {
      errors.push(`Invalid delay type: ${step.data.type}. Must be one of: ${validTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private calculateDelay(delayData: any): { delayHours: number; delayType: string } {
    let delayHours = 0;
    let delayType = 'fixed';

    if (delayData.type === 'fixed') {
      delayHours = delayData.hours || 0;
      delayType = 'fixed';
    } else if (delayData.type === 'random') {
      const minHours = delayData.min_hours || 0;
      const maxHours = delayData.max_hours || minHours;
      delayHours = Math.random() * (maxHours - minHours) + minHours;
      delayType = 'random';
    } else {
      // Handle frontend delay type mappings
      const delayMap = {
        '1_hour': 1,
        '1_day': 24,
        '2_days': 48,
        '3_days': 72,
        '5_days': 120,
        '1_week': 168,
        '2_weeks': 336,
        '1_month': 720
      };

      delayHours = delayMap[delayData.type] || delayData.hours || 24;
      delayType = 'fixed';
    }

    return { delayHours, delayType };
  }
}

