import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThanOrEqual, LessThan } from 'typeorm';
import { VisualWorkflow } from './visual-workflow.entity';
import { JsonLogicRule } from './json-logic-rule.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../database/entities/workflow-delay.entity';
import { WorkflowOrchestrationEngine } from './execution/workflow-orchestration-engine';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  constructor(
    @InjectRepository(VisualWorkflow)
    private visualWorkflowRepo: Repository<VisualWorkflow>,
    @InjectRepository(JsonLogicRule)
    private jsonLogicRuleRepo: Repository<JsonLogicRule>,
    @InjectRepository(WorkflowExecution)
    private executionRepo: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowDelay)
    private delayRepo: Repository<WorkflowDelay>,
    private workflowOrchestrationEngine: WorkflowOrchestrationEngine,
  ) {}

  async findAll(): Promise<VisualWorkflow[]> {
    return this.visualWorkflowRepo.find({
      relations: ['jsonLogicRule']
    });
  }

  async findOne(id: string): Promise<VisualWorkflow> {
    return this.visualWorkflowRepo.findOne({
      where: { id },
      relations: ['jsonLogicRule']
    });
  }

  async createOrUpdate(data: {
    id?: string;
    name: string;
    nodes: any;
    edges: any;
    jsonLogic?: any;
  }): Promise<VisualWorkflow> {
    if (data.id) {
      // Update existing workflow
      const existingWorkflow = await this.visualWorkflowRepo.findOne({
        where: { id: data.id },
        relations: ['jsonLogicRule']
      });

      if (existingWorkflow) {
        existingWorkflow.name = data.name;
        existingWorkflow.nodes = data.nodes;
        existingWorkflow.edges = data.edges;
        existingWorkflow.updatedAt = new Date();

        // Update or create JsonLogic rule
        if (data.jsonLogic) {
          if (existingWorkflow.jsonLogicRule) {
            existingWorkflow.jsonLogicRule.rule = data.jsonLogic;
            existingWorkflow.jsonLogicRule.updatedAt = new Date();
          } else {
            existingWorkflow.jsonLogicRule = this.jsonLogicRuleRepo.create({
              rule: data.jsonLogic
            });
          }
        }

        return this.visualWorkflowRepo.save(existingWorkflow);
      }
    }

    // Create new workflow
    const visualWorkflow = this.visualWorkflowRepo.create({
      name: data.name,
      nodes: data.nodes,
      edges: data.edges
    });

    // Create JsonLogic rule if provided
    if (data.jsonLogic) {
      visualWorkflow.jsonLogicRule = this.jsonLogicRuleRepo.create({
        rule: data.jsonLogic
      });
    }

    return this.visualWorkflowRepo.save(visualWorkflow);
  }

  async remove(id: string): Promise<void> {
    // First check if the workflow exists
    const workflow = await this.visualWorkflowRepo.findOne({
      where: { id },
      relations: ['jsonLogicRule']
    });

    if (!workflow) {
      throw new Error(`Workflow with id ${id} not found`);
    }

    // Get the workflow UUID for identification
    const workflowUuid = workflow.id;
    const workflowName = workflow.name;
    const jsonLogicRuleId = workflow.jsonLogicRule?.id;

    console.log(`🗑️  Deleting workflow: ${workflowName} (UUID: ${workflowUuid})`);

    // Step 1: Find all workflow executions for this workflow
    const executions = await this.executionRepo.find({
      where: { workflowId: workflowUuid }
    });

    console.log(`📊 Found ${executions.length} workflow executions to delete`);

    if (executions.length > 0) {
      // Get all execution IDs
      const executionIds = executions.map(exec => exec.executionId);

      // Step 2: Delete all related workflow delays
      const delayDeleteResult = await this.delayRepo
        .createQueryBuilder()
        .delete()
        .where("executionId IN (:...executionIds)", { executionIds })
        .execute();

      console.log(`⏰ Deleted ${delayDeleteResult.affected} workflow delays`);

      // Step 3: Delete all workflow executions
          const executionDeleteResult = await this.executionRepo
            .createQueryBuilder()
            .delete()
            .where("workflowId = :workflowUuid", { workflowUuid })
            .execute();

      console.log(`🔄 Deleted ${executionDeleteResult.affected} workflow executions`);
    }

    // Step 4: Delete the JsonLogic rule if it exists
    if (jsonLogicRuleId) {
      await this.jsonLogicRuleRepo.delete(jsonLogicRuleId);
      console.log(`📋 Deleted JsonLogic rule (ID: ${jsonLogicRuleId})`);
    }

    // Step 5: Finally delete the visual workflow
    await this.visualWorkflowRepo.delete(id);
    console.log(`✅ Deleted visual workflow: ${workflowName}`);

    console.log(`🎉 Workflow deletion completed successfully!`);
  }

  // Get workflows with JsonLogic rules for execution
  async findAllWithJsonLogic(): Promise<Array<{ id: string; name: string; jsonLogic: any }>> {
    const workflows = await this.visualWorkflowRepo.find({
      relations: ['jsonLogicRule']
    });

    return workflows
      .filter(wf => wf.jsonLogicRule)
      .map(wf => ({
        id: wf.workflowId, // Use the actual workflow table ID, not the visual workflow ID
        name: wf.name,
        jsonLogic: wf.jsonLogicRule.rule
      }));
  }

  // Find recent executions for duplicate prevention
  async findRecentExecutions(workflowId: string, userId: string, since: Date): Promise<any[]> {
    try {
      // Query the workflow executions repository for recent executions
      const executions = await this.executionRepo.find({
        where: {
          workflowId: workflowId,
          userId: userId,
          createdAt: MoreThan(since)
        },
        order: {
          createdAt: 'DESC'
        }
      });

      return executions;
    } catch (error) {
      console.error('Error finding recent executions:', error);
      return [];
    }
  }

  /**
   * Process delayed executions that are ready to run
   */
  async processDelayedExecutions(): Promise<void> {
    const now = new Date();

    try {
      // Query the database for pending delays where executeAt <= now
      // Also include processing delays that might have been stuck
      const readyDelays = await this.delayRepo.find({
        where: [
          {
            status: 'pending',
            executeAt: LessThanOrEqual(now)
          },
          {
            status: 'processing',
            executeAt: LessThanOrEqual(new Date(now.getTime() - 5 * 60 * 1000)) // 5 minutes ago
          }
        ],
        order: {
          executeAt: 'ASC'
        }
      });

      // Clean up old executed delays (older than 1 hour)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      await this.delayRepo.delete({
        status: 'executed',
        executedAt: LessThan(oneHourAgo)
      });

      // Process each delay individually to handle multiple delays per execution
      for (const delay of readyDelays) {
        try {
          // Use atomic update to prevent race conditions
          // Only update if status is still 'pending'
          const updateResult = await this.delayRepo.update(
            {
              id: delay.id,
              status: 'pending' // Only update if still pending
            },
            {
              status: 'processing', // Mark as processing to prevent other instances
              updatedAt: new Date()
            }
          );

          // If no rows were updated, another instance is already processing this delay
          if (updateResult.affected === 0) {
            this.logger.warn(`Delay ${delay.id} already being processed by another instance`);
            continue;
          }

          // Get the workflow execution
          const execution = await this.executionRepo.findOne({
            where: { executionId: delay.executionId }
          });

          if (!execution) {
            // Mark delay as failed since execution doesn't exist
            await this.delayRepo.update(delay.id, {
              status: 'failed',
              executedAt: new Date(),
              error: 'Workflow execution not found'
            });
            continue;
          }

          // Resume the workflow from the specific delay step
          await this.workflowOrchestrationEngine.resumeWorkflowFromDelay(delay);

          // Mark this specific delay as executed
          await this.delayRepo.update(delay.id, {
            status: 'executed',
            executedAt: new Date()
          });
        } catch (error) {
          // Mark this specific delay as failed
          await this.delayRepo.update(delay.id, {
            status: 'failed',
            error: error.message
          });
        }
      }
    } catch (error) {
      console.error('Error in processDelayedExecutions:', error);
    }
  }

}
