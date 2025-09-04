/**
 * Workflow Templates - Single Clean Template
 * Implements the tree structure discussed for subscription workflows
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
      difficulty: template.difficulty || 'beginner',
      estimatedTime: template.estimatedTime || '5 minutes',
      version: template.version || '1.0.0',
      tags: template.tags || [],
      type: 'custom'
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
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.templates.values())
      .filter(template =>
        template.name.toLowerCase().includes(lowercaseQuery) ||
        template.description.toLowerCase().includes(lowercaseQuery) ||
        template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
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
          ...customizations[node.id] || {}
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
      nodes: newNodes,
      edges: newEdges,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        difficulty: template.difficulty,
        estimatedTime: template.estimatedTime,
        version: template.version,
        tags: template.tags
      }
    };
  }
}

// Initialize with single clean template
export function initializeDefaultTemplates() {
  // Single Clean Segmented Welcome Flow Template
  WorkflowTemplates.registerTemplate('segmented-welcome-flow', {
    name: 'Segmented Welcome Flow',
    category: 'Subscription',
    description: 'Clean tree structure: Product package branching with direct actions, then shared flow',
    tags: ['subscription', 'segmented', 'if-else', 'product-specific', 'welcome', 'engagement', 'tree'],
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    version: '3.0.0',
    nodes: [
      {
        id: 'trigger-1',
        type: 'subscription-trigger',
        position: { x: 300, y: 50 },
        data: {
          triggerEvent: 'user_buys_subscription',
          label: 'User buys subscription'
        }
      },
      {
        id: 'product-condition',
        type: 'product-package-condition',
        position: { x: 300, y: 150 },
        data: {
          conditionType: 'multi_branch',
          package1Id: '24',
          package2Id: '128',
          label: 'Which product package?'
        }
      },
      {
        id: 'action-united',
        type: 'united-welcome-email',
        position: { x: 100, y: 250 },
        data: {
          subject: 'Welcome to United 🪅 — here\'s how to get started',
          templateId: 'united_welcome',
          label: 'United Welcome Action'
        }
      },
      {
        id: 'action-podcast',
        type: 'podcast-welcome-email',
        position: { x: 300, y: 250 },
        data: {
          subject: 'Welcome to the podcast — here\'s what you can do first',
          templateId: 'podcast_welcome',
          label: 'Podcast Welcome Action'
        }
      },
      {
        id: 'action-generic',
        type: 'generic-welcome-email',
        position: { x: 500, y: 250 },
        data: {
          subject: 'Welcome! Here\'s how to get started',
          templateId: 'generic_welcome',
          label: 'Generic Welcome Action'
        }
      },
      {
        id: 'shared-flow-start',
        type: 'shared-flow',
        position: { x: 300, y: 350 },
        data: {
          label: 'Shared Flow Starts Here',
          flowName: 'Welcome Follow-up Flow',
          description: 'All welcome email branches merge into this shared follow-up sequence'
        }
      },
      {
        id: 'delay-1',
        type: 'delay-node',
        position: { x: 300, y: 450 },
        data: {
          delayType: '2_days',
          label: 'Wait 2-3 days'
        }
      },
      {
        id: 'engagement-nudge',
        type: 'engagement-nudge-email',
        position: { x: 300, y: 550 },
        data: {
          subject: 'Getting started tips and FAQs',
          templateId: 'engagement_nudge',
          label: 'Engagement Nudge'
        }
      },
      {
        id: 'delay-2',
        type: 'delay-node',
        position: { x: 300, y: 650 },
        data: {
          delayType: '5_days',
          label: 'Wait 5-7 days'
        }
      },
      {
        id: 'value-highlight',
        type: 'value-highlight-email',
        position: { x: 300, y: 750 },
        data: {
          subject: 'Discover your key benefits and features',
          templateId: 'value_highlight',
          label: 'Value Highlight'
        }
      },
      {
        id: 'end-1',
        type: 'end-node',
        position: { x: 300, y: 850 },
        data: {
          label: 'End'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'product-condition',
        type: 'custom'
      },
      {
        id: 'edge-2',
        source: 'product-condition',
        target: 'action-united',
        type: 'custom'
      },
      {
        id: 'edge-3',
        source: 'product-condition',
        target: 'action-podcast',
        type: 'custom'
      },
      {
        id: 'edge-4',
        source: 'product-condition',
        target: 'action-generic',
        type: 'custom'
      },
      {
        id: 'edge-5',
        source: 'action-united',
        target: 'shared-flow-start',
        type: 'custom'
      },
      {
        id: 'edge-6',
        source: 'action-podcast',
        target: 'shared-flow-start',
        type: 'custom'
      },
      {
        id: 'edge-7',
        source: 'action-generic',
        target: 'shared-flow-start',
        type: 'custom'
      },
      {
        id: 'edge-8',
        source: 'shared-flow-start',
        target: 'delay-1',
        type: 'custom'
      },
      {
        id: 'edge-9',
        source: 'delay-1',
        target: 'engagement-nudge',
        type: 'custom'
      },
      {
        id: 'edge-10',
        source: 'engagement-nudge',
        target: 'delay-2',
        type: 'custom'
      },
      {
        id: 'edge-11',
        source: 'delay-2',
        target: 'value-highlight',
        type: 'custom'
      },
      {
        id: 'edge-12',
        source: 'value-highlight',
        target: 'end-1',
        type: 'custom'
      }
    ]
  });
}