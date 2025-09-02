import jsonLogic from 'json-logic-js';

/**
 * Converts a React Flow workflow to JsonLogic format
 * This creates a portable, database-storable logic representation
 */
export class WorkflowToJsonLogicConverter {

  /**
   * Convert a complete workflow to JsonLogic
   * @param {Array} nodes - React Flow nodes
   * @param {Array} edges - React Flow edges
   * @returns {Object} JsonLogic rule
   */
  static convertWorkflow(nodes, edges) {
    if (!nodes || nodes.length === 0) {
      return { "always": true }; // Default: always execute
    }

    // Find the starting node (subscriber with no incoming edges)
    const startNode = nodes.find(node =>
      node.type === 'subscriber' &&
      !edges.some(edge => edge.target === node.id)
    );

    if (!startNode) {
      return { "always": true };
    }

    // Build the logic tree starting from the root
    return this.buildLogicTree(startNode, nodes, edges);
  }

  /**
   * Recursively build JsonLogic tree from workflow nodes
   */
  static buildLogicTree(node, allNodes, allEdges) {
    const nodeLogic = this.convertNodeToLogic(node);
    const children = this.getChildNodes(node.id, allNodes, allEdges);

    if (children.length === 0) {
      return nodeLogic;
    }

    if (children.length === 1) {
      // Single child - chain the logic
      return {
        "and": [nodeLogic, this.buildLogicTree(children[0], allNodes, allEdges)]
      };
    } else {
      // Multiple children - create OR condition
      const childLogics = children.map(child =>
        this.buildLogicTree(child, allNodes, allEdges)
      );
      return {
        "and": [nodeLogic, { "or": childLogics }]
      };
    }
  }

  /**
   * Convert individual node to JsonLogic
   */
  static convertNodeToLogic(node) {
    switch (node.type) {
      case 'subscriber':
        return this.convertSubscriberNode(node);
      case 'operator':
        return this.convertOperatorNode(node);
      case 'action':
        return this.convertActionNode(node);
      default:
        return { "always": true };
    }
  }

  /**
   * Convert subscriber node to JsonLogic
   * Subscriber nodes define the data context
   */
  static convertSubscriberNode(node) {
    const property = node.data?.selected;
    if (!property) {
      return { "always": true };
    }

    // Subscriber nodes set the context for subsequent operations
    return {
      "var": property // This will be used to access the property in data
    };
  }

  /**
   * Convert operator node to JsonLogic
   * Operator nodes perform conditional logic
   */
  static convertOperatorNode(node) {
    const operator = node.data?.selected;
    const property = node.data?.contextProperty || 'value'; // Default property

    switch (operator) {
      case 'empty':
        return {
          "or": [
            { "==": [{ "var": property }, null] },
            { "==": [{ "var": property }, ""] },
            { "==": [{ "var": property }, "unpaid"] }
          ]
        };

      case '>':
        return {
          ">": [
            { "var": property },
            { "var": "threshold" } // This would be configurable
          ]
        };

      case '<':
        return {
          "<": [
            { "var": property },
            { "var": "threshold" }
          ]
        };

      case '>=':
        return {
          ">=": [
            { "var": property },
            { "var": "threshold" }
          ]
        };

      case '<=':
        return {
          "<=": [
            { "var": property },
            { "var": "threshold" }
          ]
        };

      case '==':
        return {
          "==": [
            { "var": property },
            { "var": "expectedValue" }
          ]
        };

      case '!=':
        return {
          "!=": [
            { "var": property },
            { "var": "expectedValue" }
          ]
        };

      default:
        return { "always": true };
    }
  }

  /**
   * Convert action node to JsonLogic
   * Action nodes define what to do when conditions are met
   */
  static convertActionNode(node) {
    const action = node.data?.selected;

    // Actions are represented as metadata in JsonLogic
    return {
      "action": action,
      "execute": true
    };
  }

  /**
   * Get child nodes connected to a given node
   */
  static getChildNodes(nodeId, allNodes, allEdges) {
    const childEdges = allEdges.filter(edge => edge.source === nodeId);
    return childEdges.map(edge =>
      allNodes.find(node => node.id === edge.target)
    ).filter(Boolean);
  }

  /**
   * Generate sample data for testing JsonLogic
   */
  static generateSampleData() {
    return {
      payment: "unpaid",
      created_at: new Date('2024-01-01'),
      email: "user@example.com",
      threshold: 60,
      expectedValue: "paid"
    };
  }

  /**
   * Test JsonLogic with sample data
   */
  static testJsonLogic(jsonLogicRule, sampleData = null) {
    const data = sampleData || this.generateSampleData();
    try {
      return jsonLogic.apply(jsonLogicRule, data);
    } catch (error) {
      console.error('JsonLogic execution error:', error);
      return false;
    }
  }

  /**
   * Pretty print JsonLogic for debugging
   */
  static prettyPrint(jsonLogicRule) {
    return JSON.stringify(jsonLogicRule, null, 2);
  }
}

export default WorkflowToJsonLogicConverter;
