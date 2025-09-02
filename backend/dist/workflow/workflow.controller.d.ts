import { WorkflowService } from './workflow.service';
import { WorkflowExecutor } from './execution/WorkflowExecutor';
import { WorkflowCron } from './workflow.cron';
import { VisualWorkflow } from './visual-workflow.entity';
export declare class WorkflowController {
    private readonly workflowService;
    private readonly workflowExecutor;
    private readonly workflowCron;
    constructor(workflowService: WorkflowService, workflowExecutor: WorkflowExecutor, workflowCron: WorkflowCron);
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
    getWorkflowJsonLogic(id: string): Promise<{
        workflowId: number;
        name: string;
        jsonLogic: any;
        isValid: boolean;
        errors: string[];
    }>;
    testWorkflowExecution(id: string, testData?: any): Promise<{
        workflowId: number;
        executionResult: any;
        success: boolean;
        error?: string;
    }>;
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
    };
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
    };
    regenerateJsonLogic(id: string): Promise<{
        workflowId: number;
        name: string;
        jsonLogic: any;
        isValid: boolean;
        errors: string[];
        message: string;
    }>;
}
