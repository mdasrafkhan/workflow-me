export declare class DelayExecution {
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
    result: any;
    error: string;
    createdAt: Date;
    updatedAt: Date;
}
