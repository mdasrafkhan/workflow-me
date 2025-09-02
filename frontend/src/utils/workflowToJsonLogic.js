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

    // Find the starting node (trigger with no incoming edges)
    const startNode = nodes.find(node =>
      (node.type === 'subscription-trigger' || node.type === 'newsletter-trigger') &&
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
      // Trigger Nodes
      case 'subscription-trigger':
        return this.convertSubscriptionTriggerNode(node);
      case 'newsletter-trigger':
        return this.convertNewsletterTriggerNode(node);

      // Condition Nodes
      case 'product-condition':
        return this.convertProductConditionNode(node);
      case 'user-segment-condition':
        return this.convertUserSegmentConditionNode(node);

      // Timing Nodes
      case 'delay-node':
        return this.convertDelayNode(node);
      case 'random-delay-node':
        return this.convertRandomDelayNode(node);

      // Email Action Nodes
      case 'welcome-email':
        return this.convertWelcomeEmailNode(node);
      case 'newsletter-email':
        return this.convertNewsletterEmailNode(node);
      case 'follow-up-email':
        return this.convertFollowUpEmailNode(node);
      case 'cta-config':
        return this.convertCtaConfigNode(node);
      case 'url-config':
        return this.convertUrlConfigNode(node);

      // Flow Control Nodes
      case 'split-node':
        return this.convertSplitNode(node);
      case 'merge-node':
        return this.convertMergeNode(node);
      case 're-entry-rule':
        return this.convertReEntryRuleNode(node);
      case 'end-node':
        return this.convertEndNode(node);

      default:
        return { "always": true };
    }
  }

  // Trigger Node Converters
  static convertSubscriptionTriggerNode(node) {
    const triggerEvent = node.data?.selected || 'user_buys_subscription';
    return {
      "trigger": "subscription",
      "event": triggerEvent,
      "execute": true
    };
  }

  static convertNewsletterTriggerNode(node) {
    const triggerEvent = node.data?.selected || 'user_signs_up_newsletter';
    return {
      "trigger": "newsletter",
      "event": triggerEvent,
      "execute": true
    };
  }

  // Condition Node Converters
  static convertProductConditionNode(node) {
    const packageType = node.data?.selected;
    if (!packageType) return { "always": true };

    return {
      "==": [
        { "var": "subscription_package" },
        packageType
      ]
    };
  }

  static convertUserSegmentConditionNode(node) {
    const segment = node.data?.selected;
    if (!segment) return { "always": true };

    return {
      "==": [
        { "var": "user_segment" },
        segment
      ]
    };
  }

  // Timing Node Converters
  static convertDelayNode(node) {
    const delayType = node.data?.selected || '1_day';
    const delayMap = {
      '1_hour': 1,
      '1_day': 24,
      '2_days': 48,
      '3_days': 72,
      '1_week': 168,
      '2_weeks': 336
    };

    return {
      "delay": {
        "hours": delayMap[delayType] || 24,
        "type": "fixed"
      }
    };
  }

  static convertRandomDelayNode(node) {
    const delayRange = node.data?.selected || '1_3_days';
    const rangeMap = {
      '1_3_days': { min: 24, max: 72 },
      '3_5_days': { min: 72, max: 120 },
      '1_2_weeks': { min: 168, max: 336 },
      '2_4_weeks': { min: 336, max: 672 }
    };

    const range = rangeMap[delayRange] || { min: 24, max: 72 };
    return {
      "delay": {
        "min_hours": range.min,
        "max_hours": range.max,
        "type": "random"
      }
    };
  }

  // Email Action Node Converters
  static convertWelcomeEmailNode(node) {
    const emailTemplate = node.data?.selected || 'subscription_welcome';
    return {
      "action": "send_email",
      "template": emailTemplate,
      "type": "welcome"
    };
  }

  static convertNewsletterEmailNode(node) {
    const emailTemplate = node.data?.selected || 'weekly_newsletter';
    return {
      "action": "send_email",
      "template": emailTemplate,
      "type": "newsletter"
    };
  }

  static convertFollowUpEmailNode(node) {
    const emailTemplate = node.data?.selected || 'value_drop';
    return {
      "action": "send_email",
      "template": emailTemplate,
      "type": "follow_up"
    };
  }

  static convertCtaConfigNode(node) {
    const ctaType = node.data?.selected || 'check_out_latest_newsletter';
    return {
      "cta": {
        "type": ctaType,
        "enabled": true
      }
    };
  }

  static convertUrlConfigNode(node) {
    const urlType = node.data?.selected || 'product_package_24';
    const urlMap = {
      'product_package_24': 'https://minside.united.no/admin/plans-and-products/product-packages/24',
      'product_package_128': 'https://minside.united.no/admin/plans-and-products/product-packages/128',
      'newsletter_integration_5': 'https://minside.midtsiden.no/admin/account-settings/settings/communications/newsletter-integration/5',
      'admin_dashboard': 'https://minside.united.no/admin/dashboard',
      'custom': 'https://custom.url.com'
    };
    return {
      "url": {
        "type": urlType,
        "value": urlMap[urlType] || urlType
      }
    };
  }

  // Flow Control Node Converters
  static convertSplitNode(node) {
    const splitLogic = node.data?.selected || 'product_based';
    return {
      "split": {
        "logic": splitLogic,
        "branches": []
      }
    };
  }

  static convertMergeNode(node) {
    const mergeLogic = node.data?.selected || 'all_paths';
    return {
      "merge": {
        "logic": mergeLogic
      }
    };
  }

  static convertReEntryRuleNode(node) {
    const reEntryRule = node.data?.selected || 'once_only';
    return {
      "re_entry_rule": {
        "type": reEntryRule,
        "enforce": true
      }
    };
  }

  static convertEndNode(node) {
    const endCondition = node.data?.selected || 'workflow_complete';
    return {
      "end": {
        "condition": endCondition
      }
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
      // User data
      email: "subscriber@newspaper.com",
      name: "John Doe",
      user_segment: "new_user",

      // Subscription data
      subscription_package: "premium",
      subscription_date: new Date('2024-01-01'),
      subscription_expiry: new Date('2024-12-31'),
      subscription_status: "active",

      // Newsletter data
      newsletter_subscribed: true,
      newsletter_signup_date: new Date('2024-01-01'),

      // Workflow context
      trigger_event: "user_buys_subscription",
      workflow_type: "welcome_series"
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
