/**
 * Simple script to create test subscriptions for workflow testing
 * Run this after starting the backend server
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function createTestSubscriptions() {
  console.log('🚀 Creating test subscriptions for workflow testing...\n');

  try {
    // Create multiple test subscriptions at once
    console.log('Creating 5 test subscriptions...');
    const response = await axios.post(`${BASE_URL}/workflow/test/create-subscriptions`, {
      count: 5,
      products: ['united', 'podcast', 'premium', 'newsletter', 'united']
    });

    console.log('✅ Response:', response.data.message);
    console.log('📋 Created subscriptions:');
    response.data.subscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.product} - ${sub.subscriptionId} (${sub.userEmail})`);
    });

    console.log('\n🎉 Test subscriptions created! You can now test your workflow.');
    console.log('💡 Check the workflow execution logs to see if your workflow is triggered.');

  } catch (error) {
    console.error('❌ Error creating test subscriptions:', error.response?.data || error.message);
  }
}

// Run the script
createTestSubscriptions().then(() => {
  console.log('\n✅ Script completed!');
}).catch(error => {
  console.error('💥 Script error:', error.message);
});
