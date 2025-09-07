import { Injectable, Logger } from '@nestjs/common';
import { NodeExecutor, NodeRegistry } from '../interfaces/node-registry.interface';

/**
 * Node Registry Service
 * Manages registration and retrieval of node executors
 * Implements the Registry pattern for clean node management
 */
@Injectable()
export class NodeRegistryService implements NodeRegistry {
  private readonly logger = new Logger(NodeRegistryService.name);
  private readonly executors = new Map<string, NodeExecutor>();

  /**
   * Register a node executor
   * @param executor - Node executor instance
   */
  register(executor: NodeExecutor): void {
    const nodeType = executor.getNodeType();

    if (this.executors.has(nodeType)) {
      this.logger.warn(`Overriding existing executor for node type: ${nodeType}`);
    }

    this.executors.set(nodeType, executor);
    this.logger.log(`Registered executor for node type: ${nodeType}`);
  }

  /**
   * Get executor for a specific node type
   * @param nodeType - Node type identifier
   * @returns NodeExecutor or undefined
   */
  getExecutor(nodeType: string): NodeExecutor | undefined {
    const executor = this.executors.get(nodeType);

    if (!executor) {
      this.logger.warn(`No executor found for node type: ${nodeType}`);
    }

    return executor;
  }

  /**
   * Get all registered node types
   * @returns string[] - Array of node type identifiers
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.executors.keys());
  }

  /**
   * Check if a node type is registered
   * @param nodeType - Node type identifier
   * @returns boolean
   */
  isRegistered(nodeType: string): boolean {
    return this.executors.has(nodeType);
  }

  /**
   * Get all registered executors
   * @returns Map<string, NodeExecutor>
   */
  getAllExecutors(): Map<string, NodeExecutor> {
    return new Map(this.executors);
  }

  /**
   * Unregister a node executor
   * @param nodeType - Node type identifier
   * @returns boolean - True if executor was removed
   */
  unregister(nodeType: string): boolean {
    const removed = this.executors.delete(nodeType);

    if (removed) {
      this.logger.log(`Unregistered executor for node type: ${nodeType}`);
    } else {
      this.logger.warn(`No executor found to unregister for node type: ${nodeType}`);
    }

    return removed;
  }

  /**
   * Clear all registered executors
   */
  clear(): void {
    this.executors.clear();
    this.logger.log('Cleared all registered executors');
  }

  /**
   * Get registry statistics
   * @returns object with registry statistics
   */
  getStats(): { totalExecutors: number; nodeTypes: string[] } {
    return {
      totalExecutors: this.executors.size,
      nodeTypes: this.getRegisteredTypes()
    };
  }
}

