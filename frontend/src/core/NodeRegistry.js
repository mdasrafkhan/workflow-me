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
   * @returns {Array} Node types in category
   */
  static getNodeTypesByCategory(category) {
    return Array.from(this.nodeTypes.values()).filter(
      (nodeType) => nodeType.category === category
    );
  }

  /**
   * Get node types by subcategory within a category
   * @param {string} category - Category name
   * @param {string} subcategory - Subcategory name
   * @returns {Array} Node types in subcategory
   */
  static getNodeTypesBySubcategory(category, subcategory) {
    return Array.from(this.nodeTypes.values()).filter(
      (nodeType) =>
        nodeType.category === category && nodeType.subcategory === subcategory
    );
  }

  /**
   * Get all categories with their subcategories
   * @returns {Object} Categories with subcategories
   */
  static getCategoriesWithSubcategories() {
    const categories = {};
    this.nodeTypes.forEach((nodeType) => {
      if (!categories[nodeType.category]) {
        categories[nodeType.category] = new Set();
      }
      if (nodeType.subcategory) {
        categories[nodeType.category].add(nodeType.subcategory);
      }
    });

    // Convert Sets to Arrays
    Object.keys(categories).forEach((category) => {
      categories[category] = Array.from(categories[category]);
    });

    return categories;
  }

  /**
   * Get all categories
   * @returns {Array} All categories
   */
  static getCategories() {
    const categories = new Set();
    this.nodeTypes.forEach((nodeType) => {
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
      return { always: true };
    }

    try {
      return nodeType.jsonLogicConverter(node);
    } catch (error) {
      console.error(`Error converting node ${node.id} to JsonLogic:`, error);
      return { always: true };
    }
  }
}

// Initialize with default node types
export function initializeDefaultNodeTypes() {
  // Trigger Nodes
  NodeRegistry.registerNodeType("subscription-trigger", {
    category: "Triggers",
    subcategory: "Subscriptions",
    icon: "🚀",
    color: "#1976d2",
    label: "Subscription",
    description: "Triggers when a user buys a subscription",
    properties: [
      {
        key: "triggerEvent",
        label: "Trigger Event",
        type: "select",
        options: [
          { value: "user_buys_subscription", label: "User buys subscription" },
          { value: "subscription_renewed", label: "Subscription renewed" },
          { value: "subscription_cancelled", label: "Subscription cancelled" },
        ],
        default: "user_buys_subscription",
      },
    ],
    jsonLogicConverter: (node) => ({
      trigger: "subscription",
      event: node.data?.triggerEvent || "user_buys_subscription",
      execute: true,
    }),
    validation: (data) => {
      const errors = [];
      if (!data.triggerEvent) {
        errors.push("Trigger event is required");
      }
      return errors;
    },
  });

  NodeRegistry.registerNodeType("newsletter-trigger", {
    category: "Triggers",
    subcategory: "Newsletters",
    icon: "📬",
    color: "#1976d2",
    label: "Newsletter",
    description: "Triggers when a user signs up for newsletter",
    properties: [
      {
        key: "triggerEvent",
        label: "Trigger Event",
        type: "select",
        options: [
          {
            value: "user_signs_up_newsletter",
            label: "User signs up newsletter",
          },
          { value: "newsletter_opened", label: "Newsletter opened" },
          { value: "newsletter_clicked", label: "Newsletter clicked" },
        ],
        default: "user_signs_up_newsletter",
      },
    ],
    jsonLogicConverter: (node) => ({
      trigger: "newsletter",
      event: node.data?.triggerEvent || "user_signs_up_newsletter",
      execute: true,
    }),
  });

  // Condition Nodes
  NodeRegistry.registerNodeType("product-condition", {
    category: "Conditions",
    subcategory: "Product",
    icon: "⚖️",
    color: "#d97706",
    label: "Product",
    description: "Check which product the user subscribed to",
    properties: [
      {
        key: "packageType",
        label: "Product Package",
        type: "select",
        options: [
          { value: "premium", label: "Premium Package" },
          { value: "basic", label: "Basic Package" },
          { value: "enterprise", label: "Enterprise Package" },
        ],
        default: "premium",
      },
    ],
    jsonLogicConverter: (node) => {
      const packageType = node.data?.packageType;
      if (!packageType) return { always: true };

      return {
        "==": [{ var: "subscription_package" }, packageType],
      };
    },
  });

  // Enhanced product package condition for segmented workflows
  NodeRegistry.registerNodeType("product-package-condition", {
    category: "Conditions",
    subcategory: "Product",
    icon: "🎯",
    color: "#d97706",
    label: "Product Package",
    description: "Check which specific product package the user subscribed to (supports multiple branches)",
    properties: [
      {
        key: "conditionType",
        label: "Condition Type",
        type: "select",
        options: [
          { value: "package_1", label: "Product Package 1" },
          { value: "package_2", label: "Product Package 2" },
          { value: "all_others", label: "All Other Packages" },
        ],
        default: "package_1",
      },
      {
        key: "packageId",
        label: "Package ID",
        type: "text",
        default: "24",
        description: "The specific package ID to check against",
      },
    ],
    jsonLogicConverter: (node) => {
      const conditionType = node.data?.conditionType;
      const packageId = node.data?.packageId;

      if (!conditionType) return { always: true };

      switch (conditionType) {
        case "package_1":
          return {
            "==": [{ var: "subscription_package_id" }, packageId || "24"],
          };
        case "package_2":
          return {
            "==": [{ var: "subscription_package_id" }, packageId || "128"],
          };
        case "all_others":
          return {
            "and": [
              { "!=": [{ var: "subscription_package_id" }, "24"] },
              { "!=": [{ var: "subscription_package_id" }, "128"] }
            ]
          };
        default:
          return { always: true };
      }
    },
    validation: (data) => {
      const errors = [];
      if (!data.conditionType) {
        errors.push("Condition type is required");
      }
      if (data.conditionType !== "all_others" && !data.packageId) {
        errors.push("Package ID is required for specific package conditions");
      }
      return errors;
    },
  });

  // Optimized: Single multi-branch condition node
  NodeRegistry.registerNodeType("multi-branch-condition", {
    category: "Conditions",
    subcategory: "Product",
    icon: "🔀",
    color: "#d97706",
    label: "Multi-Branch Condition",
    description: "Single node that handles multiple product package conditions with if-else logic",
    properties: [
      {
        key: "package1Id",
        label: "Package 1 ID",
        type: "text",
        default: "24",
        description: "ID for first product package",
      },
      {
        key: "package2Id",
        label: "Package 2 ID",
        type: "text",
        default: "128",
        description: "ID for second product package",
      },
      {
        key: "package1Label",
        label: "Package 1 Label",
        type: "text",
        default: "United",
        description: "Display label for package 1",
      },
      {
        key: "package2Label",
        label: "Package 2 Label",
        type: "text",
        default: "Podcast",
        description: "Display label for package 2",
      },
    ],
    jsonLogicConverter: (node) => {
      const package1Id = node.data?.package1Id || "24";
      const package2Id = node.data?.package2Id || "128";

      // Create a complex if-else condition that handles all three branches
      return {
        "if": [
          { "==": [{ var: "subscription_package_id" }, package1Id] },
          { "branch": "package_1", "package_id": package1Id },
          {
            "if": [
              { "==": [{ var: "subscription_package_id" }, package2Id] },
              { "branch": "package_2", "package_id": package2Id },
              { "branch": "all_others", "package_id": "other" }
            ]
          }
        ]
      };
    },
    validation: (data) => {
      const errors = [];
      if (!data.package1Id || !data.package2Id) {
        errors.push("Both package IDs are required");
      }
      return errors;
    },
  });

  NodeRegistry.registerNodeType("member-type-condition", {
    category: "Conditions",
    subcategory: "User",
    icon: "🎯",
    color: "#d97706",
    label: "Member Type",
    description: "Check user member type or role",
    properties: [
      {
        key: "memberType",
        label: "Member Type",
        type: "select",
        options: [
          { value: "group_owner", label: "Group Owner" },
          { value: "group_member", label: "Group Member" },
        ],
        default: "group_member",
      },
    ],
    jsonLogicConverter: (node) => {
      const memberType = node.data?.memberType;
      if (!memberType) return { always: true };

      return {
        "==": [{ var: "user_member_type" }, memberType],
      };
    },
  });

  // Timing Nodes
  NodeRegistry.registerNodeType("delay-node", {
    category: "Timing",
    subcategory: "Fixed",
    icon: "⏰",
    color: "#9c27b0",
    label: "Delay",
    description: "Wait for a specific amount of time",
    properties: [
      {
        key: "delayType",
        label: "Delay Duration",
        type: "select",
        options: [
          { value: "1_hour", label: "1 Hour" },
          { value: "1_day", label: "1 Day" },
          { value: "2_days", label: "2 Days" },
          { value: "3_days", label: "3 Days" },
          { value: "1_week", label: "1 Week" },
        ],
        default: "1_day",
      },
    ],
    jsonLogicConverter: (node) => {
      const delayType = node.data?.delayType || "1_day";
      const delayMap = {
        "1_hour": 1,
        "1_day": 24,
        "2_days": 48,
        "3_days": 72,
        "1_week": 168,
      };

      return {
        delay: {
          hours: delayMap[delayType] || 24,
          type: "fixed",
        },
      };
    },
  });

  NodeRegistry.registerNodeType("random-delay-node", {
    category: "Timing",
    subcategory: "Random",
    icon: "🎲",
    color: "#9c27b0",
    label: "Random Delay",
    description: "Wait for a random amount of time within a range",
    properties: [
      {
        key: "minDelay",
        label: "Minimum Delay",
        type: "select",
        options: [
          { value: "1_day", label: "1 Day" },
          { value: "2_days", label: "2 Days" },
          { value: "3_days", label: "3 Days" },
        ],
        default: "3_days",
      },
      {
        key: "maxDelay",
        label: "Maximum Delay",
        type: "select",
        options: [
          { value: "3_days", label: "3 Days" },
          { value: "5_days", label: "5 Days" },
          { value: "7_days", label: "7 Days" },
        ],
        default: "5_days",
      },
    ],
    jsonLogicConverter: (node) => {
      const minDelay = node.data?.minDelay || "3_days";
      const maxDelay = node.data?.maxDelay || "5_days";
      const delayMap = {
        "1_day": 24,
        "2_days": 48,
        "3_days": 72,
        "5_days": 120,
        "7_days": 168,
      };

      return {
        delay: {
          min_hours: delayMap[minDelay] || 72,
          max_hours: delayMap[maxDelay] || 120,
          type: "random",
        },
      };
    },
  });

  // Email Action Nodes
  NodeRegistry.registerNodeType("welcome-email", {
    category: "Actions",
    subcategory: "Email",
    icon: "👋",
    color: "#d32f2f",
    label: "Welcome",
    description: "Send a welcome email",
    properties: [
      {
        key: "emailTemplate",
        label: "Email Template",
        type: "select",
        options: [
          { value: "welcome_basic", label: "Basic Welcome" },
          { value: "welcome_premium", label: "Premium Welcome" },
          { value: "welcome_enterprise", label: "Enterprise Welcome" },
        ],
        default: "welcome_basic",
      },
      {
        key: "subject",
        label: "Email Subject",
        type: "text",
        default: "Welcome to our service!",
      },
    ],
    jsonLogicConverter: (node) => ({
      action: "send_email",
      template: node.data?.emailTemplate || "welcome_basic",
      subject: node.data?.subject || "Welcome to our service!",
      type: "welcome",
    }),
  });

  // Optimized: Single conditional welcome email node
  NodeRegistry.registerNodeType("conditional-welcome-email", {
    category: "Actions",
    subcategory: "Email",
    icon: "📧",
    color: "#d32f2f",
    label: "Conditional Welcome",
    description: "Send welcome email with conditional content based on product package",
    properties: [
      {
        key: "package1Subject",
        label: "Package 1 Subject",
        type: "text",
        default: "Welcome to United 🪅 — here's how to get started",
        description: "Email subject for package 1 (United)",
      },
      {
        key: "package2Subject",
        label: "Package 2 Subject",
        type: "text",
        default: "Welcome to the podcast — here's what you can do first",
        description: "Email subject for package 2 (Podcast)",
      },
      {
        key: "defaultSubject",
        label: "Default Subject",
        type: "text",
        default: "Welcome! Here's how to get started",
        description: "Email subject for all other packages",
      },
      {
        key: "package1Template",
        label: "Package 1 Template",
        type: "text",
        default: "united_welcome",
        description: "Template ID for package 1",
      },
      {
        key: "package2Template",
        label: "Package 2 Template",
        type: "text",
        default: "podcast_welcome",
        description: "Template ID for package 2",
      },
      {
        key: "defaultTemplate",
        label: "Default Template",
        type: "text",
        default: "generic_welcome",
        description: "Template ID for all other packages",
      },
    ],
    jsonLogicConverter: (node) => {
      const package1Subject = node.data?.package1Subject || "Welcome to United 🪅 — here's how to get started";
      const package2Subject = node.data?.package2Subject || "Welcome to the podcast — here's what you can do first";
      const defaultSubject = node.data?.defaultSubject || "Welcome! Here's how to get started";

      const package1Template = node.data?.package1Template || "united_welcome";
      const package2Template = node.data?.package2Template || "podcast_welcome";
      const defaultTemplate = node.data?.defaultTemplate || "generic_welcome";

      return {
        action: "send_email",
        type: "welcome",
        conditional: {
          "if": [
            { "==": [{ var: "subscription_package_id" }, "24"] },
            {
              template: package1Template,
              subject: package1Subject,
              package_specific: "united"
            },
            {
              "if": [
                { "==": [{ var: "subscription_package_id" }, "128"] },
                {
                  template: package2Template,
                  subject: package2Subject,
                  package_specific: "podcast"
                },
                {
                  template: defaultTemplate,
                  subject: defaultSubject,
                  package_specific: "generic"
                }
              ]
            }
          ]
        }
      };
    },
    validation: (data) => {
      const errors = [];
      if (!data.package1Subject || !data.package2Subject || !data.defaultSubject) {
        errors.push("All email subjects are required");
      }
      if (!data.package1Template || !data.package2Template || !data.defaultTemplate) {
        errors.push("All template IDs are required");
      }
      return errors;
    },
  });

  // Keep individual nodes for backward compatibility and specific use cases
  NodeRegistry.registerNodeType("united-welcome-email", {
    category: "Actions",
    subcategory: "Email",
    icon: "🪅",
    color: "#d32f2f",
    label: "United Welcome",
    description: "Send United welcome email with party popper emoji",
    properties: [
      {
        key: "subject",
        label: "Email Subject",
        type: "text",
        default: "Welcome to United 🪅 — here's how to get started",
      },
      {
        key: "templateId",
        label: "Template ID",
        type: "text",
        default: "united_welcome",
      },
    ],
    jsonLogicConverter: (node) => ({
      action: "send_email",
      template: node.data?.templateId || "united_welcome",
      subject: node.data?.subject || "Welcome to United 🪅 — here's how to get started",
      type: "welcome",
      package_specific: "united",
    }),
  });

  NodeRegistry.registerNodeType("podcast-welcome-email", {
    category: "Actions",
    subcategory: "Email",
    icon: "🎧",
    color: "#d32f2f",
    label: "Podcast Welcome",
    description: "Send podcast welcome email",
    properties: [
      {
        key: "subject",
        label: "Email Subject",
        type: "text",
        default: "Welcome to the podcast — here's what you can do first",
      },
      {
        key: "templateId",
        label: "Template ID",
        type: "text",
        default: "podcast_welcome",
      },
    ],
    jsonLogicConverter: (node) => ({
      action: "send_email",
      template: node.data?.templateId || "podcast_welcome",
      subject: node.data?.subject || "Welcome to the podcast — here's what you can do first",
      type: "welcome",
      package_specific: "podcast",
    }),
  });

  NodeRegistry.registerNodeType("generic-welcome-email", {
    category: "Actions",
    subcategory: "Email",
    icon: "📧",
    color: "#d32f2f",
    label: "Generic Welcome",
    description: "Send generic welcome email for all other packages",
    properties: [
      {
        key: "subject",
        label: "Email Subject",
        type: "text",
        default: "Welcome! Here's how to get started",
      },
      {
        key: "templateId",
        label: "Template ID",
        type: "text",
        default: "generic_welcome",
      },
    ],
    jsonLogicConverter: (node) => ({
      action: "send_email",
      template: node.data?.templateId || "generic_welcome",
      subject: node.data?.subject || "Welcome! Here's how to get started",
      type: "welcome",
      package_specific: "generic",
    }),
  });

  NodeRegistry.registerNodeType("newsletter-email", {
    category: "Actions",
    subcategory: "Email",
    icon: "📧",
    color: "#d32f2f",
    label: "Newsletter",
    description: "Send a newsletter email",
    properties: [
      {
        key: "newsletterType",
        label: "Newsletter Type",
        type: "select",
        options: [
          { value: "weekly", label: "Weekly Newsletter" },
          { value: "monthly", label: "Monthly Newsletter" },
          { value: "special", label: "Special Newsletter" },
        ],
        default: "weekly",
      },
    ],
    jsonLogicConverter: (node) => ({
      action: "send_email",
      template: "newsletter",
      newsletter_type: node.data?.newsletterType || "weekly",
      type: "newsletter",
    }),
  });

  NodeRegistry.registerNodeType("follow-up-email", {
    category: "Actions",
    subcategory: "Email",
    icon: "🔄",
    color: "#d32f2f",
    label: "Follow-up",
    description: "Send a follow-up email",
    properties: [
      {
        key: "followUpType",
        label: "Follow-up Type",
        type: "select",
        options: [
          { value: "engagement", label: "Engagement Follow-up" },
          { value: "retention", label: "Retention Follow-up" },
          { value: "upsell", label: "Upsell Follow-up" },
        ],
        default: "engagement",
      },
    ],
    jsonLogicConverter: (node) => ({
      action: "send_email",
      template: "follow_up",
      follow_up_type: node.data?.followUpType || "engagement",
      type: "follow_up",
    }),
  });

  // Specific follow-up emails for the workflow
  NodeRegistry.registerNodeType("engagement-nudge-email", {
    category: "Actions",
    subcategory: "Email",
    icon: "💡",
    color: "#d32f2f",
    label: "Engagement Nudge",
    description: "Send engagement nudge with onboarding tips",
    properties: [
      {
        key: "subject",
        label: "Email Subject",
        type: "text",
        default: "Getting started tips and FAQs",
      },
      {
        key: "templateId",
        label: "Template ID",
        type: "text",
        default: "engagement_nudge",
      },
    ],
    jsonLogicConverter: (node) => ({
      action: "send_email",
      template: node.data?.templateId || "engagement_nudge",
      subject: node.data?.subject || "Getting started tips and FAQs",
      type: "engagement_nudge",
      content_type: "onboarding_tips",
    }),
  });

  NodeRegistry.registerNodeType("value-highlight-email", {
    category: "Actions",
    subcategory: "Email",
    icon: "⭐",
    color: "#d32f2f",
    label: "Value Highlight",
    description: "Showcase main benefits and features",
    properties: [
      {
        key: "subject",
        label: "Email Subject",
        type: "text",
        default: "Discover your key benefits and features",
      },
      {
        key: "templateId",
        label: "Template ID",
        type: "text",
        default: "value_highlight",
      },
    ],
    jsonLogicConverter: (node) => ({
      action: "send_email",
      template: node.data?.templateId || "value_highlight",
      subject: node.data?.subject || "Discover your key benefits and features",
      type: "value_highlight",
      content_type: "benefits_features",
    }),
  });

  // Configuration Nodes
  NodeRegistry.registerNodeType("cta-config", {
    category: "Configuration",
    subcategory: "UI",
    icon: "🎯",
    color: "#e91e63",
    label: "CTA",
    description: "Configure call-to-action elements",
    properties: [
      {
        key: "ctaType",
        label: "CTA Type",
        type: "select",
        options: [
          { value: "button", label: "Button" },
          { value: "link", label: "Link" },
          { value: "image", label: "Image" },
        ],
        default: "button",
      },
      {
        key: "ctaText",
        label: "CTA Text",
        type: "text",
        default: "Click Here",
      },
    ],
    jsonLogicConverter: (node) => ({
      cta: {
        type: node.data?.ctaType || "button",
        text: node.data?.ctaText || "Click Here",
      },
    }),
  });

  NodeRegistry.registerNodeType("url-config", {
    category: "Configuration",
    subcategory: "URL",
    icon: "🔗",
    color: "#795548",
    label: "URL",
    description: "Configure URL settings",
    properties: [
      {
        key: "urlType",
        label: "URL Type",
        type: "select",
        options: [
          { value: "admin", label: "Admin URL" },
          { value: "public", label: "Public URL" },
          { value: "tracking", label: "Tracking URL" },
        ],
        default: "admin",
      },
      {
        key: "url",
        label: "URL",
        type: "text",
        default: "",
      },
    ],
    jsonLogicConverter: (node) => ({
      url: {
        type: node.data?.urlType || "admin",
        value: node.data?.url || "",
      },
    }),
  });

  // Flow Control Nodes
  NodeRegistry.registerNodeType("split-node", {
    category: "Flow Control",
    subcategory: "Split",
    icon: "🔀",
    color: "#4caf50",
    label: "Split",
    description: "Split workflow into multiple paths",
    properties: [
      {
        key: "splitType",
        label: "Split Type",
        type: "select",
        options: [
          { value: "conditional", label: "Conditional Split" },
          { value: "random", label: "Random Split" },
          { value: "percentage", label: "Percentage Split" },
        ],
        default: "conditional",
      },
    ],
    jsonLogicConverter: (node) => ({
      split: {
        type: node.data?.splitType || "conditional",
        execute: true,
      },
    }),
  });

  NodeRegistry.registerNodeType("merge-node", {
    category: "Flow Control",
    subcategory: "Merge",
    icon: "🔗",
    color: "#4caf50",
    label: "Merge",
    description: "Merge multiple workflow paths",
    jsonLogicConverter: (node) => ({
      merge: {
        execute: true,
      },
    }),
  });

  NodeRegistry.registerNodeType("shared-flow", {
    category: "Flow Control",
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

  NodeRegistry.registerNodeType("re-entry-rule", {
    category: "Flow Control",
    subcategory: "Rules",
    icon: "🔄",
    color: "#ff9800",
    label: "Re-entry",
    description: "Control how often users can re-enter this workflow",
    properties: [
      {
        key: "reEntryRule",
        label: "Re-entry Rule",
        type: "select",
        options: [
          { value: "once_only", label: "Once Only" },
          { value: "once_per_product", label: "Once Per Product" },
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
        ],
        default: "once_only",
      },
    ],
    jsonLogicConverter: (node) => ({
      re_entry_rule: {
        type: node.data?.reEntryRule || "once_only",
        execute: true,
      },
    }),
  });

  NodeRegistry.registerNodeType("end-node", {
    category: "Flow Control",
    subcategory: "End",
    icon: "🏁",
    color: "#607d8b",
    label: "End",
    description: "End the workflow",
    jsonLogicConverter: (node) => ({
      end: true,
    }),
  });
}

// Auto-initialize default node types
initializeDefaultNodeTypes();
