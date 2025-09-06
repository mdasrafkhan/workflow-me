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
      category: config.category || "Other",
      icon: config.icon || "📦",
      color: config.color || "#666666",
      label: config.label || type,
      description: config.description || "",
      properties: config.properties || [],
      jsonLogicConverter:
        config.jsonLogicConverter || (() => ({ always: true })),
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
   * @returns {Array} Array of node types in category
   */
  static getNodeTypesByCategory(category) {
    return Array.from(this.nodeTypes.values()).filter(
      (nodeType) => nodeType.category === category
    );
  }

  /**
   * Get all categories
   * @returns {Array} Array of unique categories
   */
  static getCategories() {
    const categories = new Set();
    this.nodeTypes.forEach((nodeType) => {
      categories.add(nodeType.category);
    });
    return Array.from(categories).sort();
  }

  /**
   * Check if node type exists
   * @param {string} type - Node type identifier
   * @returns {boolean} True if exists
   */
  static hasNodeType(type) {
    return this.nodeTypes.has(type);
  }

  /**
   * Remove node type
   * @param {string} type - Node type identifier
   */
  static removeNodeType(type) {
    this.nodeTypes.delete(type);
  }

  /**
   * Clear all node types
   */
  static clear() {
    this.nodeTypes.clear();
  }

  /**
   * Convert a node to JsonLogic using its registered converter
   * @param {Object} node - React Flow node
   * @returns {Object} JsonLogic rule
   */
  static convertNodeToJsonLogic(node) {
    const nodeType = this.getNodeType(node.type);
    if (!nodeType || !nodeType.jsonLogicConverter) {
      return { always: true };
    }
    return nodeType.jsonLogicConverter(node);
  }
}

// ============================================================================
// 1. TRIGGERS - Start workflow events (User starts here)
// ============================================================================

NodeRegistry.registerNodeType("subscription-trigger", {
  category: "1. Triggers",
  subcategory: "Subscription Events",
  icon: "🛒",
  color: "#e91e63",
  label: "Subscription Trigger",
  description: "Triggers when a user buys a subscription",
  properties: [
    {
      key: "triggerEvent",
      type: "select",
      label: "Trigger Event",
      options: [
        { value: "user_buys_subscription", label: "User buys subscription" },
        { value: "subscription_renewed", label: "Subscription renewed" },
        { value: "subscription_cancelled", label: "Subscription cancelled" },
        { value: "subscription_upgraded", label: "Subscription upgraded" }
      ],
      required: true,
      default: "user_buys_subscription"
    },
    {
      key: "reEntryRule",
      type: "select",
      label: "Re-entry Rule",
      options: [
        { value: "once_per_user", label: "Once per user" },
        { value: "once_per_product", label: "Once per product package" },
        { value: "always", label: "Always" },
        { value: "never", label: "Never" }
      ],
      required: true,
      default: "once_per_product"
    }
  ],
  jsonLogicConverter: (node) => ({
    trigger: {
      event: node.data?.triggerEvent || "user_buys_subscription",
      reEntryRule: node.data?.reEntryRule || "once_per_product",
      execute: true,
    },
  }),
});

NodeRegistry.registerNodeType("newsletter-trigger", {
  category: "1. Triggers",
  subcategory: "Newsletter Events",
  icon: "📧",
  color: "#e91e63",
  label: "Newsletter Trigger",
  description: "Triggers when a user subscribes to newsletter",
  properties: [
    {
      key: "triggerEvent",
      type: "select",
      label: "Trigger Event",
      options: [
        { value: "newsletter_subscribed", label: "Newsletter subscribed" },
        { value: "newsletter_unsubscribed", label: "Newsletter unsubscribed" },
        { value: "newsletter_opened", label: "Newsletter opened" },
        { value: "newsletter_clicked", label: "Newsletter clicked" }
      ],
      required: true,
      default: "newsletter_subscribed"
    }
  ],
  jsonLogicConverter: (node) => ({
    trigger: {
      event: node.data?.triggerEvent || "newsletter_subscribed",
      execute: true,
    },
  }),
});

// ============================================================================
// 2. CONDITIONS - Branching logic (What to check)
// ============================================================================

NodeRegistry.registerNodeType("condition", {
  category: "2. Conditions",
  subcategory: "Generic Condition",
  icon: "🔍",
  color: "#ff9800",
  label: "Condition",
  description: "Generic condition node for any feature branching",
  properties: [
    {
      key: "conditionType",
      type: "select",
      label: "Condition Type",
      options: [
        { value: "product_package", label: "Product Package" },
        { value: "engagement_level", label: "Engagement Level" },
        { value: "user_type", label: "User Type" },
        { value: "subscription_status", label: "Subscription Status" },
        { value: "newsletter_status", label: "Newsletter Status" },
        { value: "custom", label: "Custom" }
      ],
      required: true,
      default: "product_package"
    },
    {
      key: "conditionValue",
      type: "text",
      label: "Condition Value",
      placeholder: "e.g., package_1, high, premium",
      required: true,
      default: "package_1"
    },
    {
      key: "operator",
      type: "select",
      label: "Operator",
      options: [
        { value: "equals", label: "Equals" },
        { value: "not_equals", label: "Not Equals" },
        { value: "in", label: "In List" },
        { value: "not_in", label: "Not In List" }
      ],
      required: true,
      default: "equals"
    },
    {
      key: "description",
      type: "text",
      label: "Description",
      placeholder: "Describe this condition",
      required: false,
      default: ""
    }
  ],
  jsonLogicConverter: (node) => {
    const conditionType = node.data?.conditionType || "product_package";
    const conditionValue = node.data?.conditionValue || "package_1";
    const operator = node.data?.operator || "equals";

    // Build the condition based on type and operator
    let condition = {};

    if (operator === "equals") {
      condition[conditionType] = conditionValue;
    } else if (operator === "not_equals") {
      condition[conditionType] = { "!=": conditionValue };
    } else if (operator === "in") {
      condition[conditionType] = { "in": conditionValue.split(",").map(v => v.trim()) };
    } else if (operator === "not_in") {
      condition[conditionType] = { "!": { "in": conditionValue.split(",").map(v => v.trim()) } };
    }

    return condition;
  },
});

// ============================================================================
// 3. ACTIONS - What to do (Execute actions)
// ============================================================================

NodeRegistry.registerNodeType("action", {
  category: "3. Actions",
  subcategory: "Generic Action",
  icon: "⚡",
  color: "#4caf50",
  label: "Action",
  description: "Generic action node for any workflow action",
  properties: [
    {
      key: "actionType",
      type: "select",
      label: "Action Type",
      options: [
        { value: "send_email", label: "Send Email" },
        { value: "send_sms", label: "Send SMS" },
        { value: "update_user", label: "Update User" },
        { value: "create_task", label: "Create Task" },
        { value: "trigger_webhook", label: "Trigger Webhook" },
        { value: "send_newsletter", label: "Send Newsletter" },
        { value: "custom", label: "Custom Action" }
      ],
      required: true,
      default: "send_email"
    },
    {
      key: "actionName",
      type: "text",
      label: "Action Name",
      placeholder: "e.g., Welcome Email, Engagement Nudge",
      required: true,
      default: "Action"
    },
    {
      key: "actionData",
      type: "textarea",
      label: "Action Data",
      placeholder: "JSON data for the action (optional)",
      required: false,
      default: "{}"
    },
    {
      key: "description",
      type: "text",
      label: "Description",
      placeholder: "Describe what this action does",
      required: false,
      default: ""
    }
  ],
  jsonLogicConverter: (node) => {
    const actionType = node.data?.actionType || "send_email";
    const actionName = node.data?.actionName || "Action";
    const actionData = node.data?.actionData || "{}";

    let parsedData = {};
    try {
      parsedData = JSON.parse(actionData);
    } catch (e) {
      parsedData = { content: actionData };
    }

    return {
      [actionType]: {
        name: actionName,
        description: node.data?.description || "",
        data: parsedData,
        execute: true
      }
    };
  },
});

// ============================================================================
// 4. TIMING - Delays and scheduling (When to execute)
// ============================================================================

NodeRegistry.registerNodeType("delay-node", {
  category: "4. Timing",
  subcategory: "Delays",
  icon: "⏰",
  color: "#ff5722",
  label: "Delay",
  description: "Wait for a specified amount of time before continuing",
  properties: [
    {
      key: "delayType",
      type: "select",
      label: "Delay Type",
      options: [
        { value: "2_days", label: "2-3 days" },
        { value: "5_days", label: "5-7 days" },
        { value: "1_week", label: "1 week" },
        { value: "2_weeks", label: "2 weeks" },
        { value: "1_month", label: "1 month" },
        { value: "custom", label: "Custom delay" }
      ],
      required: true,
      default: "2_days"
    },
    {
      key: "customDelay",
      type: "text",
      label: "Custom Delay",
      placeholder: "e.g., 3 days, 1 week, 2 hours",
      required: false,
      default: ""
    }
  ],
  jsonLogicConverter: (node) => {
    const delayType = node.data?.delayType || "2_days";
    const customDelay = node.data?.customDelay || "";

    let delayValue = delayType;
    if (delayType === "custom" && customDelay) {
      delayValue = customDelay;
    }

    return {
      delay: {
        type: delayValue,
        execute: true,
      },
    };
  },
});

// ============================================================================
// 5. FLOW CONTROL - Workflow structure (How to organize)
// ============================================================================

NodeRegistry.registerNodeType("shared-flow", {
  category: "5. Flow Control",
  subcategory: "Shared Flow",
  icon: "🌊",
  color: "#2196f3",
  label: "Shared Flow",
  description: "Shared workflow steps that all branches merge into",
  properties: [
    {
      key: "flowName",
      type: "text",
      label: "Flow Name",
      placeholder: "Enter flow name",
      required: true,
      default: "Shared Flow"
    },
    {
      key: "description",
      type: "text",
      label: "Description",
      placeholder: "Describe what happens in this shared flow",
      required: false,
      default: "All branches merge into this shared workflow"
    }
  ],
  jsonLogicConverter: (node) => ({
    sharedFlow: {
      name: node.data?.flowName || "Shared Flow",
      description: node.data?.description || "All branches merge into this shared workflow",
      execute: true,
    },
  }),
});

NodeRegistry.registerNodeType("end-node", {
  category: "5. Flow Control",
  subcategory: "Termination",
  icon: "🏁",
  color: "#9e9e9e",
  label: "End",
  description: "Ends the workflow execution",
  properties: [
    {
      key: "endReason",
      type: "select",
      label: "End Reason",
      options: [
        { value: "completed", label: "Workflow completed" },
        { value: "cancelled", label: "Workflow cancelled" },
        { value: "error", label: "Workflow error" },
        { value: "timeout", label: "Workflow timeout" }
      ],
      required: true,
      default: "completed"
    }
  ],
  jsonLogicConverter: (node) => ({
    end: {
      reason: node.data?.endReason || "completed",
      execute: true,
    },
  }),
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize with default node types
export function initializeDefaultNodes() {
  // All nodes are already registered above
  console.log(`✅ NodeRegistry initialized with ${NodeRegistry.getAllNodeTypes().size} node types`);
}

// Auto-initialize when module loads
initializeDefaultNodes();