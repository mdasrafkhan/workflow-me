import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisualWorkflow } from '../workflow/visual-workflow.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowDelay } from '../database/entities/workflow-delay.entity';

@Injectable()
export class TestDataCleanupService {
  constructor(
    @InjectRepository(VisualWorkflow)
    private visualWorkflowRepo: Repository<VisualWorkflow>,
    @InjectRepository(WorkflowExecution)
    private executionRepo: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowDelay)
    private delayRepo: Repository<WorkflowDelay>,
  ) {}

  /**
   * Cleanup test data while preserving user-generated workflows
   * This method identifies test workflows by naming patterns and removes them
   * along with their related executions and delays.
   */
  async cleanupTestData(): Promise<{
    deletedExecutions: number;
    deletedDelays: number;
    deletedEmails: number;
    deletedWorkflows: number;
  }> {
    try {
      console.log('🧹 Starting test data cleanup...');

      // Get all workflows
      const allWorkflows = await this.visualWorkflowRepo.find();

      // Identify test workflows (only those with clear test patterns in name)
      const testWorkflows = allWorkflows.filter(wf =>
        wf.name.toLowerCase().includes('test') ||
        wf.name.toLowerCase().includes('duplicate') ||
        wf.name.toLowerCase().includes('demo') ||
        wf.name.toLowerCase().includes('sample')
      );

      // Identify user workflows (not test workflows)
      const userWorkflows = allWorkflows.filter(wf =>
        !testWorkflows.some(testWf => testWf.id === wf.id)
      );

      console.log(`📊 Found ${allWorkflows.length} total workflows: ${userWorkflows.length} user workflows, ${testWorkflows.length} test workflows`);

      let deletedExecutions = 0;
      let deletedDelays = 0;
      let deletedWorkflows = 0;

      // Delete test workflows and their related data
      for (const testWorkflow of testWorkflows) {
        try {
          // Delete related executions
          const executions = await this.executionRepo.find({
            where: { workflowId: testWorkflow.id }
          });

          for (const execution of executions) {
            // Delete related delays
            const delays = await this.delayRepo.find({
              where: { executionId: execution.id }
            });

            if (delays.length > 0) {
              await this.delayRepo.delete(delays.map(d => d.id));
              deletedDelays += delays.length;
            }
          }

          if (executions.length > 0) {
            await this.executionRepo.delete(executions.map(e => e.id));
            deletedExecutions += executions.length;
          }

          // Delete the workflow
          await this.visualWorkflowRepo.delete(testWorkflow.id);
          deletedWorkflows++;

          console.log(`✅ Cleaned up test workflow: ${testWorkflow.name}`);
        } catch (error) {
          console.error(`❌ Error cleaning up workflow ${testWorkflow.name}:`, error);
        }
      }

      const result = {
        deletedExecutions,
        deletedDelays,
        deletedEmails: 0, // No email cleanup in this implementation
        deletedWorkflows
      };

      console.log(`🎉 Cleanup completed:`, result);
      console.log(`✅ Preserved ${userWorkflows.length} user-generated workflows`);

      return result;
    } catch (error) {
      console.error('❌ Error during test data cleanup:', error);
      return {
        deletedExecutions: 0,
        deletedDelays: 0,
        deletedEmails: 0,
        deletedWorkflows: 0
      };
    }
  }

  /**
   * Check if the current environment is safe for test data cleanup
   * This prevents accidental cleanup in production environments
   */
  isCleanupSafe(): boolean {
    const nodeEnv = process.env.NODE_ENV;
    const isTestEnvironment = nodeEnv === 'test' || nodeEnv === 'development';
    const hasTestFlag = process.env.ENABLE_TEST_CLEANUP === 'true';

    return isTestEnvironment || hasTestFlag;
  }

  /**
   * Get statistics about test vs user workflows without deleting anything
   */
  async getTestDataStats(): Promise<{
    totalWorkflows: number;
    testWorkflows: number;
    userWorkflows: number;
    testWorkflowNames: string[];
  }> {
    const allWorkflows = await this.visualWorkflowRepo.find();

    const testWorkflows = allWorkflows.filter(wf =>
      wf.name.toLowerCase().includes('test') ||
      wf.name.toLowerCase().includes('duplicate') ||
      wf.name.toLowerCase().includes('demo') ||
      wf.name.toLowerCase().includes('sample')
    );

    const userWorkflows = allWorkflows.filter(wf =>
      !testWorkflows.some(testWf => testWf.id === wf.id)
    );

    return {
      totalWorkflows: allWorkflows.length,
      testWorkflows: testWorkflows.length,
      userWorkflows: userWorkflows.length,
      testWorkflowNames: testWorkflows.map(wf => wf.name)
    };
  }
}
