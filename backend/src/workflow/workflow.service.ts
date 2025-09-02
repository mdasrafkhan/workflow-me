import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisualWorkflow } from './visual-workflow.entity';
import { JsonLogicRule } from './json-logic-rule.entity';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(VisualWorkflow)
    private visualWorkflowRepo: Repository<VisualWorkflow>,
    @InjectRepository(JsonLogicRule)
    private jsonLogicRuleRepo: Repository<JsonLogicRule>,
  ) {}

  async findAll(): Promise<VisualWorkflow[]> {
    return this.visualWorkflowRepo.find({
      relations: ['jsonLogicRule']
    });
  }

  async findOne(id: number): Promise<VisualWorkflow> {
    return this.visualWorkflowRepo.findOne({
      where: { id },
      relations: ['jsonLogicRule']
    });
  }

  async createOrUpdate(data: {
    id?: number;
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

  async remove(id: number): Promise<void> {
    await this.visualWorkflowRepo.delete(id);
  }

  // Get workflows with JsonLogic rules for execution
  async findAllWithJsonLogic(): Promise<Array<{ id: number; name: string; jsonLogic: any }>> {
    const workflows = await this.visualWorkflowRepo.find({
      relations: ['jsonLogicRule']
    });

    return workflows
      .filter(wf => wf.jsonLogicRule)
      .map(wf => ({
        id: wf.id,
        name: wf.name,
        jsonLogic: wf.jsonLogicRule.rule
      }));
  }

  // Migrate old workflows to new structure
  async migrateOldWorkflows(): Promise<{ migrated: number; message: string }> {
    try {
      // Get old workflows from the legacy table
      const oldWorkflows = await this.visualWorkflowRepo.manager.query(
        'SELECT id, name, "jsonLogic" FROM workflow WHERE "jsonLogic" IS NOT NULL'
      );

      let migrated = 0;
      for (const oldWf of oldWorkflows) {
        // Check if already migrated
        const existing = await this.visualWorkflowRepo.findOne({
          where: { name: oldWf.name }
        });

        if (!existing) {
          // Create new visual workflow with JsonLogic
          const visualWorkflow = this.visualWorkflowRepo.create({
            name: oldWf.name,
            nodes: [], // Empty nodes for migrated workflows
            edges: []  // Empty edges for migrated workflows
          });

          // Create JsonLogic rule
          visualWorkflow.jsonLogicRule = this.jsonLogicRuleRepo.create({
            rule: oldWf.jsonLogic
          });

          await this.visualWorkflowRepo.save(visualWorkflow);
          migrated++;
        }
      }

      return {
        migrated,
        message: `Successfully migrated ${migrated} workflows to new structure`
      };
    } catch (error) {
      return {
        migrated: 0,
        message: `Migration failed: ${error.message}`
      };
    }
  }
}
