const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 15432,
  user: 'workflow_user',
  password: 'workflow_password',
  database: 'workflow_db'
});

async function testDelayFix() {
  console.log('🧪 Testing Delay Fix...\n');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if workflow_delays table exists and has data
    console.log('📊 Checking workflow_delays table:');
    const delays = await client.query(`
      SELECT
        id,
        "executionId",
        "stepId",
        "delayType",
        "delayMs",
        status,
        "scheduledAt",
        "executeAt",
        "createdAt"
      FROM workflow_delays
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    console.log(`Found ${delays.rows.length} delay records:`);
    delays.rows.forEach((delay, index) => {
      console.log(`   ${index + 1}. ID: ${delay.id}`);
      console.log(`      Execution: ${delay.executionId}`);
      console.log(`      Type: ${delay.delayType}`);
      console.log(`      Duration: ${delay.delayMs / (1000 * 60 * 60)} hours`);
      console.log(`      Status: ${delay.status}`);
      console.log(`      Execute At: ${delay.executeAt}`);
      console.log(`      Created: ${delay.createdAt}`);
      console.log('');
    });

    // Check table structure
    console.log('🔍 Checking table structure:');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'workflow_delays'
      ORDER BY ordinal_position
    `);

    console.log('Table columns:');
    tableInfo.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check if there are any workflows with delays
    console.log('\n🔍 Checking for workflows with delay nodes:');
    const workflowsWithDelays = await client.query(`
      SELECT
        vw.id,
        vw.name,
        vw."jsonLogicRule"
      FROM visual_workflow vw
      WHERE vw."jsonLogicRule"::text LIKE '%delay%'
      LIMIT 5
    `);

    console.log(`Found ${workflowsWithDelays.rows.length} workflows with delay nodes:`);
    workflowsWithDelays.rows.forEach((workflow, index) => {
      console.log(`   ${index + 1}. ID: ${workflow.id}, Name: ${workflow.name}`);
      try {
        const rule = JSON.parse(workflow.jsonLogicRule);
        console.log(`      Rule structure: ${JSON.stringify(rule, null, 2).substring(0, 200)}...`);
      } catch (e) {
        console.log(`      Rule (raw): ${workflow.jsonLogicRule.substring(0, 200)}...`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testDelayFix();
