export interface WorkflowExecutionContext {
    data: any;
    metadata?: {
        source?: string;
        timestamp?: Date;
        userId?: string;
        sessionId?: string;
        workflowId?: number;
    };
}
export interface ExecutionStep {
    id: string;
    type: 'trigger' | 'action' | 'delay' | 'conditional' | 'logical' | 'parallel' | 'jsonlogic';
    rule: any;
    startTime: number;
    endTime?: number;
    status: 'running' | 'completed' | 'failed';
    result?: any;
    error?: string;
}
export interface WorkflowExecutionResult {
    executionId: string;
    workflowId: number;
    success: boolean;
    result?: any;
    error?: string;
    executionTime: number;
    steps: ExecutionStep[];
    timestamp: Date;
}
export interface WorkflowExecutionHistory {
    executionId: string;
    workflowId: number;
    userId?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    result?: any;
    error?: string;
    steps: ExecutionStep[];
}
export interface WorkflowMetrics {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecutionTime?: Date;
    mostCommonErrors: Array<{
        error: string;
        count: number;
    }>;
}
export interface WorkflowScheduler {
    scheduleWorkflow(workflowId: number, cronExpression: string): Promise<void>;
    unscheduleWorkflow(workflowId: number): Promise<void>;
    getScheduledWorkflows(): Promise<Array<{
        workflowId: number;
        cronExpression: string;
        nextExecution: Date;
    }>>;
}
