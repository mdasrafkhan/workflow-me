import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutor } from './execution/WorkflowExecutor';
import { WorkflowCron } from './workflow.cron';
import { VisualWorkflow } from './visual-workflow.entity';

@Controller('api/workflows')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutor: WorkflowExecutor,
    private readonly workflowCron: WorkflowCron
  ) {}

  @Get()
  findAll(): Promise<VisualWorkflow[]> {
    return this.workflowService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<VisualWorkflow> {
    return this.workflowService.findOne(Number(id));
  }

  @Post()
  createOrUpdate(@Body() body: {
    id?: number;
    name: string;
    nodes: any;
    edges: any;
    jsonLogic?: any;
  }): Promise<VisualWorkflow> {
    return this.workflowService.createOrUpdate(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.workflowService.remove(Number(id));
  }



  @Get('test/jsonlogic')
  async testJsonLogic(): Promise<{ success: boolean; message: string }> {
    const result = await this.workflowExecutor.testJsonLogic();
    return {
      success: result,
      message: result ? 'JsonLogic is working correctly' : 'JsonLogic test failed'
    };
  }

  @Get(':id/jsonlogic')
  async getWorkflowJsonLogic(@Param('id') id: string): Promise<{
    workflowId: number;
    name: string;
    jsonLogic: any;
    isValid: boolean;
    errors: string[]
  }> {
    const workflow = await this.workflowService.findOne(Number(id));

    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    const jsonLogic = workflow.jsonLogicRule?.rule || null;
    const validationResult = this.workflowExecutor.validateJsonLogicRule(jsonLogic);

    return {
      workflowId: workflow.id,
      name: workflow.name,
      jsonLogic: jsonLogic,
      isValid: validationResult.isValid,
      errors: validationResult.errors
    };
  }

  @Post(':id/test-execution')
  async testWorkflowExecution(@Param('id') id: string, @Body() testData?: any): Promise<{
    workflowId: number;
    executionResult: any;
    success: boolean;
    error?: string;
  }> {
    const workflow = await this.workflowService.findOne(Number(id));

    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    const jsonLogic = workflow.jsonLogicRule?.rule;
    if (!jsonLogic) {
      throw new Error(`Workflow ${id} has no JsonLogic rule`);
    }

    // Use provided test data or default sample data
    const context = {
      data: testData || {
        id: 999,
        email: "test@example.com",
        subscription_package: "premium",
        subscription_status: "active",
        newsletter_subscribed: true,
        user_segment: "new_user"
      },
      metadata: {
        source: 'test',
        timestamp: new Date(),
        userId: '999'
      }
    };

    try {
      const result = await this.workflowExecutor.executeWorkflow(Number(id), jsonLogic, context);
      return {
        workflowId: Number(id),
        executionResult: result,
        success: result.success
      };
    } catch (error) {
      return {
        workflowId: Number(id),
        executionResult: null,
        success: false,
        error: error.message
      };
    }
  }

  @Get('cron/status')
  getCronStatus(): {
    isRunning: boolean;
    lastExecutionTime: Date | null;
    executionHistory: Array<{
      timestamp: Date;
      workflowsProcessed: number;
      successCount: number;
      errorCount: number;
      executionTime: number;
    }>;
    nextExecutionTime: Date;
    schedule: string;
  } {
    return this.workflowCron.getCronStatus();
  }

  @Get('cron/metrics')
  getCronMetrics(): {
    totalExecutions: number;
    averageExecutionTime: number;
    successRate: number;
    totalWorkflowsProcessed: number;
    last24Hours: {
      executions: number;
      totalWorkflows: number;
      averageTime: number;
      successRate: number;
    };
  } {
    return this.workflowCron.getCronMetrics();
  }

    @Post(':id/regenerate-jsonlogic')
  async regenerateJsonLogic(@Param('id') id: string): Promise<{
    workflowId: number;
    name: string;
    jsonLogic: any;
    isValid: boolean;
    errors: string[];
    message: string;
  }> {
    const workflow = await this.workflowService.findOne(Number(id));

    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    // For now, return the existing JsonLogic with a note that regeneration
    // should be done from the frontend where the JsonLogicConverter is available
    const existingJsonLogic = workflow.jsonLogicRule?.rule || null;

    // Validate the existing JsonLogic
    const validationResult = this.workflowExecutor.validateJsonLogicRule(existingJsonLogic);

    return {
      workflowId: workflow.id,
      name: workflow.name,
      jsonLogic: existingJsonLogic,
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      message: 'JsonLogic regeneration should be done from the frontend. Use the workflow editor to save and regenerate JsonLogic.'
    };
  }
}
