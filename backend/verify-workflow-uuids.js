const { createConnection } = require('typeorm');

async function verifyWorkflowUuids() {
  let connection;

  try {
    console.log('🔍 Verifying workflow UUIDs in executions and delays...\n');

    connection = await createConnection({
      type: 'postgres',
      host: 'localhost',
      port: 15432,
      username: 'postgres',
      password: 'postgres',
      database: 'workflow_me',
      entities: [],
      synchronize: false,
      logging: false
    });

    console.log('✅ Database connected successfully\n');

    // Check visual workflows
    console.log('🎨 Visual Workflows:');
    const workflows = await connection.query(`
      SELECT "id", "workflowId", "name", "createdAt"
      FROM visual_workflow
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);

    workflows.forEach(wf => {
      console.log(`   - Visual Workflow: ${wf.name}`);
      console.log(`     ID: ${wf.id}, UUID: ${wf.workflowId}`);
      console.log(`     Created: ${wf.createdAt}\n`);
    });

    // Check workflow executions
    console.log('📊 Workflow Executions:');
    const executions = await connection.query(`
      SELECT "executionId", "workflowId", "triggerType", "triggerId", "userId", "status", "createdAt"
      FROM workflow_executions
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);

    executions.forEach(exec => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exec.workflowId);
      console.log(`   - Execution: ${exec.executionId}`);
      console.log(`     Workflow ID: ${exec.workflowId} (${isUuid ? '✅ UUID' : '❌ Not UUID'})`);
      console.log(`     Trigger: ${exec.triggerType} - ${exec.triggerId}`);
      console.log(`     User: ${exec.userId}, Status: ${exec.status}`);
      console.log(`     Created: ${exec.createdAt}\n`);
    });

    // Check workflow delays
    console.log('⏰ Workflow Delays:');
    const delays = await connection.query(`
      SELECT "id", "executionId", "context", "status", "createdAt"
      FROM workflow_delays
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);

    delays.forEach(delay => {
      const context = JSON.parse(delay.context || '{}');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(context.workflowId);
      console.log(`   - Delay: ${delay.id}`);
      console.log(`     Execution ID: ${delay.executionId}`);
      console.log(`     Workflow ID in context: ${context.workflowId} (${isUuid ? '✅ UUID' : '❌ Not UUID'})`);
      console.log(`     User ID in context: ${context.userId}`);
      console.log(`     Status: ${delay.status}`);
      console.log(`     Created: ${delay.createdAt}\n`);
    });

    console.log('🎉 Workflow UUID verification completed!\n');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    if (connection) {
      await connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

verifyWorkflowUuids().catch(console.error);

