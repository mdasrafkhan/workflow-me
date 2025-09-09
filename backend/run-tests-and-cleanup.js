const { execSync } = require('child_process');
const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
const TEST_TIMEOUT = 30000;

// Helper function to make API calls
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: TEST_TIMEOUT
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// Test helper functions
function logTest(testName, result, details = '') {
  if (result) {
    console.log(`✅ ${testName} - PASSED${details ? `: ${details}` : ''}`);
  } else {
    console.log(`❌ ${testName} - FAILED${details ? `: ${details}` : ''}`);
  }
}

// Wait for service to be ready
async function waitForService(maxRetries = 30, delay = 2000) {
  console.log('🔄 Waiting for backend service to be ready...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await apiCall('GET', '/health');
      if (result.success) {
        console.log('✅ Backend service is ready');
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }

    if (i < maxRetries - 1) {
      console.log(`   Attempt ${i + 1}/${maxRetries} - waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log('❌ Backend service is not ready after maximum retries');
  return false;
}

// Run functionality tests
async function runFunctionalityTests() {
  console.log('\n🧪 Running Functionality Tests...');

  // Test 1: Workflow Creation
  const workflowData = {
    name: 'Build Test Workflow',
    nodes: [
      { id: '1', type: 'trigger', data: { label: 'Build Test Trigger' } }
    ],
    edges: []
  };

  const createResult = await apiCall('POST', '/workflow/visual-workflows', workflowData);
  logTest('Workflow Creation', createResult.success, createResult.error || `Created: ${createResult.data?.name}`);

  if (!createResult.success) {
    return false;
  }

  // Test 2: Workflow Execution
  const executionData = {
    workflow: {
      parallel: {
        trigger: { trigger: { event: 'test', execute: true } },
        branches: []
      }
    },
    context: {
      executionId: `build-test-${Date.now()}`,
      workflowId: createResult.data.id,
      triggerType: 'test',
      triggerId: 'build-test-123',
      userId: 'build-test-user',
      status: 'running',
      currentStep: 'trigger',
      context: { test_data: 'build_test' },
      history: [],
      sharedFlows: [],
      triggerData: { test: true },
      metadata: { source: 'build_test' },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };

  const executeResult = await apiCall('POST', '/workflow/execute', executionData);
  logTest('Workflow Execution', executeResult.success, executeResult.error || 'Execution completed');

  // Test 3: Node Types
  const nodeTypesResult = await apiCall('GET', '/workflow/node-types');
  logTest('Node Types Query', nodeTypesResult.success,
    nodeTypesResult.error || `Found ${Object.keys(nodeTypesResult.data?.nodeTypes || {}).length} node types`);

  return createResult.success && executeResult.success && nodeTypesResult.success;
}

// Run cleanup
async function runCleanup() {
  console.log('\n🧹 Running Test Data Cleanup...');

  const cleanupResult = await apiCall('POST', '/test/cleanup/test-data');
  logTest('Test Data Cleanup', cleanupResult.success,
    cleanupResult.error || `Cleanup result: ${JSON.stringify(cleanupResult.data)}`);

  return cleanupResult.success;
}

// Main execution
async function main() {
  console.log('🚀 Starting Build Test and Cleanup Process...');
  console.log(`📡 Testing against: ${BASE_URL}`);

  try {
    // Wait for service to be ready
    const serviceReady = await waitForService();
    if (!serviceReady) {
      console.log('❌ Cannot proceed - backend service is not ready');
      process.exit(1);
    }

    // Run functionality tests
    const testsPassed = await runFunctionalityTests();

    if (!testsPassed) {
      console.log('❌ Functionality tests failed');
      process.exit(1);
    }

    // Run cleanup
    const cleanupPassed = await runCleanup();

    if (!cleanupPassed) {
      console.log('❌ Cleanup failed');
      process.exit(1);
    }

    console.log('\n✅ All tests passed and cleanup completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
