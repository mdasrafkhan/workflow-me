const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 15432,
  user: 'workflow_user',
  password: 'workflow_password',
  database: 'workflow_db'
});

async function verifyWorkflowTestResults() {
  console.log('🔍 Verifying workflow test results...\n');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Check workflows created
    console.log('📋 WORKFLOWS CREATED:');
    const workflows = await client.query(`
      SELECT id, name, "createdAt"
      FROM visual_workflow
      WHERE name LIKE '%Test%'
      ORDER BY "createdAt" DESC
    `);

    workflows.rows.forEach(workflow => {
      console.log(`   ID ${workflow.id}: ${workflow.name} (${workflow.createdAt})`);
    });
    console.log(`   Total: ${workflows.rows.length} test workflows\n`);

    // 2. Check workflow executions
    console.log('🚀 WORKFLOW EXECUTIONS:');
    const executions = await client.query(`
      SELECT
        we.id,
        we."workflowId",
        vw.name as workflow_name,
        we.status,
        we."createdAt"
      FROM workflow_executions we
      JOIN visual_workflow vw ON we."workflowId" = vw.id::text
      WHERE vw.name LIKE '%Test%'
      ORDER BY we."createdAt" DESC
      LIMIT 10
    `);

    executions.rows.forEach(execution => {
      console.log(`   Execution ${execution.id}: ${execution.workflow_name} - ${execution.status} (${execution.createdAt})`);
    });
    console.log(`   Total: ${executions.rows.length} executions\n`);

    // 3. Check delays created
    console.log('⏰ WORKFLOW DELAYS:');
    const delays = await client.query(`
      SELECT
        wd.id,
        wd."executionId",
        wd."stepId",
        wd."delayType",
        wd.status,
        wd."scheduledAt",
        wd."executeAt",
        wd."createdAt"
      FROM workflow_delays wd
      ORDER BY wd."createdAt" DESC
      LIMIT 10
    `);

    if (delays.rows.length > 0) {
      delays.rows.forEach(delay => {
        console.log(`   Delay ${delay.id}: ${delay.delayType} - ${delay.status} (Execute: ${delay.executeAt})`);
      });
    } else {
      console.log('   No delays found');
    }
    console.log(`   Total: ${delays.rows.length} delays\n`);

    // 4. Check email logs
    console.log('📧 EMAIL LOGS:');
    const emails = await client.query(`
      SELECT
        el.id,
        el."executionId",
        el."to",
        el.subject,
        el."templateId",
        el.status,
        el."createdAt"
      FROM email_logs el
      ORDER BY el."createdAt" DESC
      LIMIT 10
    `);

    if (emails.rows.length > 0) {
      emails.rows.forEach(email => {
        console.log(`   Email ${email.id}: ${email.to} - "${email.subject}" (${email.status})`);
      });
    } else {
      console.log('   No email logs found');
    }
    console.log(`   Total: ${emails.rows.length} emails\n`);

    // 5. Check dummy subscriptions created
    console.log('👥 DUMMY SUBSCRIPTIONS:');
    const subscriptions = await client.query(`
      SELECT
        ds.id,
        ds.product,
        ds.status,
        ds."workflowProcessed",
        du.email,
        ds."createdAt"
      FROM dummy_subscriptions ds
      JOIN dummy_users du ON ds."userId" = du.id
      ORDER BY ds."createdAt" DESC
      LIMIT 10
    `);

    subscriptions.rows.forEach(subscription => {
      console.log(`   Subscription ${subscription.id}: ${subscription.product} - ${subscription.email} (Processed: ${subscription.workflowProcessed})`);
    });
    console.log(`   Total: ${subscriptions.rows.length} subscriptions\n`);

    // 6. Summary statistics
    console.log('📊 SUMMARY STATISTICS:');
    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM visual_workflow WHERE name LIKE '%Test%') as test_workflows,
        (SELECT COUNT(*) FROM workflow_executions) as total_executions,
        (SELECT COUNT(*) FROM workflow_delays) as total_delays,
        (SELECT COUNT(*) FROM email_logs) as total_emails,
        (SELECT COUNT(*) FROM dummy_subscriptions) as total_subscriptions
    `);

    const stat = stats.rows[0];
    console.log(`   Test Workflows: ${stat.test_workflows}`);
    console.log(`   Total Executions: ${stat.total_executions}`);
    console.log(`   Total Delays: ${stat.total_delays}`);
    console.log(`   Total Emails: ${stat.total_emails}`);
    console.log(`   Total Subscriptions: ${stat.total_subscriptions}\n`);

    // 7. Check for errors
    console.log('❌ ERROR ANALYSIS:');
    const errorExecutions = await client.query(`
      SELECT
        we.id,
        vw.name as workflow_name,
        we.status,
        we.error,
        we."createdAt"
      FROM workflow_executions we
      JOIN visual_workflow vw ON we."workflowId" = vw.id::text
      WHERE we.status = 'failed' OR we.error IS NOT NULL
      ORDER BY we."createdAt" DESC
      LIMIT 5
    `);

    if (errorExecutions.rows.length > 0) {
      errorExecutions.rows.forEach(error => {
        console.log(`   Error in ${error.workflow_name}: ${error.error || 'Unknown error'}`);
      });
    } else {
      console.log('   No errors found');
    }
    console.log(`   Total errors: ${errorExecutions.rows.length}\n`);

  } catch (error) {
    console.error('❌ Database verification failed:', error);
  } finally {
    await client.end();
  }
}

verifyWorkflowTestResults();
