const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:4000';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

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
    testResults.passed++;
  } else {
    console.log(`❌ ${testName} - FAILED${details ? `: ${details}` : ''}`);
    testResults.failed++;
    testResults.errors.push(`${testName}: ${details}`);
  }
}

// Test 1: Framework Test - Workflow Creation and Execution
async function testFrameworkFunctionality() {
  console.log('\n🧪 Testing Framework Functionality...');

  // Create a workflow with JsonLogic
  const workflowData = {
    name: 'Framework Test Workflow',
    nodes: [
      { id: '1', type: 'trigger', data: { label: 'Test Trigger' } },
      { id: '2', type: 'action', data: { label: 'Test Action' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' }
    ],
    jsonLogic: {
      rule: {
        parallel: {
          trigger: {
            trigger: {
              event: 'test_event',
              execute: true
            }
          },
          branches: [{
            and: [{
              send_email: {
                data: { subject: 'Test Email', templateId: 'test_template' },
                name: 'Test Email Action',
                execute: true,
                description: 'Send test email'
              }
            }]
          }]
        }
      }
    }
  };

  const createResult = await apiCall('POST', '/workflow/visual-workflows', workflowData);
  logTest('Workflow Creation', createResult.success, createResult.error || `Created workflow: ${createResult.data?.name}`);

  if (!createResult.success) {
    return null;
  }

  const workflowId = createResult.data.id;
  console.log(`   Created workflow ID: ${workflowId}`);

  // Test workflow execution
  const executionData = {
    workflow: workflowData.jsonLogic.rule,
    context: {
      executionId: `test-exec-${Date.now()}`,
      workflowId: workflowId,
      triggerType: 'test',
      triggerId: 'test-trigger-123',
      userId: 'test-user-1',
      status: 'running',
      currentStep: 'trigger',
      context: { test_data: 'value' },
      history: [],
      sharedFlows: [],
      triggerData: { test: true },
      metadata: { source: 'test' },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };

  const executeResult = await apiCall('POST', '/workflow/execute', executionData);
  logTest('Workflow Execution', executeResult.success, executeResult.error || `Execution result: ${executeResult.data?.result?.status}`);

  return workflowId;
}

// Test 2: UI Integration Test - CRUD Operations
async function testUIIntegration(workflowId) {
  console.log('\n🖥️  Testing UI Integration...');

  // Test workflow retrieval
  const getResult = await apiCall('GET', '/workflow/visual-workflows');
  logTest('Workflow Retrieval', getResult.success && getResult.data.length > 0,
    getResult.error || `Retrieved ${getResult.data.length} workflows`);

  // Test specific workflow retrieval
  if (workflowId) {
    const getSpecificResult = await apiCall('GET', `/workflow/visual-workflows/${workflowId}`);
    logTest('Specific Workflow Retrieval', getSpecificResult.success,
      getSpecificResult.error || `Retrieved workflow: ${getSpecificResult.data?.name}`);
  }

  // Test workflow update
  if (workflowId) {
    const updateData = {
      name: 'Updated Framework Test Workflow',
      nodes: [
        { id: '1', type: 'trigger', data: { label: 'Updated Trigger' } },
        { id: '2', type: 'action', data: { label: 'Updated Action' } }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' }
      ]
    };

    const updateResult = await apiCall('POST', '/workflow/visual-workflows', updateData);
    logTest('Workflow Update', updateResult.success,
      updateResult.error || `Updated workflow: ${updateResult.data?.name}`);
  }
}

// Test 3: Node Types Test - Different Node Functionalities
async function testNodeTypes() {
  console.log('\n🔧 Testing Node Types...');

  // Test trigger node
  const triggerWorkflow = {
    parallel: {
      trigger: {
        trigger: {
          event: 'user_buys_subscription',
          execute: true,
          reEntryRule: 'once_per_product'
        }
      },
      branches: []
    }
  };

  const triggerResult = await apiCall('POST', '/workflow/execute', {
    workflow: triggerWorkflow,
    context: {
      executionId: `trigger-test-${Date.now()}`,
      workflowId: 'trigger-workflow',
      triggerType: 'subscription',
      triggerId: 'sub-123',
      userId: 'user-1',
      status: 'running',
      currentStep: 'trigger',
      context: { product_package: 'premium' },
      history: [],
      sharedFlows: [],
      triggerData: { subscriptionId: 'sub-123' },
      metadata: { source: 'subscription' },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  logTest('Trigger Node', triggerResult.success, triggerResult.error || 'Trigger executed');

  // Test action node (email)
  const actionWorkflow = {
    parallel: {
      trigger: { trigger: { event: 'test', execute: true } },
      branches: [{
        and: [{
          send_email: {
            data: { subject: 'Test Email', templateId: 'test_template' },
            name: 'Test Email Action',
            execute: true,
            description: 'Send test email'
          }
        }]
      }]
    }
  };

  const actionResult = await apiCall('POST', '/workflow/execute', {
    workflow: actionWorkflow,
    context: {
      executionId: `action-test-${Date.now()}`,
      workflowId: 'action-workflow',
      triggerType: 'test',
      triggerId: 'test-123',
      userId: 'user-1',
      status: 'running',
      currentStep: 'send_email',
      context: { email: 'test@example.com' },
      history: [],
      sharedFlows: [],
      triggerData: { test: true },
      metadata: { source: 'test' },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  logTest('Action Node (Email)', actionResult.success, actionResult.error || 'Email action executed');

  // Test condition node
  const conditionWorkflow = {
    parallel: {
      trigger: { trigger: { event: 'test', execute: true } },
      branches: [{
        and: [
          { product_package: 'premium' },
          { send_email: {
            data: { subject: 'Premium Email', templateId: 'premium_template' },
            name: 'Premium Email Action',
            execute: true,
            description: 'Send premium email'
          }}
        ]
      }]
    }
  };

  const conditionResult = await apiCall('POST', '/workflow/execute', {
    workflow: conditionWorkflow,
    context: {
      executionId: `condition-test-${Date.now()}`,
      workflowId: 'condition-workflow',
      triggerType: 'test',
      triggerId: 'test-123',
      userId: 'user-1',
      status: 'running',
      currentStep: 'condition_check',
      context: { product_package: 'premium' },
      history: [],
      sharedFlows: [],
      triggerData: { test: true },
      metadata: { source: 'test' },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  logTest('Condition Node', conditionResult.success, conditionResult.error || 'Condition executed');

  // Test delay node
  const delayWorkflow = {
    parallel: {
      trigger: { trigger: { event: 'test', execute: true } },
      branches: [{
        and: [
          { delay: { type: '2_days', execute: true } },
          { send_email: {
            data: { subject: 'Delayed Email', templateId: 'delayed_template' },
            name: 'Delayed Email Action',
            execute: true,
            description: 'Send delayed email'
          }}
        ]
      }]
    }
  };

  const delayResult = await apiCall('POST', '/workflow/execute', {
    workflow: delayWorkflow,
    context: {
      executionId: `delay-test-${Date.now()}`,
      workflowId: 'delay-workflow',
      triggerType: 'test',
      triggerId: 'test-123',
      userId: 'user-1',
      status: 'running',
      currentStep: 'delay',
      context: { test: true },
      history: [],
      sharedFlows: [],
      triggerData: { test: true },
      metadata: { source: 'test' },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  logTest('Delay Node', delayResult.success, delayResult.error || 'Delay executed');
}

// Test 4: Cleanup Test
async function testCleanup() {
  console.log('\n🧹 Testing Cleanup Functionality...');

  // Create test workflows
  const testWorkflows = [
    { name: 'Test Workflow 1', nodes: [{ id: '1', type: 'trigger', data: { label: 'Test 1' } }], edges: [] },
    { name: 'Demo Workflow', nodes: [{ id: '1', type: 'trigger', data: { label: 'Demo' } }], edges: [] },
    { name: 'User Created Workflow', nodes: [{ id: '1', type: 'trigger', data: { label: 'User' } }], edges: [] }
  ];

  const createdWorkflows = [];
  for (const workflow of testWorkflows) {
    const result = await apiCall('POST', '/workflow/visual-workflows', workflow);
    if (result.success) {
      createdWorkflows.push(result.data.id);
      console.log(`   Created test workflow: ${workflow.name}`);
    }
  }

  // Test cleanup
  const cleanupResult = await apiCall('POST', '/test/cleanup/test-data');
  logTest('Test Data Cleanup', cleanupResult.success,
    cleanupResult.error || `Cleanup result: ${JSON.stringify(cleanupResult.data)}`);

  // Verify cleanup worked
  const getResult = await apiCall('GET', '/workflow/visual-workflows');
  const remainingWorkflows = getResult.data || [];
  const userWorkflows = remainingWorkflows.filter(w => w.name === 'User Created Workflow');

  logTest('User Data Preservation', userWorkflows.length > 0,
    `Preserved ${userWorkflows.length} user workflows, cleaned ${createdWorkflows.length - remainingWorkflows.length} test workflows`);
}

// Test 5: Database State Test
async function testDatabaseState() {
  console.log('\n💾 Testing Database State...');

  // Test workflow executions
  const executionsResult = await apiCall('GET', '/workflow/executions');
  logTest('Workflow Executions Query', executionsResult.success,
    executionsResult.error || `Found ${executionsResult.data?.length || 0} executions`);

  // Test node types
  const nodeTypesResult = await apiCall('GET', '/workflow/node-types');
  logTest('Node Types Query', nodeTypesResult.success,
    nodeTypesResult.error || `Found ${Object.keys(nodeTypesResult.data?.nodeTypes || {}).length} node types`);
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Comprehensive System Tests...');
  console.log(`📡 Testing against: ${BASE_URL}`);
  console.log(`⏱️  Timeout: ${TEST_TIMEOUT}ms`);

  try {
    // Test 1: Framework functionality
    const workflowId = await testFrameworkFunctionality();

    // Test 2: UI integration
    await testUIIntegration(workflowId);

    // Test 3: Node types
    await testNodeTypes();

    // Test 4: Cleanup
    await testCleanup();

    // Test 5: Database state
    await testDatabaseState();

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    testResults.failed++;
    testResults.errors.push(`Test execution failed: ${error.message}`);
  }

  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n🔍 Errors:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
