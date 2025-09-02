/**
 * Node Registry System
 * Centralized registry for all node types with their configurations
 * Makes it easy to add new node types without modifying core files
 */

export class NodeRegistry {
  static nodeTypes = new Map();

  /**
   * Register a new node type
   * @param {string} type - Node type identifier
   * @param {Object} config - Node configuration
   */
  static registerNodeType(type, config) {
    this.nodeTypes.set(type, {
      ...config,
      type,
      // Default values
      category: config.category || 'Other',
      icon: config.icon || '📦',
      color: config.color || '#666666',
      label: config.label || type,
      description: config.description || '',
      properties: config.properties || [],
      jsonLogicConverter: config.jsonLogicConverter || (() => ({ "always": true })),
      validation: config.validation || (() => []),
      // UI configuration
      showHandles: config.showHandles !== false,
      draggable: config.draggable !== false,
      selectable: config.selectable !== false,
      deletable: config.deletable !== false,
    });
  }

  /**
   * Get node type configuration
   * @param {string} type - Node type identifier
   * @returns {Object} Node configuration
   */
  static getNodeType(type) {
    return this.nodeTypes.get(type);
  }

  /**
   * Get all registered node types
   * @returns {Map} All node types
   */
  static getAllNodeTypes() {
    return this.nodeTypes;
  }

  /**
   * Get node types by category
   * @param {string} category - Category name
   * @returns {Array} Node types in category
   */
  static getNodeTypesByCategory(category) {
    return Array.from(this.nodeTypes.values())
      .filter(nodeType => nodeType.category === category);
  }

  /**
   * Get all categories
   * @returns {Array} All categories
   */
  static getCategories() {
    const categories = new Set();
    this.nodeTypes.forEach(nodeType => {
      categories.add(nodeType.category);
    });
    return Array.from(categories);
  }

  /**
   * Validate node data
   * @param {string} type - Node type
   * @param {Object} data - Node data
   * @returns {Array} Validation errors
   */
  static validateNode(type, data) {
    const nodeType = this.getNodeType(type);
    if (!nodeType) {
      return [`Unknown node type: ${type}`];
    }

    if (nodeType.validation) {
      return nodeType.validation(data);
    }

    return [];
  }

  /**
   * Convert node to JsonLogic
   * @param {Object} node - Node object
   * @returns {Object} JsonLogic rule
   */
  static convertNodeToJsonLogic(node) {
    const nodeType = this.getNodeType(node.type);
    if (!nodeType || !nodeType.jsonLogicConverter) {
      return { "always": true };
    }

    try {
      return nodeType.jsonLogicConverter(node);
    } catch (error) {
      console.error(`Error converting node ${node.id} to JsonLogic:`, error);
      return { "always": true };
    }
  }
}

// Initialize with default node types
export function initializeDefaultNodeTypes() {
  // Trigger Nodes
  NodeRegistry.registerNodeType('subscription-trigger', {
    category: 'Triggers',
    icon: '🚀',
    color: '#1976d2',
    label: 'Subscription',
    description: 'Triggers when a user buys a subscription',
    properties: [
      {
        key: 'triggerEvent',
        label: 'Trigger Event',
        type: 'select',
        options: [
          { value: 'user_buys_subscription', label: 'User buys subscription' },
          { value: 'subscription_renewed', label: 'Subscription renewed' },
          { value: 'subscription_cancelled', label: 'Subscription cancelled' }
        ],
        default: 'user_buys_subscription'
      }
    ],
    jsonLogicConverter: (node) => ({
      "trigger": "subscription",
      "event": node.data?.triggerEvent || 'user_buys_subscription',
      "execute": true
    }),
    validation: (data) => {
      const errors = [];
      if (!data.triggerEvent) {
        errors.push('Trigger event is required');
      }
      return errors;
    }
  });

  NodeRegistry.registerNodeType('newsletter-trigger', {
    category: 'Triggers',
    icon: '📬',
    color: '#1976d2',
    label: 'Newsletter',
    description: 'Triggers when a user signs up for newsletter',
    properties: [
      {
        key: 'triggerEvent',
        label: 'Trigger Event',
        type: 'select',
        options: [
          { value: 'user_signs_up_newsletter', label: 'User signs up newsletter' },
          { value: 'newsletter_opened', label: 'Newsletter opened' },
          { value: 'newsletter_clicked', label: 'Newsletter clicked' }
        ],
        default: 'user_signs_up_newsletter'
      }
    ],
    jsonLogicConverter: (node) => ({
      "trigger": "newsletter",
      "event": node.data?.triggerEvent || 'user_signs_up_newsletter',
      "execute": true
    })
  });

  // Condition Nodes
  NodeRegistry.registerNodeType('product-condition', {
    category: 'Conditions',
    icon: '⚖️',
    color: '#d97706',
    label: 'Product',
    description: 'Check which product the user subscribed to',
    properties: [
      {
        key: 'packageType',
        label: 'Product Package',
        type: 'select',
        options: [
          { value: 'premium', label: 'Premium Package' },
          { value: 'basic', label: 'Basic Package' },
          { value: 'enterprise', label: 'Enterprise Package' }
        ],
        default: 'premium'
      }
    ],
    jsonLogicConverter: (node) => {
      const packageType = node.data?.packageType;
      if (!packageType) return { "always": true };

      return {
        "==": [
          { "var": "subscription_package" },
          packageType
        ]
      };
    }
  });

  NodeRegistry.registerNodeType('user-segment-condition', {
    category: 'Conditions',
    icon: '🎯',
    color: '#d97706',
    label: 'Segment',
    description: 'Check user segment or characteristics',
    properties: [
      {
        key: 'segment',
        label: 'User Segment',
        type: 'select',
        options: [
          { value: 'new_user', label: 'New User' },
          { value: 'returning_user', label: 'Returning User' },
          { value: 'premium_user', label: 'Premium User' }
        ],
        default: 'new_user'
      }
    ],
    jsonLogicConverter: (node) => {
      const segment = node.data?.segment;
      if (!segment) return { "always": true };

      return {
        "==": [
          { "var": "user_segment" },
          segment
        ]
      };
    }
  });

  // Timing Nodes
  NodeRegistry.registerNodeType('delay-node', {
    category: 'Timing',
    icon: '⏰',
    color: '#9c27b0',
    label: 'Delay',
    description: 'Wait for a specific amount of time',
    properties: [
      {
        key: 'delayType',
        label: 'Delay Duration',
        type: 'select',
        options: [
          { value: '1_hour', label: '1 Hour' },
          { value: '1_day', label: '1 Day' },
          { value: '2_days', label: '2 Days' },
          { value: '3_days', label: '3 Days' },
          { value: '1_week', label: '1 Week' }
        ],
        default: '1_day'
      }
    ],
    jsonLogicConverter: (node) => {
      const delayType = node.data?.delayType || '1_day';
      const delayMap = {
        '1_hour': 1,
        '1_day': 24,
        '2_days': 48,
        '3_days': 72,
        '1_week': 168
      };

      return {
        "delay": {
          "hours": delayMap[delayType] || 24,
          "type": "fixed"
        }
      };
    }
  });

  NodeRegistry.registerNodeType('random-delay-node', {
    category: 'Timing',
    icon: '🎲',
    color: '#9c27b0',
    label: 'Random Delay',
    description: 'Wait for a random amount of time within a range',
    properties: [
      {
        key: 'minDelay',
        label: 'Minimum Delay',
        type: 'select',
        options: [
          { value: '1_day', label: '1 Day' },
          { value: '2_days', label: '2 Days' },
          { value: '3_days', label: '3 Days' }
        ],
        default: '3_days'
      },
      {
        key: 'maxDelay',
        label: 'Maximum Delay',
        type: 'select',
        options: [
          { value: '3_days', label: '3 Days' },
          { value: '5_days', label: '5 Days' },
          { value: '7_days', label: '7 Days' }
        ],
        default: '5_days'
      }
    ],
    jsonLogicConverter: (node) => {
      const minDelay = node.data?.minDelay || '3_days';
      const maxDelay = node.data?.maxDelay || '5_days';
      const delayMap = {
        '1_day': 24,
        '2_days': 48,
        '3_days': 72,
        '5_days': 120,
        '7_days': 168
      };

      return {
        "delay": {
          "min_hours": delayMap[minDelay] || 72,
          "max_hours": delayMap[maxDelay] || 120,
          "type": "random"
        }
      };
    }
  });

  // Email Action Nodes
  NodeRegistry.registerNodeType('welcome-email', {
    category: 'Actions',
    icon: '👋',
    color: '#d32f2f',
    label: 'Welcome',
    description: 'Send a welcome email',
    properties: [
      {
        key: 'emailTemplate',
        label: 'Email Template',
        type: 'select',
        options: [
          { value: 'welcome_basic', label: 'Basic Welcome' },
          { value: 'welcome_premium', label: 'Premium Welcome' },
          { value: 'welcome_enterprise', label: 'Enterprise Welcome' }
        ],
        default: 'welcome_basic'
      },
      {
        key: 'subject',
        label: 'Email Subject',
        type: 'text',
        default: 'Welcome to our service!'
      }
    ],
    jsonLogicConverter: (node) => ({
      "action": "send_email",
      "template": node.data?.emailTemplate || 'welcome_basic',
      "subject": node.data?.subject || 'Welcome to our service!',
      "type": "welcome"
    })
  });

  NodeRegistry.registerNodeType('newsletter-email', {
    category: 'Actions',
    icon: '📧',
    color: '#d32f2f',
    label: 'Newsletter',
    description: 'Send a newsletter email',
    properties: [
      {
        key: 'newsletterType',
        label: 'Newsletter Type',
        type: 'select',
        options: [
          { value: 'weekly', label: 'Weekly Newsletter' },
          { value: 'monthly', label: 'Monthly Newsletter' },
          { value: 'special', label: 'Special Newsletter' }
        ],
        default: 'weekly'
      }
    ],
    jsonLogicConverter: (node) => ({
      "action": "send_email",
      "template": "newsletter",
      "newsletter_type": node.data?.newsletterType || 'weekly',
      "type": "newsletter"
    })
  });

  NodeRegistry.registerNodeType('follow-up-email', {
    category: 'Actions',
    icon: '🔄',
    color: '#d32f2f',
    label: 'Follow-up',
    description: 'Send a follow-up email',
    properties: [
      {
        key: 'followUpType',
        label: 'Follow-up Type',
        type: 'select',
        options: [
          { value: 'engagement', label: 'Engagement Follow-up' },
          { value: 'retention', label: 'Retention Follow-up' },
          { value: 'upsell', label: 'Upsell Follow-up' }
        ],
        default: 'engagement'
      }
    ],
    jsonLogicConverter: (node) => ({
      "action": "send_email",
      "template": "follow_up",
      "follow_up_type": node.data?.followUpType || 'engagement',
      "type": "follow_up"
    })
  });

  // Configuration Nodes
  NodeRegistry.registerNodeType('cta-config', {
    category: 'Configuration',
    icon: '🎯',
    color: '#e91e63',
    label: 'CTA',
    description: 'Configure call-to-action elements',
    properties: [
      {
        key: 'ctaType',
        label: 'CTA Type',
        type: 'select',
        options: [
          { value: 'button', label: 'Button' },
          { value: 'link', label: 'Link' },
          { value: 'image', label: 'Image' }
        ],
        default: 'button'
      },
      {
        key: 'ctaText',
        label: 'CTA Text',
        type: 'text',
        default: 'Click Here'
      }
    ],
    jsonLogicConverter: (node) => ({
      "cta": {
        "type": node.data?.ctaType || 'button',
        "text": node.data?.ctaText || 'Click Here'
      }
    })
  });

  NodeRegistry.registerNodeType('url-config', {
    category: 'Configuration',
    icon: '🔗',
    color: '#795548',
    label: 'URL',
    description: 'Configure URL settings',
    properties: [
      {
        key: 'urlType',
        label: 'URL Type',
        type: 'select',
        options: [
          { value: 'admin', label: 'Admin URL' },
          { value: 'public', label: 'Public URL' },
          { value: 'tracking', label: 'Tracking URL' }
        ],
        default: 'admin'
      },
      {
        key: 'url',
        label: 'URL',
        type: 'text',
        default: ''
      }
    ],
    jsonLogicConverter: (node) => ({
      "url": {
        "type": node.data?.urlType || 'admin',
        "value": node.data?.url || ''
      }
    })
  });

  // Flow Control Nodes
  NodeRegistry.registerNodeType('split-node', {
    category: 'Flow Control',
    icon: '🔀',
    color: '#4caf50',
    label: 'Split',
    description: 'Split workflow into multiple paths',
    properties: [
      {
        key: 'splitType',
        label: 'Split Type',
        type: 'select',
        options: [
          { value: 'conditional', label: 'Conditional Split' },
          { value: 'random', label: 'Random Split' },
          { value: 'percentage', label: 'Percentage Split' }
        ],
        default: 'conditional'
      }
    ],
    jsonLogicConverter: (node) => ({
      "split": {
        "type": node.data?.splitType || 'conditional',
        "execute": true
      }
    })
  });

  NodeRegistry.registerNodeType('merge-node', {
    category: 'Flow Control',
    icon: '🔗',
    color: '#4caf50',
    label: 'Merge',
    description: 'Merge multiple workflow paths',
    jsonLogicConverter: (node) => ({
      "merge": {
        "execute": true
      }
    })
  });

  NodeRegistry.registerNodeType('re-entry-rule', {
    category: 'Flow Control',
    icon: '🔄',
    color: '#ff9800',
    label: 'Re-entry',
    description: 'Control how often users can re-enter this workflow',
    properties: [
      {
        key: 'reEntryRule',
        label: 'Re-entry Rule',
        type: 'select',
        options: [
          { value: 'once_only', label: 'Once Only' },
          { value: 'once_per_product', label: 'Once Per Product' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' }
        ],
        default: 'once_only'
      }
    ],
    jsonLogicConverter: (node) => ({
      "re_entry_rule": {
        "type": node.data?.reEntryRule || 'once_only',
        "execute": true
      }
    })
  });

  NodeRegistry.registerNodeType('end-node', {
    category: 'Flow Control',
    icon: '🏁',
    color: '#607d8b',
    label: 'End',
    description: 'End the workflow',
    jsonLogicConverter: (node) => ({
      "end": true
    })
  });
}

// Auto-initialize default node types
initializeDefaultNodeTypes();
