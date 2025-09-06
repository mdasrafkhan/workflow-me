const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function createTestWorkflows() {
  console.log('🔄 Creating test workflows...');

  const testWorkflows = [
    {
      name: "Simple Email Test Workflow",
      nodes: [],
      edges: [],
      jsonLogic: {
        rule: {
          if: [
            { "product_package": "united" },
            {
              action: "send_email",
              actionName: "Welcome Email",
              actionDetails: {
                to: "test@example.com",
                subject: "Welcome to United!",
                template: "welcome_united"
              }
            }
          ]
        },
        event: "user_buys_subscription",
        execute: true,
        trigger: "subscription"
      }
    },
    {
      name: "Delay Test Workflow",
      nodes: [],
      edges: [],
      jsonLogic: {
        rule: {
          if: [
            { "product_package": "podcast" },
            {
              and: [
                {
                  action: "send_email",
                  actionName: "Immediate Welcome",
                  actionDetails: {
                    to: "test@example.com",
                    subject: "Welcome to Podcast!",
                    template: "welcome_podcast"
                  }
                },
                {
                  delay: {
                    type: "fixed",
                    hours: 24
                  }
                },
                {
                  action: "send_email",
                  actionName: "Follow-up Email",
                  actionDetails: {
                    to: "test@example.com",
                    subject: "How's your podcast experience?",
                    template: "followup_podcast"
                  }
                }
              ]
            }
          ]
        },
        event: "user_buys_subscription",
        execute: true,
        trigger: "subscription"
      }
    },
    {
      name: "Conditional Workflow",
      nodes: [],
      edges: [],
      jsonLogic: {
        rule: {
          if: [
            { "product_package": "united" },
            {
              action: "send_email",
              actionName: "United Welcome",
              actionDetails: {
                to: "test@example.com",
                subject: "Welcome to United Premium!",
                template: "united_premium_welcome"
              }
            },
            {
              action: "send_email",
              actionName: "Generic Welcome",
              actionDetails: {
                to: "test@example.com",
                subject: "Welcome to our service!",
                template: "generic_welcome"
              }
            }
          ]
        },
        event: "user_buys_subscription",
        execute: true,
        trigger: "subscription"
      }
    }
  ];

  try {
    for (const workflow of testWorkflows) {
      console.log(`Creating workflow: ${workflow.name}`);
      const response = await axios.post(`${BASE_URL}/workflow/visual-workflows`, workflow);
      console.log(`✅ Created workflow with ID: ${response.data.id}`);
    }

    console.log('🎉 All test workflows created successfully!');
  } catch (error) {
    console.error('❌ Error creating workflows:', error.response?.data || error.message);
  }
}

createTestWorkflows();
