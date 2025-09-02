import { WorkflowService } from './workflow.service';
import { WorkflowExecutor } from './execution/WorkflowExecutor';
import { VisualWorkflow } from './visual-workflow.entity';
export declare class WorkflowController {
    private readonly workflowService;
    private readonly workflowExecutor;
    constructor(workflowService: WorkflowService, workflowExecutor: WorkflowExecutor);
    findAll(): Promise<VisualWorkflow[]>;
    findOne(id: string): Promise<VisualWorkflow>;
    createOrUpdate(body: {
        id?: number;
        name: string;
        nodes: any;
        edges: any;
        jsonLogic?: any;
    }): Promise<VisualWorkflow>;
    remove(id: string): Promise<void>;
    migrateOldWorkflows(): Promise<{
        migrated: number;
        message: string;
    }>;
    testJsonLogic(): {
        success: boolean;
        message: string;
    };
}
