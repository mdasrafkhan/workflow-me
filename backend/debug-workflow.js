const axios = require('axios');

async function debugWorkflow() {
  try {
    console.log('🔍 Testing workflow execution step by step...\n');

    // Test 1: Check if backend is healthy
    console.log('1. Testing backend health...');
    const healthResponse = await axios.get('http://localhost:4000/health');
    console.log('✅ Backend is healthy:', healthResponse.data.status);
    console.log('');

    // Test 2: Check if workflows are accessible
    console.log('2. Testing workflow retrieval...');
    const workflowsResponse = await axios.get('http://localhost:4000/workflow/visual-workflows');
    console.log(`✅ Found ${workflowsResponse.data.length} workflows`);

    const workflow = workflowsResponse.data[0];
    console.log(`✅ First workflow: ${workflow.name} (ID: ${workflow.id})`);
    console.log(`✅ Has JsonLogic rule: ${!!workflow.jsonLogicRule}`);
    console.log('');

    // Test 3: Test subscription creation
    console.log('3. Testing subscription creation...');
    try {
      const subscriptionResponse = await axios.post('http://localhost:4000/workflow/test/subscription', {
        product: 'united',
        userEmail: 'test@example.com',
        userName: 'Test User'
      });
      console.log('✅ Subscription workflow executed successfully:', subscriptionResponse.data);
    } catch (error) {
      console.log('❌ Subscription workflow failed:');
      console.log('Status:', error.response?.status);
      console.log('Message:', error.response?.data?.message);
      console.log('Full error:', error.response?.data);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugWorkflow();
