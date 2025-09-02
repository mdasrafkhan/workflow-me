export interface DelayExecution {
    id: string;
    workflowId: number;
    executionId: string;
    userId: string;
    delayType: 'fixed' | 'random';
    delayHours: number;
    scheduledAt: Date;
    executeAt: Date;
    status: 'pending' | 'executed' | 'cancelled';
    context: any;
    createdAt: Date;
    updatedAt: Date;
}
export declare class DelayScheduler {
    private readonly logger;
    constructor();
    scheduleDelay(workflowId: number, executionId: string, userId: string, delayConfig: {
        type: 'fixed' | 'random';
        hours?: number;
        min_hours?: number;
        max_hours?: number;
    }, context: any): Promise<DelayExecution>;
    getPendingDelays(): Promise<DelayExecution[]>;
    markDelayExecuted(delayId: string): Promise<void>;
    private calculateDelayHours;
    static createEnhancedDelayLogic(delayConfig: {
        type: 'fixed' | 'random';
        hours?: number;
        min_hours?: number;
        max_hours?: number;
    }, executionContext: {
        workflowId: number;
        executionId: string;
        userId: string;
        scheduledAt: Date;
    }): any;
}
