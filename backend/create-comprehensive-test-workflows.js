const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function createComprehensiveTestWorkflows() {
  console.log('🔄 Creating comprehensive test workflows for corner cases...');

  const testWorkflows = [
    // 1. Simple Email Workflow (Basic Test)
    {
      name: "Basic Email Test",
      nodes: [],
      edges: [],
      jsonLogic: {
        rule: {
          if: [
            { "product_package": "united" },
            {
              action: "send_email",
              actionName: "Basic Welcome",
              actionDetails: {
                to: "test@example.com",
                subject: "Welcome to United!",
                template: "basic_welcome"
              }
            }
          ]
        },
        event: "user_buys_subscription",
        execute: true,
        trigger: "subscription"
      }
    },

    // 2. Delay Workflow (Time-based Test)
    {
      name: "Delay Workflow Test",
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
                    template: "immediate_welcome"
                  }
                },
                {
                  delay: {
                    type: "fixed",
                    hours: 1
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

    // 3. Conditional Branching Workflow (If-Else Test)
    {
      name: "Conditional Branching Test",
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
    },

    // 4. Complex Nested Workflow (Multiple Conditions)
    {
      name: "Complex Nested Workflow",
      nodes: [],
      edges: [],
      jsonLogic: {
        rule: {
          if: [
            { "product_package": "united" },
            {
              and: [
                {
                  action: "send_email",
                  actionName: "Initial Welcome",
                  actionDetails: {
                    to: "test@example.com",
                    subject: "Welcome to United!",
                    template: "initial_welcome"
                  }
                },
                {
                  delay: {
                    type: "fixed",
                    hours: 2
                  }
                },
                {
                  action: "send_email",
                  actionName: "Feature Introduction",
                  actionDetails: {
                    to: "test@example.com",
                    subject: "Discover United Features",
                    template: "feature_intro"
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
                  actionName: "Usage Tips",
                  actionDetails: {
                    to: "test@example.com",
                    subject: "Tips for Getting Started",
                    template: "usage_tips"
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

    // 5. Newsletter Workflow (Different Trigger)
    {
      name: "Newsletter Welcome Test",
      nodes: [],
      edges: [],
      jsonLogic: {
        rule: {
          if: [
            { "newsletter_subscribed": true },
            {
              action: "send_email",
              actionName: "Newsletter Welcome",
              actionDetails: {
                to: "test@example.com",
                subject: "Welcome to our Newsletter!",
                template: "newsletter_welcome"
              }
            }
          ]
        },
        event: "newsletter_subscription",
        execute: true,
        trigger: "newsletter"
      }
    },

    // 6. Error Handling Workflow (Invalid Template)
    {
      name: "Error Handling Test",
      nodes: [],
      edges: [],
      jsonLogic: {
        rule: {
          if: [
            { "product_package": "podcast" },
            {
              action: "send_email",
              actionName: "Error Test Email",
              actionDetails: {
                to: "test@example.com",
                subject: "Error Test",
                template: "nonexistent_template"
              }
            }
          ]
        },
        event: "user_buys_subscription",
        execute: true,
        trigger: "subscription"
      }
    },

    // 7. Empty Action Workflow (Edge Case)
    {
      name: "Empty Action Test",
      nodes: [],
      edges: [],
      jsonLogic: {
        rule: {
          if: [
            { "product_package": "newsletter" },
            {
              action: "send_email",
              actionName: "Empty Action",
              actionDetails: {
                to: "",
                subject: "",
                template: ""
              }
            }
          ]
        },
        event: "user_buys_subscription",
        execute: true,
        trigger: "subscription"
      }
    },

    // 8. Multiple Email Workflow (Bulk Test)
    {
      name: "Multiple Email Test",
      nodes: [],
      edges: [],
      jsonLogic: {
        rule: {
          if: [
            { "product_package": "united" },
            {
              and: [
                {
                  action: "send_email",
                  actionName: "Email 1",
                  actionDetails: {
                    to: "test1@example.com",
                    subject: "First Email",
                    template: "email_1"
                  }
                },
                {
                  action: "send_email",
                  actionName: "Email 2",
                  actionDetails: {
                    to: "test2@example.com",
                    subject: "Second Email",
                    template: "email_2"
                  }
                },
                {
                  action: "send_email",
                  actionName: "Email 3",
                  actionDetails: {
                    to: "test3@example.com",
                    subject: "Third Email",
                    template: "email_3"
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

    // 9. Long Delay Workflow (Extended Time Test)
    {
      name: "Long Delay Test",
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
                  actionName: "Immediate",
                  actionDetails: {
                    to: "test@example.com",
                    subject: "Immediate Email",
                    template: "immediate"
                  }
                },
                {
                  delay: {
                    type: "fixed",
                    hours: 48
                  }
                },
                {
                  action: "send_email",
                  actionName: "Delayed Email",
                  actionDetails: {
                    to: "test@example.com",
                    subject: "Delayed Email",
                    template: "delayed"
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

    // 10. Invalid Product Workflow (Non-matching Condition)
    {
      name: "Invalid Product Test",
      nodes: [],
      edges: [],
      jsonLogic: {
        rule: {
          if: [
            { "product_package": "nonexistent_product" },
            {
              action: "send_email",
              actionName: "Should Not Execute",
              actionDetails: {
                to: "test@example.com",
                subject: "This should not send",
                template: "should_not_send"
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

    console.log('🎉 All comprehensive test workflows created successfully!');
    return testWorkflows.length;
  } catch (error) {
    console.error('❌ Error creating workflows:', error.response?.data || error.message);
    throw error;
  }
}

// Test execution function
async function testWorkflowScenarios() {
  console.log('\n🧪 Testing workflow scenarios...');

  const testCases = [
    { product: 'united', expectedWorkflows: ['Basic Email Test', 'Conditional Branching Test', 'Complex Nested Workflow', 'Multiple Email Test'] },
    { product: 'podcast', expectedWorkflows: ['Delay Workflow Test', 'Long Delay Test'] },
    { product: 'newsletter', expectedWorkflows: ['Empty Action Test'] },
    { product: 'nonexistent_product', expectedWorkflows: [] }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing product: ${testCase.product}`);

    try {
      const response = await axios.post(`${BASE_URL}/workflow/test/subscription`, {
        product: testCase.product,
        userEmail: `test-${Date.now()}@example.com`,
        userName: `Test User ${Date.now()}`
      });

      console.log(`✅ Test executed: ${response.data.message}`);
      console.log(`   Subscription ID: ${response.data.subscriptionId}`);
    } catch (error) {
      console.log(`❌ Test failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Main execution
async function main() {
  try {
    const workflowCount = await createComprehensiveTestWorkflows();
    console.log(`\n📊 Created ${workflowCount} test workflows`);

    // Wait a moment for the server to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testWorkflowScenarios();

    console.log('\n🎯 Comprehensive testing completed!');
  } catch (error) {
    console.error('💥 Testing failed:', error);
    process.exit(1);
  }
}

main();
