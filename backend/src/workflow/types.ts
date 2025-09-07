// Workflow Execution Context
export interface WorkflowExecutionContext {
  executionId: string;
  workflowId: string;
  triggerType: string;
  triggerId: string;
  userId: string;
  triggerData: any;
  data: any; // User/subscriber data
  metadata: Record<string, any>;
  createdAt: Date;
}

// Workflow Step Definition
export interface WorkflowStep {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay' | 'shared-flow' | 'end';
  data: Record<string, any>;
  next?: string[];
  conditions?: Array<{
    condition: string;
    next: string;
  }>;
}

// Workflow Definition
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  metadata: Record<string, any>;
}

// Action Execution Parameters
export interface ActionExecutionParams {
  actionType: string;
  actionName: string;
  actionData: any;
  context: WorkflowExecutionContext;
  stepId: string;
  executionId: string;
}

// Action Execution Result
export interface ActionExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  nextStep?: string;
  delay?: number;
  metadata?: Record<string, any>;
}

// Trigger Data Interface
export interface TriggerData {
  id: string;
  userId: string;
  triggerType: string;
  data: any;
  createdAt: Date;
}

// Email Action Data
export interface EmailActionData {
  subject: string;
  templateId: string;
  data: Record<string, any>;
  to?: string;
  cc?: string[];
  bcc?: string[];
}

// SMS Action Data
export interface SmsActionData {
  message: string;
  templateId: string;
  data: Record<string, any>;
  to?: string;
}

// Webhook Action Data
export interface WebhookActionData {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  data: Record<string, any>;
}

// Delay Configuration
export interface DelayConfig {
  executionId: string;
  stepId: string;
  delayType: 'fixed' | 'random';
  delayMs: number;
  context: WorkflowExecutionContext;
  resumeAfter: Date;
}

// Workflow Execution Status
export type WorkflowExecutionStatus =
  | 'pending'
  | 'running'
  | 'delayed'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Workflow Delay Status
export type WorkflowDelayStatus =
  | 'pending'
  | 'executed'
  | 'cancelled'
  | 'failed';

// Email Status
export type EmailStatus =
  | 'sent'
  | 'failed'
  | 'bounced'
  | 'delivered'
  | 'opened'
  | 'clicked';
