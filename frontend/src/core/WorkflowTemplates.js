/**
 * Workflow Templates System
 * Pre-built workflow templates for common use cases
 * Makes it easy to create new workflows from proven patterns
 */

import { v4 as uuidv4 } from 'uuid';

export class WorkflowTemplates {
  static templates = new Map();

  /**
   * Register a new workflow template
   * @param {string} id - Template identifier
   * @param {Object} template - Template configuration
   */
  static registerTemplate(id, template) {
    this.templates.set(id, {
      ...template,
      id,
      createdAt: new Date(),
      // Default values
      category: template.category || 'General',
      description: template.description || '',
      tags: template.tags || [],
      difficulty: template.difficulty || 'beginner',
      estimatedTime: template.estimatedTime || '5 minutes',
      nodes: template.nodes || [],
      edges: template.edges || []
    });
  }

  /**
   * Get template by ID
   * @param {string} id - Template identifier
   * @returns {Object} Template configuration
   */
  static getTemplate(id) {
    return this.templates.get(id);
  }

  /**
   * Get all templates
   * @returns {Array} All templates
   */
  static getAllTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   * @param {string} category - Category name
   * @returns {Array} Templates in category
   */
  static getTemplatesByCategory(category) {
    return Array.from(this.templates.values())
      .filter(template => template.category === category);
  }

  /**
   * Get templates by difficulty
   * @param {string} difficulty - Difficulty level
   * @returns {Array} Templates with difficulty
   */
  static getTemplatesByDifficulty(difficulty) {
    return Array.from(this.templates.values())
      .filter(template => template.difficulty === difficulty);
  }

  /**
   * Search templates
   * @param {string} query - Search query
   * @returns {Array} Matching templates
   */
  static searchTemplates(query) {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values())
      .filter(template =>
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
  }

  /**
   * Create workflow from template
   * @param {string} templateId - Template identifier
   * @param {Object} customizations - Custom node data
   * @returns {Object} Workflow with nodes and edges
   */
  static createWorkflowFromTemplate(templateId, customizations = {}) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Generate new IDs for all nodes and edges
    const nodeIdMap = new Map();
    const newNodes = template.nodes.map(node => {
      const newNodeId = uuidv4();
      nodeIdMap.set(node.id, newNodeId);

      return {
        ...node,
        id: newNodeId,
        data: {
          ...node.data,
          ...customizations[node.id] // Apply customizations
        }
      };
    });

    const newEdges = template.edges.map(edge => ({
      ...edge,
      id: uuidv4(),
      source: nodeIdMap.get(edge.source),
      target: nodeIdMap.get(edge.target)
    }));

    return {
      name: `${template.name} (Copy)`,
      nodes: newNodes,
      edges: newEdges,
      templateId: templateId,
      templateVersion: template.version || '1.0.0'
    };
  }
}

// Initialize with default templates
export function initializeDefaultTemplates() {
  // Subscription Welcome Series Template
  WorkflowTemplates.registerTemplate('subscription-welcome-series', {
    name: 'Subscription Welcome Series',
    category: 'Subscription',
    description: 'Complete welcome series for new subscribers with product-specific messaging',
    tags: ['subscription', 'welcome', 'onboarding', 'segmented'],
    difficulty: 'intermediate',
    estimatedTime: '10 minutes',
    version: '1.0.0',
    nodes: [
      {
        id: 'trigger-1',
        type: 'subscription-trigger',
        position: { x: 100, y: 100 },
        data: {
          triggerEvent: 'user_buys_subscription',
          label: 'Subscription Trigger'
        }
      },
      {
        id: 'condition-1',
        type: 'product-condition',
        position: { x: 300, y: 100 },
        data: {
          packageType: 'premium',
          label: 'Product Condition'
        }
      },
      {
        id: 'delay-1',
        type: 'delay-node',
        position: { x: 500, y: 100 },
        data: {
          delayType: '1_day',
          label: 'Wait 1 Day'
        }
      },
      {
        id: 'email-1',
        type: 'welcome-email',
        position: { x: 700, y: 100 },
        data: {
          emailTemplate: 'welcome_premium',
          subject: 'Welcome to Premium!',
          label: 'Welcome Email'
        }
      },
      {
        id: 'delay-2',
        type: 'random-delay-node',
        position: { x: 900, y: 100 },
        data: {
          minDelay: '3_days',
          maxDelay: '5_days',
          label: 'Wait 3-5 Days'
        }
      },
      {
        id: 'email-2',
        type: 'follow-up-email',
        position: { x: 1100, y: 100 },
        data: {
          followUpType: 'engagement',
          label: 'Follow-up Email'
        }
      },
      {
        id: 'end-1',
        type: 'end-node',
        position: { x: 1300, y: 100 },
        data: {
          label: 'End'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'condition-1',
        type: 'custom'
      },
      {
        id: 'edge-2',
        source: 'condition-1',
        target: 'delay-1',
        type: 'custom'
      },
      {
        id: 'edge-3',
        source: 'delay-1',
        target: 'email-1',
        type: 'custom'
      },
      {
        id: 'edge-4',
        source: 'email-1',
        target: 'delay-2',
        type: 'custom'
      },
      {
        id: 'edge-5',
        source: 'delay-2',
        target: 'email-2',
        type: 'custom'
      },
      {
        id: 'edge-6',
        source: 'email-2',
        target: 'end-1',
        type: 'custom'
      }
    ]
  });

  // Newsletter Sign-up Welcome Series Template
  WorkflowTemplates.registerTemplate('newsletter-welcome-series', {
    name: 'Newsletter Welcome Series',
    category: 'Newsletter',
    description: 'Simple welcome series for newsletter subscribers',
    tags: ['newsletter', 'welcome', 'simple'],
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    version: '1.0.0',
    nodes: [
      {
        id: 'trigger-1',
        type: 'newsletter-trigger',
        position: { x: 100, y: 100 },
        data: {
          triggerEvent: 'user_signs_up_newsletter',
          label: 'Newsletter Trigger'
        }
      },
      {
        id: 'email-1',
        type: 'welcome-email',
        position: { x: 300, y: 100 },
        data: {
          emailTemplate: 'welcome_basic',
          subject: 'Welcome to our newsletter!',
          label: 'Welcome Email'
        }
      },
      {
        id: 'delay-1',
        type: 'delay-node',
        position: { x: 500, y: 100 },
        data: {
          delayType: '2_days',
          label: 'Wait 2 Days'
        }
      },
      {
        id: 'email-2',
        type: 'newsletter-email',
        position: { x: 700, y: 100 },
        data: {
          newsletterType: 'weekly',
          label: 'Newsletter Email'
        }
      },
      {
        id: 'end-1',
        type: 'end-node',
        position: { x: 900, y: 100 },
        data: {
          label: 'End'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'email-1',
        type: 'custom'
      },
      {
        id: 'edge-2',
        source: 'email-1',
        target: 'delay-1',
        type: 'custom'
      },
      {
        id: 'edge-3',
        source: 'delay-1',
        target: 'email-2',
        type: 'custom'
      },
      {
        id: 'edge-4',
        source: 'email-2',
        target: 'end-1',
        type: 'custom'
      }
    ]
  });

  // Segmented Welcome Template (from document)
  WorkflowTemplates.registerTemplate('segmented-welcome-template', {
    name: 'Segmented Welcome Template',
    category: 'Subscription',
    description: 'Product-specific welcome messages based on subscription package',
    tags: ['subscription', 'segmented', 'product-specific', 'welcome'],
    difficulty: 'intermediate',
    estimatedTime: '8 minutes',
    version: '1.0.0',
    nodes: [
      {
        id: 'trigger-1',
        type: 'subscription-trigger',
        position: { x: 100, y: 200 },
        data: {
          triggerEvent: 'user_buys_subscription',
          label: 'User buys subscription'
        }
      },
      {
        id: 'condition-1',
        type: 'product-condition',
        position: { x: 300, y: 200 },
        data: {
          packageType: 'premium',
          label: 'Which product did the user subscribe to?'
        }
      },
      {
        id: 'split-1',
        type: 'split-node',
        position: { x: 500, y: 200 },
        data: {
          splitType: 'conditional',
          label: 'Split by Product'
        }
      },
      {
        id: 'email-1',
        type: 'welcome-email',
        position: { x: 700, y: 100 },
        data: {
          emailTemplate: 'welcome_premium',
          subject: 'Welcome to United 🎊 — here\'s how to get started',
          label: 'Premium Welcome Email'
        }
      },
      {
        id: 'email-2',
        type: 'welcome-email',
        position: { x: 700, y: 300 },
        data: {
          emailTemplate: 'welcome_basic',
          subject: 'Welcome to the podcast — here\'s what you can do first',
          label: 'Basic Welcome Email'
        }
      },
      {
        id: 'email-3',
        type: 'welcome-email',
        position: { x: 700, y: 500 },
        data: {
          emailTemplate: 'welcome_basic',
          subject: 'Welcome! Here\'s what you can do first',
          label: 'Default Welcome Email'
        }
      },
      {
        id: 'merge-1',
        type: 'merge-node',
        position: { x: 900, y: 300 },
        data: {
          label: 'Merge'
        }
      },
      {
        id: 'end-1',
        type: 'end-node',
        position: { x: 1100, y: 300 },
        data: {
          label: 'End'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'condition-1',
        type: 'custom'
      },
      {
        id: 'edge-2',
        source: 'condition-1',
        target: 'split-1',
        type: 'custom'
      },
      {
        id: 'edge-3',
        source: 'split-1',
        target: 'email-1',
        type: 'custom'
      },
      {
        id: 'edge-4',
        source: 'split-1',
        target: 'email-2',
        type: 'custom'
      },
      {
        id: 'edge-5',
        source: 'split-1',
        target: 'email-3',
        type: 'custom'
      },
      {
        id: 'edge-6',
        source: 'email-1',
        target: 'merge-1',
        type: 'custom'
      },
      {
        id: 'edge-7',
        source: 'email-2',
        target: 'merge-1',
        type: 'custom'
      },
      {
        id: 'edge-8',
        source: 'email-3',
        target: 'merge-1',
        type: 'custom'
      },
      {
        id: 'edge-9',
        source: 'merge-1',
        target: 'end-1',
        type: 'custom'
      }
    ]
  });

  // Re-engagement Campaign Template
  WorkflowTemplates.registerTemplate('re-engagement-campaign', {
    name: 'Re-engagement Campaign',
    category: 'Retention',
    description: 'Multi-step campaign to re-engage inactive users',
    tags: ['retention', 're-engagement', 'email', 'campaign'],
    difficulty: 'advanced',
    estimatedTime: '15 minutes',
    version: '1.0.0',
    nodes: [
      {
        id: 'trigger-1',
        type: 'subscription-trigger',
        position: { x: 100, y: 100 },
        data: {
          triggerEvent: 'user_inactive_30_days',
          label: 'User Inactive 30 Days'
        }
      },
      {
        id: 'email-1',
        type: 'follow-up-email',
        position: { x: 300, y: 100 },
        data: {
          followUpType: 'retention',
          label: 'First Re-engagement Email'
        }
      },
      {
        id: 'delay-1',
        type: 'delay-node',
        position: { x: 500, y: 100 },
        data: {
          delayType: '1_week',
          label: 'Wait 1 Week'
        }
      },
      {
        id: 'email-2',
        type: 'follow-up-email',
        position: { x: 700, y: 100 },
        data: {
          followUpType: 'retention',
          label: 'Second Re-engagement Email'
        }
      },
      {
        id: 'delay-2',
        type: 'delay-node',
        position: { x: 900, y: 100 },
        data: {
          delayType: '1_week',
          label: 'Wait 1 Week'
        }
      },
      {
        id: 'email-3',
        type: 'follow-up-email',
        position: { x: 1100, y: 100 },
        data: {
          followUpType: 'retention',
          label: 'Final Re-engagement Email'
        }
      },
      {
        id: 'end-1',
        type: 'end-node',
        position: { x: 1300, y: 100 },
        data: {
          label: 'End'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'email-1',
        type: 'custom'
      },
      {
        id: 'edge-2',
        source: 'email-1',
        target: 'delay-1',
        type: 'custom'
      },
      {
        id: 'edge-3',
        source: 'delay-1',
        target: 'email-2',
        type: 'custom'
      },
      {
        id: 'edge-4',
        source: 'email-2',
        target: 'delay-2',
        type: 'custom'
      },
      {
        id: 'edge-5',
        source: 'delay-2',
        target: 'email-3',
        type: 'custom'
      },
      {
        id: 'edge-6',
        source: 'email-3',
        target: 'end-1',
        type: 'custom'
      }
    ]
  });

  // A/B Test Template
  WorkflowTemplates.registerTemplate('ab-test-template', {
    name: 'A/B Test Template',
    category: 'Testing',
    description: 'Template for A/B testing different email variations',
    tags: ['ab-test', 'testing', 'optimization', 'email'],
    difficulty: 'advanced',
    estimatedTime: '12 minutes',
    version: '1.0.0',
    nodes: [
      {
        id: 'trigger-1',
        type: 'subscription-trigger',
        position: { x: 100, y: 200 },
        data: {
          triggerEvent: 'user_buys_subscription',
          label: 'Subscription Trigger'
        }
      },
      {
        id: 'split-1',
        type: 'split-node',
        position: { x: 300, y: 200 },
        data: {
          splitType: 'percentage',
          label: 'A/B Split (50/50)'
        }
      },
      {
        id: 'email-1',
        type: 'welcome-email',
        position: { x: 500, y: 100 },
        data: {
          emailTemplate: 'welcome_variant_a',
          subject: 'Welcome! (Variant A)',
          label: 'Variant A Email'
        }
      },
      {
        id: 'email-2',
        type: 'welcome-email',
        position: { x: 500, y: 300 },
        data: {
          emailTemplate: 'welcome_variant_b',
          subject: 'Welcome! (Variant B)',
          label: 'Variant B Email'
        }
      },
      {
        id: 'merge-1',
        type: 'merge-node',
        position: { x: 700, y: 200 },
        data: {
          label: 'Merge Results'
        }
      },
      {
        id: 'end-1',
        type: 'end-node',
        position: { x: 900, y: 200 },
        data: {
          label: 'End'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'split-1',
        type: 'custom'
      },
      {
        id: 'edge-2',
        source: 'split-1',
        target: 'email-1',
        type: 'custom'
      },
      {
        id: 'edge-3',
        source: 'split-1',
        target: 'email-2',
        type: 'custom'
      },
      {
        id: 'edge-4',
        source: 'email-1',
        target: 'merge-1',
        type: 'custom'
      },
      {
        id: 'edge-5',
        source: 'email-2',
        target: 'merge-1',
        type: 'custom'
      },
      {
        id: 'edge-6',
        source: 'merge-1',
        target: 'end-1',
        type: 'custom'
      }
    ]
  });
}

// Auto-initialize default templates
initializeDefaultTemplates();
