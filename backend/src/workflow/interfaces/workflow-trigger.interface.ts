/**
 * Workflow Trigger Interface
 *
 * This interface must be implemented by any service that wants to integrate
 * with the workflow orchestration engine. It ensures consistent context data
 * is provided to the state machine.
 */

export interface WorkflowTriggerContext {
  // Essential context data that ALL triggers must provide
  executionId: string;
  workflowId: string;
  triggerType: string;
  triggerId: string;
  userId: string;
  timestamp: Date;

  // User/Entity data that the workflow operates on
  entityData: {
    id: string;
    type: 'user' | 'subscription' | 'order' | 'event' | 'custom';
    data: Record<string, any>;
  };

  // Trigger-specific metadata
  triggerMetadata: {
    source: string; // e.g., 'webhook', 'cron', 'api', 'event'
    version: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    retryable: boolean;
    timeout?: number; // in milliseconds
  };

  // Workflow execution metadata
  executionMetadata: {
    correlationId?: string;
    sessionId?: string;
    requestId?: string;
    parentExecutionId?: string;
    tags?: string[];
  };
}

export interface WorkflowTriggerResult {
  success: boolean;
  context: WorkflowTriggerContext;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Base interface that all workflow triggers must implement
 */
export interface WorkflowTrigger {
  /**
   * Unique identifier for this trigger type
   */
  readonly triggerType: string;

  /**
   * Version of this trigger implementation
   */
  readonly version: string;

  /**
   * Human-readable name for this trigger
   */
  readonly name: string;

  /**
   * Description of what this trigger does
   */
  readonly description: string;

  /**
   * Validate the trigger data before processing
   * @param data - Raw trigger data
   * @returns Validation result with context if valid
   */
  validate(data: any): {
    isValid: boolean;
    context?: WorkflowTriggerContext;
    errors?: string[];
  };

  /**
   * Process the trigger and return standardized context
   * @param data - Raw trigger data
   * @returns Standardized workflow trigger result
   */
  process(data: any): Promise<WorkflowTriggerResult>;

  /**
   * Get the workflow ID that should be executed for this trigger
   * @param context - Validated trigger context
   * @returns Workflow ID to execute
   */
  getWorkflowId(context: WorkflowTriggerContext): string;

  /**
   * Check if this trigger should be executed based on context
   * @param context - Trigger context
   * @returns Whether the trigger should execute
   */
  shouldExecute(context: WorkflowTriggerContext): boolean;
}

/**
 * Registry interface for managing workflow triggers
 */
export interface WorkflowTriggerRegistry {
  /**
   * Register a new trigger implementation
   */
  register(trigger: WorkflowTrigger): void;

  /**
   * Get trigger by type
   */
  getTrigger(triggerType: string): WorkflowTrigger | undefined;

  /**
   * Get all registered triggers
   */
  getAllTriggers(): WorkflowTrigger[];

  /**
   * Check if trigger is registered
   */
  isRegistered(triggerType: string): boolean;
}

/**
 * Workflow trigger execution result
 */
export interface WorkflowTriggerExecutionResult {
  executionId: string;
  workflowId: string;
  triggerType: string;
  success: boolean;
  context: WorkflowTriggerContext;
  error?: string;
  executionTime: number;
  timestamp: Date;
}
