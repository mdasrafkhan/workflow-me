/**
 * Workflow Validation System
 * Validates workflow structure, node configurations, and business logic
 */

import { NodeRegistry } from './NodeRegistry.js';

export class WorkflowValidator {
  /**
   * Validate a complete workflow
   * @param {Array} nodes - Workflow nodes
   * @param {Array} edges - Workflow edges
   * @returns {Object} Validation result with errors and warnings
   */
  static validateWorkflow(nodes, edges) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Basic structure validation
    this.validateBasicStructure(nodes, edges, result);

    // Node-specific validation
    this.validateNodes(nodes, result);

    // Edge validation
    this.validateEdges(edges, nodes, result);

    // Workflow logic validation
    this.validateWorkflowLogic(nodes, edges, result);

    // Performance validation
    this.validatePerformance(nodes, edges, result);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate basic workflow structure
   */
  static validateBasicStructure(nodes, edges, result) {
    if (!nodes || nodes.length === 0) {
      result.errors.push('Workflow must have at least one node');
      return;
    }

    // Check for trigger nodes
    const triggerNodes = nodes.filter(node =>
      node.type === 'subscription-trigger' || node.type === 'newsletter-trigger'
    );

    if (triggerNodes.length === 0) {
      result.errors.push('Workflow must have at least one trigger node');
    } else if (triggerNodes.length > 1) {
      result.warnings.push('Multiple trigger nodes found. Consider using split nodes for complex flows.');
    }

    // Check for end nodes
    const endNodes = nodes.filter(node => node.type === 'end-node');
    if (endNodes.length === 0) {
      result.warnings.push('Consider adding an end node to clearly define workflow completion');
    }

    // Check for orphaned nodes
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const orphanedNodes = nodes.filter(node =>
      !connectedNodeIds.has(node.id) &&
      node.type !== 'subscription-trigger' &&
      node.type !== 'newsletter-trigger'
    );

    if (orphanedNodes.length > 0) {
      result.warnings.push(`${orphanedNodes.length} nodes are not connected to the workflow`);
    }
  }

  /**
   * Validate individual nodes
   */
  static validateNodes(nodes, result) {
    nodes.forEach(node => {
      const nodeType = NodeRegistry.getNodeType(node.type);

      if (!nodeType) {
        result.errors.push(`Unknown node type: ${node.type} (node: ${node.id})`);
        return;
      }

      // Validate node data
      const nodeErrors = NodeRegistry.validateNode(node.type, node.data || {});
      nodeErrors.forEach(error => {
        result.errors.push(`Node ${node.id}: ${error}`);
      });

      // Check for required properties
      if (nodeType.properties) {
        nodeType.properties.forEach(prop => {
          if (prop.required && !node.data?.[prop.key]) {
            result.errors.push(`Node ${node.id}: Required property '${prop.label}' is missing`);
          }
        });
      }
    });
  }

  /**
   * Validate edges
   */
  static validateEdges(edges, nodes, result) {
    const nodeIds = new Set(nodes.map(node => node.id));

    edges.forEach(edge => {
      // Check if source and target nodes exist
      if (!nodeIds.has(edge.source)) {
        result.errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        result.errors.push(`Edge references non-existent target node: ${edge.target}`);
      }

      // Check for duplicate edges
      const duplicateEdges = edges.filter(e =>
        e.id !== edge.id &&
        e.source === edge.source &&
        e.target === edge.target
      );

      if (duplicateEdges.length > 0) {
        result.warnings.push(`Duplicate edge found: ${edge.source} -> ${edge.target}`);
      }
    });
  }

  /**
   * Validate workflow logic
   */
  static validateWorkflowLogic(nodes, edges, result) {
    // Check for circular dependencies
    const circularDeps = this.findCircularDependencies(nodes, edges);
    if (circularDeps.length > 0) {
      result.errors.push(`Circular dependencies detected: ${circularDeps.join(', ')}`);
    }

    // Check for unreachable nodes
    const unreachableNodes = this.findUnreachableNodes(nodes, edges);
    if (unreachableNodes.length > 0) {
      result.warnings.push(`Unreachable nodes detected: ${unreachableNodes.join(', ')}`);
    }

    // Validate delay sequences
    this.validateDelaySequences(nodes, edges, result);

    // Validate email sequences
    this.validateEmailSequences(nodes, edges, result);
  }

  /**
   * Find circular dependencies in the workflow
   */
  static findCircularDependencies(nodes, edges) {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const dfs = (nodeId, path) => {
      if (recursionStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        cycles.push(path.slice(cycleStart).join(' -> '));
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      outgoingEdges.forEach(edge => {
        dfs(edge.target, [...path, nodeId]);
      });

      recursionStack.delete(nodeId);
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    });

    return cycles;
  }

  /**
   * Find unreachable nodes
   */
  static findUnreachableNodes(nodes, edges) {
    const triggerNodes = nodes.filter(node =>
      node.type === 'subscription-trigger' || node.type === 'newsletter-trigger'
    );

    if (triggerNodes.length === 0) return nodes.map(node => node.id);

    const reachable = new Set();

    const dfs = (nodeId) => {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);

      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      outgoingEdges.forEach(edge => {
        dfs(edge.target);
      });
    };

    triggerNodes.forEach(trigger => {
      dfs(trigger.id);
    });

    return nodes
      .filter(node => !reachable.has(node.id))
      .map(node => node.id);
  }

  /**
   * Validate delay sequences
   */
  static validateDelaySequences(nodes, edges, result) {
    const delayNodes = nodes.filter(node =>
      node.type === 'delay-node' || node.type === 'random-delay-node'
    );

    delayNodes.forEach(delayNode => {
      // Check if delay node has proper configuration
      if (delayNode.type === 'random-delay-node') {
        const minDelay = delayNode.data?.minDelay;
        const maxDelay = delayNode.data?.maxDelay;

        if (minDelay && maxDelay) {
          const minHours = this.parseDelayToHours(minDelay);
          const maxHours = this.parseDelayToHours(maxDelay);

          if (minHours >= maxHours) {
            result.errors.push(`Node ${delayNode.id}: Minimum delay must be less than maximum delay`);
          }
        }
      }

      // Check for excessive delays
      const delayValue = delayNode.data?.delayType || delayNode.data?.maxDelay;
      if (delayValue) {
        const hours = this.parseDelayToHours(delayValue);
        if (hours > 168) { // More than 1 week
          result.warnings.push(`Node ${delayNode.id}: Very long delay (${hours} hours). Consider if this is intentional.`);
        }
      }
    });
  }

  /**
   * Validate email sequences
   */
  static validateEmailSequences(nodes, edges, result) {
    const emailNodes = nodes.filter(node =>
      node.type === 'welcome-email' ||
      node.type === 'newsletter-email' ||
      node.type === 'follow-up-email'
    );

    // Check for email frequency
    if (emailNodes.length > 5) {
      result.warnings.push('High number of email nodes detected. Consider email frequency limits.');
    }

    // Check for proper email configuration
    emailNodes.forEach(emailNode => {
      if (!emailNode.data?.emailTemplate && !emailNode.data?.newsletterType && !emailNode.data?.followUpType) {
        result.warnings.push(`Node ${emailNode.id}: Email template not specified`);
      }
    });
  }

  /**
   * Validate performance considerations
   */
  static validatePerformance(nodes, edges, result) {
    // Check for too many nodes
    if (nodes.length > 50) {
      result.warnings.push('Large workflow detected. Consider breaking into smaller workflows for better performance.');
    }

    // Check for too many edges
    if (edges.length > 100) {
      result.warnings.push('Complex workflow detected. Consider simplifying the flow structure.');
    }

    // Check for deep nesting
    const maxDepth = this.calculateMaxDepth(nodes, edges);
    if (maxDepth > 10) {
      result.warnings.push(`Deep workflow detected (depth: ${maxDepth}). Consider flattening the structure.`);
    }
  }

  /**
   * Calculate maximum depth of the workflow
   */
  static calculateMaxDepth(nodes, edges) {
    const triggerNodes = nodes.filter(node =>
      node.type === 'subscription-trigger' || node.type === 'newsletter-trigger'
    );

    if (triggerNodes.length === 0) return 0;

    let maxDepth = 0;

    const dfs = (nodeId, depth) => {
      maxDepth = Math.max(maxDepth, depth);

      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      outgoingEdges.forEach(edge => {
        dfs(edge.target, depth + 1);
      });
    };

    triggerNodes.forEach(trigger => {
      dfs(trigger.id, 0);
    });

    return maxDepth;
  }

  /**
   * Parse delay string to hours
   */
  static parseDelayToHours(delayString) {
    const delayMap = {
      '1_hour': 1,
      '1_day': 24,
      '2_days': 48,
      '3_days': 72,
      '5_days': 120,
      '1_week': 168
    };

    return delayMap[delayString] || 24;
  }

  /**
   * Get validation summary
   */
  static getValidationSummary(validationResult) {
    const { errors, warnings, suggestions } = validationResult;

    let summary = '';

    if (errors.length > 0) {
      summary += `❌ ${errors.length} error(s) found:\n`;
      errors.forEach(error => summary += `  • ${error}\n`);
    }

    if (warnings.length > 0) {
      summary += `⚠️ ${warnings.length} warning(s):\n`;
      warnings.forEach(warning => summary += `  • ${warning}\n`);
    }

    if (suggestions.length > 0) {
      summary += `💡 ${suggestions.length} suggestion(s):\n`;
      suggestions.forEach(suggestion => summary += `  • ${suggestion}\n`);
    }

    if (errors.length === 0 && warnings.length === 0 && suggestions.length === 0) {
      summary = '✅ Workflow validation passed!';
    }

    return summary;
  }
}
