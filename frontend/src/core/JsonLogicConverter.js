/**
 * Enhanced JsonLogic Converter
 * Converts visual workflows to JsonLogic using the NodeRegistry system
 * More modular and extensible than the previous implementation
 */

import { NodeRegistry } from './NodeRegistry.js';
import jsonLogic from 'json-logic-js';

export class JsonLogicConverter {
  /**
   * Convert a complete workflow to JsonLogic
   * @param {Array} nodes - React Flow nodes
   * @param {Array} edges - React Flow edges
   * @returns {Object} JsonLogic rule
   */
  static convertWorkflow(nodes, edges) {
    if (!nodes || nodes.length === 0) {
      return { "always": true };
    }

    // Find the starting node (trigger with no incoming edges)
    const startNode = this.findStartNode(nodes, edges);
    if (!startNode) {
      return { "always": true };
    }

    // Build the logic tree starting from the root
    return this.buildLogicTree(startNode, nodes, edges);
  }

  /**
   * Find the starting node of the workflow
   */
  static findStartNode(nodes, edges) {
    // Look for trigger nodes with no incoming edges
    const triggerNodes = nodes.filter(node => {
      const nodeType = NodeRegistry.getNodeType(node.type);
      return nodeType && nodeType.category === 'Triggers';
    });

    return triggerNodes.find(node =>
      !edges.some(edge => edge.target === node.id)
    ) || triggerNodes[0];
  }

  /**
   * Recursively build JsonLogic tree from workflow nodes
   */
  static buildLogicTree(node, allNodes, allEdges, visited = new Set()) {
    // Prevent infinite loops
    if (visited.has(node.id)) {
      return { "always": true };
    }
    visited.add(node.id);

    // Get the base logic for this node
    const nodeLogic = NodeRegistry.convertNodeToJsonLogic(node);

    // Find outgoing edges
    const outgoingEdges = allEdges.filter(edge => edge.source === node.id);

    if (outgoingEdges.length === 0) {
      // End node - return the logic
      return nodeLogic;
    }

    if (outgoingEdges.length === 1) {
      // Single path - chain the logic
      const nextNode = allNodes.find(n => n.id === outgoingEdges[0].target);
      if (nextNode) {
        const nextLogic = this.buildLogicTree(nextNode, allNodes, allEdges, new Set(visited));
        return this.chainLogic(nodeLogic, nextLogic);
      }
    } else {
      // Multiple paths - handle branching
      return this.handleBranching(node, nodeLogic, outgoingEdges, allNodes, allEdges, visited);
    }

    return nodeLogic;
  }

  /**
   * Chain two logic operations
   */
  static chainLogic(currentLogic, nextLogic) {
    // If current logic is a trigger, wrap it with the next logic
    if (currentLogic.trigger) {
      return {
        "if": [
          currentLogic,
          nextLogic,
          { "always": false }
        ]
      };
    }

    // Flatten nested AND operations for cleaner structure
    const flattenAnd = (logic) => {
      if (logic.and && Array.isArray(logic.and)) {
        return logic.and;
      }
      return [logic];
    };

    const currentParts = flattenAnd(currentLogic);
    const nextParts = flattenAnd(nextLogic);

    // Combine all parts into a single AND operation
    return {
      "and": [...currentParts, ...nextParts]
    };
  }

  /**
   * Handle branching logic (multiple outgoing edges)
   */
  static handleBranching(node, nodeLogic, outgoingEdges, allNodes, allEdges, visited) {
    const branches = [];

    outgoingEdges.forEach(edge => {
      const nextNode = allNodes.find(n => n.id === edge.target);
      if (nextNode) {
        const nextLogic = this.buildLogicTree(nextNode, allNodes, allEdges, new Set(visited));
        branches.push(nextLogic);
      }
    });

    if (branches.length === 0) {
      return nodeLogic;
    }

    // Handle different types of branching
    const nodeType = NodeRegistry.getNodeType(node.type);

    if (nodeType && nodeType.category === 'Conditions') {
      // Conditional branching
      return this.createConditionalBranch(nodeLogic, branches);
    } else if (nodeType && nodeType.category === 'Flow Control') {
      // Flow control branching
      return this.createFlowControlBranch(node, nodeLogic, branches);
    } else if (nodeType && nodeType.category === 'Actions') {
      // Action nodes with multiple paths - execute all paths
      return this.createActionBranch(nodeLogic, branches);
    } else {
      // Default: parallel execution
      return this.createParallelBranch(nodeLogic, branches);
    }
  }

  /**
   * Create conditional branch logic
   */
  static createConditionalBranch(condition, branches) {
    if (branches.length === 1) {
      return {
        "if": [
          condition,
          branches[0],
          { "always": false }
        ]
      };
    }

    // Multiple branches - create if-else chain
    let ifElseChain = {
      "if": [
        condition,
        branches[0],
        branches[1] || { "always": false }
      ]
    };

    // Add more branches if needed
    for (let i = 2; i < branches.length; i++) {
      ifElseChain = {
        "if": [
          condition,
          branches[0],
          ifElseChain
        ]
      };
    }

    return ifElseChain;
  }

  /**
   * Create flow control branch logic
   */
  static createFlowControlBranch(node, nodeLogic, branches) {
    if (node.type === 'split-node') {
      const splitType = node.data?.splitType || 'conditional';

      if (splitType === 'random') {
        return {
          "random_split": {
            "branches": branches,
            "weights": branches.map(() => 1 / branches.length) // Equal weights
          }
        };
      } else if (splitType === 'percentage') {
        return {
          "percentage_split": {
            "branches": branches,
            "percentages": branches.map(() => 100 / branches.length) // Equal percentages
          }
        };
      }
    }

    // Default: parallel execution
    return this.createParallelBranch(nodeLogic, branches);
  }

  /**
   * Create action branch logic (for action nodes with multiple paths)
   */
  static createActionBranch(nodeLogic, branches) {
    if (branches.length === 1) {
      return this.chainLogic(nodeLogic, branches[0]);
    }

    // Action nodes with multiple paths - execute all paths
    const allBranches = [nodeLogic, ...branches];
    return {
      "and": allBranches
    };
  }

  /**
   * Create parallel branch logic
   */
  static createParallelBranch(nodeLogic, branches) {
    return {
      "parallel": {
        "trigger": nodeLogic,
        "branches": branches
      }
    };
  }

  /**
   * Generate sample data for testing JsonLogic rules
   */
  static generateSampleData() {
    return {
      // User data
      id: 12345,
      email: "user@example.com",
      name: "John Doe",

      // Subscription data
      subscription_package: "premium",
      subscription_status: "active",
      subscription_start_date: "2024-01-15",

      // User segment data
      user_segment: "new_user",
      user_type: "individual",
      registration_date: "2024-01-15",

      // Activity data
      last_login: "2024-01-20",
      email_opens: 5,
      email_clicks: 2,

      // Newsletter data
      newsletter_subscribed: true,
      newsletter_preferences: ["weekly", "product_updates"],

      // Product data
      products_purchased: ["premium_package"],
      total_spent: 99.99,

      // Campaign data
      campaign_source: "organic",
      utm_source: "google",
      utm_medium: "cpc",

      // Timestamp for testing
      current_time: new Date().toISOString(),

      // Test flags
      is_test_user: false,
      debug_mode: true
    };
  }

  /**
   * Test JsonLogic rule with sample data
   */
  static testRule(rule, sampleData = null) {
    const data = sampleData || this.generateSampleData();

    try {
      const result = jsonLogic.apply(rule, data);
      return {
        success: true,
        result: result,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: data
      };
    }
  }

  /**
   * Validate JsonLogic rule structure
   */
  static validateRule(rule) {
    const errors = [];

    if (!rule || typeof rule !== 'object') {
      errors.push('Rule must be an object');
      return errors;
    }

    // Check for required fields in trigger rules
    if (rule.trigger) {
      if (!rule.event) {
        errors.push('Trigger rules must have an event field');
      }
    }

    // Check for valid operators
    const validOperators = [
      '==', '!=', '>', '<', '>=', '<=',
      'and', 'or', 'not',
      'if', 'in', 'cat',
      'always', 'never'
    ];

    const checkOperators = (obj) => {
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => {
          if (validOperators.includes(key) || key.startsWith('var') || key === 'trigger' || key === 'action') {
            // Valid operator or special key
          } else if (typeof obj[key] === 'object') {
            checkOperators(obj[key]);
          } else {
            // Check if it's a valid JsonLogic operator
            if (!validOperators.includes(key) && !key.startsWith('var') && key !== 'trigger' && key !== 'action') {
              errors.push(`Unknown operator: ${key}`);
            }
          }
        });
      }
    };

    checkOperators(rule);

    return errors;
  }

  /**
   * Get execution plan for JsonLogic rule
   */
  static getExecutionPlan(rule) {
    const plan = {
      steps: [],
      estimatedDuration: 0,
      actions: [],
      conditions: [],
      delays: []
    };

    const analyzeRule = (rule, depth = 0) => {
      if (typeof rule === 'object' && rule !== null) {
        Object.keys(rule).forEach(key => {
          if (key === 'trigger') {
            plan.steps.push({
              type: 'trigger',
              event: rule.event,
              depth: depth
            });
          } else if (key === 'action') {
            plan.actions.push(rule.action);
            plan.steps.push({
              type: 'action',
              action: rule.action,
              depth: depth
            });
          } else if (key === 'delay') {
            plan.delays.push(rule.delay);
            plan.steps.push({
              type: 'delay',
              delay: rule.delay,
              depth: depth
            });
          } else if (key === 'if') {
            plan.conditions.push('conditional');
            plan.steps.push({
              type: 'condition',
              condition: 'if-then-else',
              depth: depth
            });
            rule.if.forEach((branch, index) => {
              analyzeRule(branch, depth + 1);
            });
          } else if (key === 'and' || key === 'or') {
            plan.conditions.push(key);
            plan.steps.push({
              type: 'condition',
              condition: key,
              depth: depth
            });
            rule[key].forEach(branch => {
              analyzeRule(branch, depth + 1);
            });
          } else if (typeof rule[key] === 'object') {
            analyzeRule(rule[key], depth + 1);
          }
        });
      }
    };

    analyzeRule(rule);

    // Calculate estimated duration
    plan.estimatedDuration = plan.delays.reduce((total, delay) => {
      if (delay.type === 'fixed') {
        return total + (delay.hours || 0);
      } else if (delay.type === 'random') {
        return total + ((delay.min_hours + delay.max_hours) / 2);
      }
      return total;
    }, 0);

    return plan;
  }
}
