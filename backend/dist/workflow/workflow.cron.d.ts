import { WorkflowService } from './workflow.service';
import { WorkflowExecutor } from './execution/WorkflowExecutor';
export declare class WorkflowCron {
    private readonly workflowService;
    private readonly workflowExecutor;
    private lastExecutionTime;
    private executionHistory;
    constructor(workflowService: WorkflowService, workflowExecutor: WorkflowExecutor);
    handleCron(): Promise<void>;
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
    private executeWorkflowWithNewEngine;
    private executeWorkflowWithJsonLogic;
    private executeAction;
}
