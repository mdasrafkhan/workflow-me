import { WorkflowExecutionResult, WorkflowExecutionContext } from './types';
export declare class WorkflowExecutor {
    private readonly logger;
    executeWorkflow(workflowId: number, jsonLogicRule: any, context: WorkflowExecutionContext): Promise<WorkflowExecutionResult>;
    private executeJsonLogicRule;
    private executeRuleRecursively;
    private executeTriggerRule;
    private executeActionRule;
    private executeDelayRule;
    private executeConditionalRule;
    private executeLogicalRule;
    private executeParallelRule;
    private executeStandardJsonLogic;
    private checkTriggerConditions;
    private executeAction;
    private executeSendEmailAction;
    private executeUpdateUserAction;
    private executeCreateTaskAction;
    validateJsonLogicRule(rule: any): {
        isValid: boolean;
        errors: string[];
    };
    private generateExecutionId;
    private generateStepId;
    testJsonLogic(): boolean;
}
