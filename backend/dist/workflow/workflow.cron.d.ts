import { WorkflowService } from './workflow.service';
export declare class WorkflowCron {
    private readonly workflowService;
    constructor(workflowService: WorkflowService);
    handleCron(): Promise<void>;
    private executeWorkflowWithJsonLogic;
    private executeAction;
}
