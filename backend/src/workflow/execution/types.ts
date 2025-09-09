/**
 * Types for the enhanced workflow execution system
 */

export interface WorkflowExecutionContext {
  data: any; // User/subscriber data
  metadata?: {
    source?: string;
    timestamp?: Date;
    userId?: string;
    sessionId?: string;
    workflowId?: string;
  };
}

export interface ExecutionStep {
  id: string;
  type: 'trigger' | 'action' | 'delay' | 'conditional' | 'logical' | 'parallel' | 'jsonlogic' | 'always' | 'end' | 'split' | 'url';
  rule: any;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  steps: ExecutionStep[];
  timestamp: Date;
  metadata?: {
    executionId?: string;
    completedSteps?: number;
    totalSteps?: number;
    userId?: string;
    workflowId?: string;
    source?: string;
    timestamp?: Date;
  };
}

export interface WorkflowExecutionHistory {
  executionId: string;
  workflowId: string;
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
  scheduleWorkflow(workflowId: string, cronExpression: string): Promise<void>;
  unscheduleWorkflow(workflowId: string): Promise<void>;
  getScheduledWorkflows(): Promise<Array<{
    workflowId: string;
    cronExpression: string;
    nextExecution: Date;
  }>>;
}
