import { NodeExecutor, ValidationResult } from './node-executor.interface';

export { NodeExecutor, ValidationResult } from './node-executor.interface';

/**
 * Interface for node registry system
 * Manages registration and retrieval of node executors
 */
export interface NodeRegistry {
  /**
   * Register a node executor
   * @param executor - Node executor instance
   */
  register(executor: NodeExecutor): void;

  /**
   * Get executor for a specific node type
   * @param nodeType - Node type identifier
   * @returns NodeExecutor or undefined
   */
  getExecutor(nodeType: string): NodeExecutor | undefined;

  /**
   * Get all registered node types
   * @returns string[] - Array of node type identifiers
   */
  getRegisteredTypes(): string[];

  /**
   * Check if a node type is registered
   * @param nodeType - Node type identifier
   * @returns boolean
   */
  isRegistered(nodeType: string): boolean;
}

/**
 * Node configuration interface
 */
export interface NodeConfig {
  type: string;
  category: string;
  subcategory: string;
  icon: string;
  color: string;
  label: string;
  description: string;
  properties: NodeProperty[];
  validation?: (step: any) => ValidationResult;
}

/**
 * Node property definition
 */
export interface NodeProperty {
  key: string;
  type: 'text' | 'select' | 'textarea' | 'number' | 'boolean' | 'json';
  label: string;
  placeholder?: string;
  required: boolean;
  default?: any;
  options?: Array<{ value: any; label: string }>;
  validation?: (value: any) => string | null;
}
