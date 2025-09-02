/**
 * Pre-built workflow templates for common use cases
 */

export const workflowTemplates = {
  // Subscription Welcome Series Workflow
  subscriptionWelcomeSeries: {
    name: "Subscription Welcome Series",
    description: "Segmented welcome emails based on subscription package",
    nodes: [
      {
        id: "trigger-1",
        type: "subscription-trigger",
        position: { x: 100, y: 100 },
        data: { selected: "user_buys_subscription" }
      },
      {
        id: "re-entry-1",
        type: "re-entry-rule",
        position: { x: 200, y: 100 },
        data: { selected: "once_per_product_package" }
      },
      {
        id: "split-1",
        type: "split-node",
        position: { x: 300, y: 100 },
        data: { selected: "product_based" }
      },
      {
        id: "condition-premium",
        type: "product-condition",
        position: { x: 500, y: 50 },
        data: { selected: "premium" }
      },
      {
        id: "condition-basic",
        type: "product-condition",
        position: { x: 500, y: 150 },
        data: { selected: "basic" }
      },
      {
        id: "welcome-premium",
        type: "welcome-email",
        position: { x: 700, y: 50 },
        data: { selected: "premium_welcome" }
      },
      {
        id: "welcome-basic",
        type: "welcome-email",
        position: { x: 700, y: 150 },
        data: { selected: "basic_welcome" }
      },
      {
        id: "delay-1",
        type: "delay-node",
        position: { x: 900, y: 50 },
        data: { selected: "3_days" }
      },
      {
        id: "delay-2",
        type: "delay-node",
        position: { x: 900, y: 150 },
        data: { selected: "2_days" }
      },
      {
        id: "followup-premium",
        type: "follow-up-email",
        position: { x: 1100, y: 50 },
        data: { selected: "value_drop" }
      },
      {
        id: "followup-basic",
        type: "follow-up-email",
        position: { x: 1100, y: 150 },
        data: { selected: "engagement_boost" }
      },
      {
        id: "merge-1",
        type: "merge-node",
        position: { x: 1300, y: 100 },
        data: { selected: "all_paths" }
      },
      {
        id: "end-1",
        type: "end-node",
        position: { x: 1500, y: 100 },
        data: { selected: "workflow_complete" }
      }
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "re-entry-1" },
      { id: "e2", source: "re-entry-1", target: "split-1" },
      { id: "e3", source: "split-1", target: "condition-premium" },
      { id: "e4", source: "split-1", target: "condition-basic" },
      { id: "e5", source: "condition-premium", target: "welcome-premium" },
      { id: "e6", source: "condition-basic", target: "welcome-basic" },
      { id: "e7", source: "welcome-premium", target: "delay-1" },
      { id: "e8", source: "welcome-basic", target: "delay-2" },
      { id: "e9", source: "delay-1", target: "followup-premium" },
      { id: "e10", source: "delay-2", target: "followup-basic" },
      { id: "e11", source: "followup-premium", target: "merge-1" },
      { id: "e12", source: "followup-basic", target: "merge-1" },
      { id: "e13", source: "merge-1", target: "end-1" }
    ]
  },

  // Newsletter Welcome Series Workflow
  newsletterWelcomeSeries: {
    name: "Newsletter Welcome Series",
    description: "Immediate welcome + value drop after 2 days",
    nodes: [
      {
        id: "trigger-1",
        type: "newsletter-trigger",
        position: { x: 100, y: 100 },
        data: { selected: "user_signs_up_newsletter" }
      },
      {
        id: "re-entry-1",
        type: "re-entry-rule",
        position: { x: 200, y: 100 },
        data: { selected: "once_only" }
      },
      {
        id: "url-config-1",
        type: "url-config",
        position: { x: 250, y: 100 },
        data: { selected: "newsletter_integration_5" }
      },
      {
        id: "welcome-1",
        type: "welcome-email",
        position: { x: 400, y: 100 },
        data: { selected: "newsletter_welcome" }
      },
      {
        id: "cta-1",
        type: "cta-config",
        position: { x: 500, y: 100 },
        data: { selected: "check_out_latest_newsletter" }
      },
      {
        id: "delay-1",
        type: "delay-node",
        position: { x: 600, y: 100 },
        data: { selected: "2_days" }
      },
      {
        id: "value-drop",
        type: "follow-up-email",
        position: { x: 800, y: 100 },
        data: { selected: "value_drop" }
      },
      {
        id: "random-delay",
        type: "random-delay-node",
        position: { x: 1000, y: 100 },
        data: { selected: "3_5_days" }
      },
      {
        id: "newsletter-1",
        type: "newsletter-email",
        position: { x: 1200, y: 100 },
        data: { selected: "weekly_newsletter" }
      },
      {
        id: "end-1",
        type: "end-node",
        position: { x: 1400, y: 100 },
        data: { selected: "workflow_complete" }
      }
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "re-entry-1" },
      { id: "e2", source: "re-entry-1", target: "url-config-1" },
      { id: "e3", source: "url-config-1", target: "welcome-1" },
      { id: "e4", source: "welcome-1", target: "cta-1" },
      { id: "e5", source: "cta-1", target: "delay-1" },
      { id: "e6", source: "delay-1", target: "value-drop" },
      { id: "e7", source: "value-drop", target: "random-delay" },
      { id: "e8", source: "random-delay", target: "newsletter-1" },
      { id: "e9", source: "newsletter-1", target: "end-1" }
    ]
  },

  // Advanced Segmentation Workflow
  advancedSegmentation: {
    name: "Advanced User Segmentation",
    description: "Complex workflow with user segmentation and multiple email types",
    nodes: [
      {
        id: "trigger-1",
        type: "subscription-trigger",
        position: { x: 100, y: 200 },
        data: { selected: "user_buys_subscription" }
      },
      {
        id: "segment-condition",
        type: "user-segment-condition",
        position: { x: 300, y: 200 },
        data: { selected: "new_user" }
      },
      {
        id: "split-1",
        type: "split-node",
        position: { x: 500, y: 200 },
        data: { selected: "user_segment_based" }
      },
      {
        id: "condition-high-value",
        type: "user-segment-condition",
        position: { x: 700, y: 100 },
        data: { selected: "high_value" }
      },
      {
        id: "condition-at-risk",
        type: "user-segment-condition",
        position: { x: 700, y: 300 },
        data: { selected: "at_risk" }
      },
      {
        id: "welcome-premium",
        type: "welcome-email",
        position: { x: 900, y: 100 },
        data: { selected: "premium_welcome" }
      },
      {
        id: "reengagement",
        type: "follow-up-email",
        position: { x: 900, y: 300 },
        data: { selected: "re_engagement" }
      },
      {
        id: "delay-premium",
        type: "delay-node",
        position: { x: 1100, y: 100 },
        data: { selected: "1_week" }
      },
      {
        id: "delay-risk",
        type: "random-delay-node",
        position: { x: 1100, y: 300 },
        data: { selected: "1_3_days" }
      },
      {
        id: "upsell",
        type: "follow-up-email",
        position: { x: 1300, y: 100 },
        data: { selected: "upsell_offer" }
      },
      {
        id: "retention",
        type: "follow-up-email",
        position: { x: 1300, y: 300 },
        data: { selected: "engagement_boost" }
      },
      {
        id: "merge-1",
        type: "merge-node",
        position: { x: 1500, y: 200 },
        data: { selected: "all_paths" }
      },
      {
        id: "end-1",
        type: "end-node",
        position: { x: 1700, y: 200 },
        data: { selected: "workflow_complete" }
      }
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "segment-condition" },
      { id: "e2", source: "segment-condition", target: "split-1" },
      { id: "e3", source: "split-1", target: "condition-high-value" },
      { id: "e4", source: "split-1", target: "condition-at-risk" },
      { id: "e5", source: "condition-high-value", target: "welcome-premium" },
      { id: "e6", source: "condition-at-risk", target: "reengagement" },
      { id: "e7", source: "welcome-premium", target: "delay-premium" },
      { id: "e8", source: "reengagement", target: "delay-risk" },
      { id: "e9", source: "delay-premium", target: "upsell" },
      { id: "e10", source: "delay-risk", target: "retention" },
      { id: "e11", source: "upsell", target: "merge-1" },
      { id: "e12", source: "retention", target: "merge-1" },
      { id: "e13", source: "merge-1", target: "end-1" }
    ]
  }
};

export default workflowTemplates;
