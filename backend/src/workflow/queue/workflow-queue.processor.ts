import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WorkflowQueueService, WorkflowJobData, WorkflowJobResult } from './workflow-queue.service';
import { WorkflowOrchestrationEngine } from '../execution/workflow-orchestration-engine';
import { WorkflowExecutionContext } from '../types';

@Processor('workflow-execution')
export class WorkflowExecutionProcessor {
  private readonly logger = new Logger(WorkflowExecutionProcessor.name);

  constructor(
    private readonly workflowOrchestrationEngine: WorkflowOrchestrationEngine
  ) {
    this.logger.log('WorkflowExecutionProcessor initialized successfully');
  }

  @Process('execute-workflow')
  async handleWorkflowExecution(job: Job<WorkflowJobData>): Promise<WorkflowJobResult> {
    const { executionId, workflowId, triggerType, triggerId, userId, triggerData, metadata } = job.data;

    this.logger.log(`Processing workflow execution ${executionId} for workflow ${workflowId}`);

    try {
      // Create execution context
      const context: WorkflowExecutionContext = {
        executionId,
        workflowId,
        triggerType,
        triggerId,
        userId,
        triggerData,
        data: triggerData,
        metadata: {
          ...metadata,
          source: 'queue',
          timestamp: new Date(),
          jobId: job.id,
        },
        createdAt: new Date()
      };

      // Get workflow definition from database
      const workflow = await this.workflowOrchestrationEngine.getWorkflowById(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Execute workflow
      const result = await this.workflowOrchestrationEngine.executeWorkflow(workflow, context);

      const jobResult: WorkflowJobResult = {
        success: result.success,
        executionId,
        workflowId,
        result: result.result,
        error: result.error,
        metadata: {
          ...result.metadata,
          jobId: job.id,
          processedAt: new Date(),
        }
      };

      this.logger.log(`Workflow execution ${executionId} completed successfully`);
      return jobResult;

    } catch (error) {
      this.logger.error(`Workflow execution ${executionId} failed: ${error.message}`);

      const jobResult: WorkflowJobResult = {
        success: false,
        executionId,
        workflowId,
        error: error.message,
        metadata: {
          jobId: job.id,
          processedAt: new Date(),
          error: error.message,
        }
      };

      return jobResult;
    }
  }

  @OnQueueActive()
  onActive(job: Job<WorkflowJobData>) {
    this.logger.log(`Processing job ${job.id} for workflow ${job.data.workflowId}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<WorkflowJobData>, result: WorkflowJobResult) {
    this.logger.log(`Job ${job.id} completed for workflow ${job.data.workflowId} - Success: ${result.success}`);
  }

  @OnQueueFailed()
  onFailed(job: Job<WorkflowJobData>, error: Error) {
    this.logger.error(`Job ${job.id} failed for workflow ${job.data.workflowId}: ${error.message}`);
  }
}

@Processor('workflow-delay')
export class WorkflowDelayProcessor {
  private readonly logger = new Logger(WorkflowDelayProcessor.name);

  constructor(
    private readonly workflowOrchestrationEngine: WorkflowOrchestrationEngine
  ) {
    this.logger.log('WorkflowDelayProcessor initialized successfully');
  }

  @Process('execute-delayed-workflow')
  async handleDelayedWorkflowExecution(job: Job<WorkflowJobData>): Promise<WorkflowJobResult> {
    const { executionId, workflowId, triggerType, triggerId, userId, triggerData, metadata } = job.data;

    this.logger.log(`Processing delayed workflow execution ${executionId} for workflow ${workflowId}`);

    try {
      // Create execution context
      const context: WorkflowExecutionContext = {
        executionId,
        workflowId,
        triggerType,
        triggerId,
        userId,
        triggerData,
        data: triggerData,
        metadata: {
          ...metadata,
          source: 'delay-queue',
          timestamp: new Date(),
          jobId: job.id,
        },
        createdAt: new Date()
      };

      // Get workflow definition from database
      const workflow = await this.workflowOrchestrationEngine.getWorkflowById(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Execute workflow
      const result = await this.workflowOrchestrationEngine.executeWorkflow(workflow, context);

      const jobResult: WorkflowJobResult = {
        success: result.success,
        executionId,
        workflowId,
        result: result.result,
        error: result.error,
        metadata: {
          ...result.metadata,
          jobId: job.id,
          processedAt: new Date(),
        }
      };

      this.logger.log(`Delayed workflow execution ${executionId} completed successfully`);
      return jobResult;

    } catch (error) {
      this.logger.error(`Delayed workflow execution ${executionId} failed: ${error.message}`);

      const jobResult: WorkflowJobResult = {
        success: false,
        executionId,
        workflowId,
        error: error.message,
        metadata: {
          jobId: job.id,
          processedAt: new Date(),
          error: error.message,
        }
      };

      return jobResult;
    }
  }

  @OnQueueActive()
  onActive(job: Job<WorkflowJobData>) {
    this.logger.log(`Processing delayed job ${job.id} for workflow ${job.data.workflowId}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<WorkflowJobData>, result: WorkflowJobResult) {
    this.logger.log(`Delayed job ${job.id} completed for workflow ${job.data.workflowId} - Success: ${result.success}`);
  }

  @OnQueueFailed()
  onFailed(job: Job<WorkflowJobData>, error: Error) {
    this.logger.error(`Delayed job ${job.id} failed for workflow ${job.data.workflowId}: ${error.message}`);
  }
}

@Processor('workflow-scheduler')
export class WorkflowSchedulerProcessor {
  private readonly logger = new Logger(WorkflowSchedulerProcessor.name);

  constructor(
    private readonly workflowQueueService: WorkflowQueueService
  ) {
    this.logger.log('WorkflowSchedulerProcessor initialized successfully');
  }

  @Process('process-scheduler')
  async handleSchedulerProcessing(job: Job<any>): Promise<any> {
    this.logger.log(`Processing scheduler job ${job.id}`);

    try {
      // This will be implemented to handle the distributed cron processing
      // For now, just log the processing
      this.logger.log(`Scheduler job ${job.id} processed successfully`);

      return {
        success: true,
        jobId: job.id,
        processedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Scheduler job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job<any>) {
    this.logger.log(`Processing scheduler job ${job.id}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<any>, result: any) {
    this.logger.log(`Scheduler job ${job.id} completed successfully`);
  }

  @OnQueueFailed()
  onFailed(job: Job<any>, error: Error) {
    this.logger.error(`Scheduler job ${job.id} failed: ${error.message}`);
  }
}
