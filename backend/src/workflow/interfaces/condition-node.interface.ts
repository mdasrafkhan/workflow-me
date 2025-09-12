import { NodeExecutor, WorkflowStep, WorkflowExecutionContext, WorkflowExecution, ExecutionResult, ValidationResult } from '../nodes/interfaces/node-executor.interface';

/**
 * Base interface for business condition nodes
 * Extends NodeExecutor with business-specific condition methods
 */
export interface BusinessConditionNode extends NodeExecutor {
  /**
   * Get the business domain this condition handles
   * @returns string - Business domain identifier (e.g., 'subscription', 'user', 'payment')
   */
  getBusinessDomain(): string;

  /**
   * Get the condition type this node handles
   * @returns string - Condition type identifier (e.g., 'subscription_status', 'user_segment', 'payment_method')
   */
  getConditionType(): string;

  /**
   * Evaluate business-specific condition logic
   * @param step - The workflow step containing condition data
   * @param context - Execution context with business data
   * @param execution - Workflow execution record
   * @returns Promise<ConditionEvaluationResult>
   */
  evaluateBusinessCondition(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    execution: WorkflowExecution
  ): Promise<ConditionEvaluationResult>;

  /**
   * Get available condition operators for this business domain
   * @returns string[] - Array of supported operators
   */
  getSupportedOperators(): string[];

  /**
   * Get condition configuration schema for this business domain
   * @returns object - JSON schema for condition configuration
   */
  getConditionSchema(): object;
}

/**
 * Result of condition evaluation
 */
export interface ConditionEvaluationResult {
  success: boolean;
  result: boolean;
  matchedBranch?: any;
  extractedActions?: any[];
  businessContext?: Record<string, any>;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Business condition configuration
 */
export interface BusinessConditionConfig {
  domain: string;
  conditionType: string;
  operator: string;
  value: any;
  businessRules?: Record<string, any>;
  fallbackActions?: any[];
}
