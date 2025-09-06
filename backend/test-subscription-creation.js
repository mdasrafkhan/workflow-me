const axios = require('axios');

async function testSubscriptionCreation() {
  try {
    console.log('🔍 Testing subscription creation...\n');

    // Test subscription creation directly
    console.log('1. Testing subscription creation...');
    try {
      const response = await axios.post('http://localhost:4000/workflow/test/subscription', {
        product: 'united',
        userEmail: 'test@example.com',
        userName: 'Test User'
      });
      console.log('✅ Subscription workflow executed successfully:', response.data);
    } catch (error) {
      console.log('❌ Subscription workflow failed:');
      console.log('Status:', error.response?.status);
      console.log('Message:', error.response?.data?.message);
      console.log('Full error:', error.response?.data);

      // Try to get more details from the error
      if (error.response?.data?.message === 'Internal server error') {
        console.log('\n🔍 This is likely a server-side error. Check backend logs.');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSubscriptionCreation();
