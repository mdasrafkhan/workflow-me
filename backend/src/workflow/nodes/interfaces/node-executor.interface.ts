/**
 * Base interface for all node executors
 * This ensures every node type implements a consistent execution pattern
 */
export interface NodeExecutor {
  /**
   * Execute the node with given context
   * @param step - The workflow step containing node data
   * @param context - Execution context
   * @param execution - Workflow execution record
   * @returns Promise<ExecutionResult>
   */
  execute(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<ExecutionResult>;

  /**
   * Validate the node configuration before execution
   * @param step - The workflow step to validate
   * @returns ValidationResult
   */
  validate(step: WorkflowStep): ValidationResult;

  /**
   * Get the node type this executor handles
   * @returns string - Node type identifier
   */
  getNodeType(): string;

  /**
   * Get required dependencies for this node
   * @returns string[] - Array of required service names
   */
  getDependencies(): string[];
}

/**
 * Execution result for node operations
 */
export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  nextSteps?: string[];
  metadata?: Record<string, any>;
}

/**
 * Validation result for node configuration
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  type: string;
  data: Record<string, any>;
  next?: string[];
  conditions?: Array<{
    condition: string;
    next: string;
  }>;
}

/**
 * Workflow execution context
 */
export interface WorkflowExecutionContext {
  data: any;
  metadata?: {
    source?: string;
    timestamp?: Date;
    userId?: string;
    sessionId?: string;
    workflowId?: string;
  };
}

/**
 * Workflow execution record
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  // Add other properties as needed
}

