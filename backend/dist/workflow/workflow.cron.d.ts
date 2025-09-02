import { WorkflowService } from './workflow.service';
import { WorkflowExecutor } from './execution/WorkflowExecutor';
export declare class WorkflowCron {
    private readonly workflowService;
    private readonly workflowExecutor;
    constructor(workflowService: WorkflowService, workflowExecutor: WorkflowExecutor);
    handleCron(): Promise<void>;
    private executeWorkflowWithNewEngine;
    private executeWorkflowWithJsonLogic;
    private executeAction;
}
