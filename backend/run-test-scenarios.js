const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// Test execution function
async function testWorkflowScenarios() {
  console.log('🧪 Testing comprehensive workflow scenarios...\n');

  const testCases = [
    {
      product: 'united',
      description: 'Should trigger: Basic Email, Conditional Branching, Complex Nested, Multiple Email',
      expectedWorkflows: ['Basic Email Test', 'Conditional Branching Test', 'Complex Nested Workflow', 'Multiple Email Test']
    },
    {
      product: 'podcast',
      description: 'Should trigger: Delay Workflow, Long Delay',
      expectedWorkflows: ['Delay Workflow Test', 'Long Delay Test']
    },
    {
      product: 'newsletter',
      description: 'Should trigger: Empty Action (edge case)',
      expectedWorkflows: ['Empty Action Test']
    },
    {
      product: 'nonexistent_product',
      description: 'Should NOT trigger any workflows (invalid product)',
      expectedWorkflows: []
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 Testing product: ${testCase.product}`);
    console.log(`   Expected: ${testCase.description}`);

    try {
      const response = await axios.post(`${BASE_URL}/workflow/test/subscription`, {
        product: testCase.product,
        userEmail: `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}@example.com`,
        userName: `Test User ${Date.now()}`
      });

      console.log(`   ✅ Test executed: ${response.data.message}`);
      console.log(`   📝 Subscription ID: ${response.data.subscriptionId}`);

      // Wait a moment between tests
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`   ❌ Test failed: ${error.response?.data?.message || error.message}`);
    }
    console.log('');
  }
}

// Test newsletter scenario
async function testNewsletterScenario() {
  console.log('📧 Testing newsletter scenario...');

  try {
    const response = await axios.post(`${BASE_URL}/workflow/test/newsletter`, {
      email: `newsletter-test-${Date.now()}@example.com`,
      name: `Newsletter Test User ${Date.now()}`
    });

    console.log(`✅ Newsletter test executed: ${response.data.message}`);
  } catch (error) {
    console.log(`❌ Newsletter test failed: ${error.response?.data?.message || error.message}`);
  }
}

// Main execution
async function main() {
  try {
    await testWorkflowScenarios();
    await testNewsletterScenario();

    console.log('🎯 Comprehensive testing completed!');
    console.log('\n📊 Next steps:');
    console.log('   1. Check database for workflow executions');
    console.log('   2. Verify delays were created');
    console.log('   3. Check email logs');
    console.log('   4. Run: node verify-workflow-test-results.js');

  } catch (error) {
    console.error('💥 Testing failed:', error);
    process.exit(1);
  }
}

main();
