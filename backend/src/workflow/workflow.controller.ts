import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutor } from './execution/WorkflowExecutor';
import { VisualWorkflow } from './visual-workflow.entity';

@Controller('api/workflows')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutor: WorkflowExecutor
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

  @Post('migrate')
  async migrateOldWorkflows(): Promise<{ migrated: number; message: string }> {
    return this.workflowService.migrateOldWorkflows();
  }

  @Get('test/jsonlogic')
  testJsonLogic(): { success: boolean; message: string } {
    const result = this.workflowExecutor.testJsonLogic();
    return {
      success: result,
      message: result ? 'JsonLogic is working correctly' : 'JsonLogic test failed'
    };
  }
}
