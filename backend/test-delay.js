#!/usr/bin/env node

/**
 * Test script to verify 2-day delay functionality
 * This script will:
 * 1. Create a workflow with a 2-day delay
 * 2. Trigger the workflow
 * 3. Check the database for delay records
 * 4. Show the delay calculations
 */

const axios = require('axios');
const { Client } = require('pg');

const API_BASE = 'http://localhost:4000';
const DB_CONFIG = {
  host: 'localhost',
  port: 15432,
  user: 'workflow_user',
  password: 'workflow_password',
  database: 'workflow_db'
};

async function testDelayFunctionality() {
  console.log('🧪 Testing 2-Day Delay Functionality\n');

  try {
    // Step 1: Create a workflow with 2-day delay
    console.log('1️⃣ Creating workflow with 2-day delay...');
    const workflowResponse = await axios.post(`${API_BASE}/workflow/visual-workflows`, {
      name: 'Test 2-Day Delay Workflow',
      nodes: [],
      edges: [],
      jsonLogic: {
        trigger: 'subscription',
        event: 'user_buys_subscription',
        execute: true,
        if: [
          {
            product_package: 'united'
          },
          {
            and: [
              {
                action: 'send_email',
                actionName: 'Immediate Welcome Email',
                actionDetails: {
                  template: 'immediate_welcome',
                  subject: 'Welcome to United!',
                  to: 'test@example.com'
                }
              },
              {
                delay: {
                  type: 'fixed',
                  hours: 48  // 2 days
                }
              },
              {
                action: 'send_email',
                actionName: '2-Day Follow-up Email',
                actionDetails: {
                  template: 'follow_up',
                  subject: 'How is your United experience?',
                  to: 'test@example.com'
                }
              }
            ]
          }
        ]
      }
    });

    console.log(`✅ Workflow created with ID: ${workflowResponse.data.id}`);

    // Step 2: Trigger the workflow
    console.log('\n2️⃣ Triggering workflow...');
    const triggerResponse = await axios.post(`${API_BASE}/workflow/test/subscription`, {
      userId: 1,
      product: 'united',
      status: 'active',
      amount: 9.99,
      currency: 'USD'
    });

    console.log('✅ Workflow triggered');

    // Step 3: Check database for delay records
    console.log('\n3️⃣ Checking database for delay records...');

    const client = new Client(DB_CONFIG);
    await client.connect();

    // Check workflow delays
    const delayQuery = `
      SELECT
        id,
        execution_id,
        step_id,
        delay_type,
        delay_ms,
        ROUND(delay_ms / (1000 * 60 * 60), 2) as delay_hours,
        scheduled_at,
        execute_at,
        status,
        retry_count,
        created_at
      FROM workflow_delays
      WHERE status = 'pending'
      ORDER BY execute_at;
    `;

    const delayResult = await client.query(delayQuery);

    if (delayResult.rows.length === 0) {
      console.log('❌ No delay records found in database');
    } else {
      console.log(`✅ Found ${delayResult.rows.length} delay record(s):`);
      delayResult.rows.forEach((row, index) => {
        console.log(`\n   Delay ${index + 1}:`);
        console.log(`   - ID: ${row.id}`);
        console.log(`   - Execution ID: ${row.execution_id}`);
        console.log(`   - Delay Type: ${row.delay_type}`);
        console.log(`   - Delay Hours: ${row.delay_hours}`);
        console.log(`   - Scheduled At: ${row.scheduled_at}`);
        console.log(`   - Execute At: ${row.execute_at}`);
        console.log(`   - Status: ${row.status}`);
      });
    }

    // Check delay calculation accuracy
    console.log('\n4️⃣ Verifying delay calculation accuracy...');
    const accuracyQuery = `
      SELECT
        id,
        delay_ms,
        scheduled_at,
        execute_at,
        EXTRACT(EPOCH FROM (execute_at - scheduled_at)) as calculated_delay_seconds,
        delay_ms / 1000 as expected_delay_seconds,
        CASE
          WHEN EXTRACT(EPOCH FROM (execute_at - scheduled_at)) = delay_ms / 1000
          THEN 'CORRECT'
          ELSE 'INCORRECT'
        END as calculation_status
      FROM workflow_delays
      WHERE status = 'pending';
    `;

    const accuracyResult = await client.query(accuracyQuery);

    if (accuracyResult.rows.length > 0) {
      const row = accuracyResult.rows[0];
      console.log(`   - Expected Delay: ${row.expected_delay_seconds} seconds`);
      console.log(`   - Calculated Delay: ${row.calculated_delay_seconds} seconds`);
      console.log(`   - Status: ${row.calculation_status}`);

      if (row.calculation_status === 'CORRECT') {
        console.log('✅ Delay calculation is correct!');
      } else {
        console.log('❌ Delay calculation is incorrect!');
      }
    }

    // Check workflow executions
    console.log('\n5️⃣ Checking workflow execution status...');
    const executionQuery = `
      SELECT
        id,
        execution_id,
        workflow_id,
        status,
        created_at
      FROM workflow_executions
      ORDER BY created_at DESC
      LIMIT 5;
    `;

    const executionResult = await client.query(executionQuery);
    console.log(`✅ Found ${executionResult.rows.length} execution record(s):`);
    executionResult.rows.forEach((row, index) => {
      console.log(`   - Execution ${index + 1}: ${row.execution_id} (${row.status})`);
    });

    await client.end();

    console.log('\n🎉 Delay testing completed!');
    console.log('\nTo monitor the delay execution:');
    console.log('1. Check the database periodically:');
    console.log('   psql -h localhost -p 15432 -U workflow_user -d workflow_db');
    console.log('2. Run: SELECT * FROM workflow_delays WHERE status = \'pending\';');
    console.log('3. The delay should execute after 48 hours (2 days)');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testDelayFunctionality();
