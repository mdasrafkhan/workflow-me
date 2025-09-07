import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WorkflowOrchestrationEngine } from './workflow/execution/workflow-orchestration-engine';
import { DummyDataService } from './services/dummy-data.service';
import { EmailService } from './services/email.service';
import { Repository } from 'typeorm';
import { WorkflowExecution } from './database/entities/workflow-execution.entity';
import { WorkflowDelay } from './database/entities/workflow-delay.entity';
import { EmailLog } from './database/entities/email-log.entity';
import { VisualWorkflow } from './workflow/visual-workflow.entity';
import { JsonLogicRule } from './workflow/json-logic-rule.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function clearDatabaseAndTest() {
  console.log('🧹 Clearing database and testing workflow execution...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  // Get repositories
  const executionRepo = app.get<Repository<WorkflowExecution>>(getRepositoryToken(WorkflowExecution));
  const delayRepo = app.get<Repository<WorkflowDelay>>(getRepositoryToken(WorkflowDelay));
  const emailRepo = app.get<Repository<EmailLog>>(getRepositoryToken(EmailLog));

  const workflowEngine = app.get(WorkflowOrchestrationEngine);
  const dummyDataService = app.get(DummyDataService);
  const emailService = app.get(EmailService);

  try {
    // 1. Clear ONLY test data (with test- prefix)
    console.log('🗑️  Clearing test data only...');

    // Clear test data in order to respect foreign key constraints
    await emailRepo
      .createQueryBuilder()
      .delete()
      .where("to LIKE :pattern", { pattern: 'test-%' })
      .execute();
    console.log('✅ Cleared test email logs');

    await delayRepo
      .createQueryBuilder()
      .delete()
      .where("executionId LIKE :pattern", { pattern: 'test-%' })
      .execute();
    console.log('✅ Cleared test workflow delays');

    await executionRepo
      .createQueryBuilder()
      .delete()
      .where("executionId LIKE :pattern", { pattern: 'test-%' })
      .execute();
    console.log('✅ Cleared test workflow executions');

    // Clear test visual workflows and workflows using DELETE to avoid foreign key constraints
    const visualWorkflowRepo = app.get<Repository<VisualWorkflow>>(getRepositoryToken(VisualWorkflow));
    await visualWorkflowRepo
      .createQueryBuilder()
      .delete()
      .where("name LIKE :pattern", { pattern: 'test-%' })
      .execute();
    console.log('✅ Cleared test visual workflows');

    // Clear test workflows (JsonLogicRule entity with table name 'workflow')
    const workflowRepo = app.get<Repository<JsonLogicRule>>(getRepositoryToken(JsonLogicRule));
    await workflowRepo
      .createQueryBuilder()
      .delete()
      .where("rule::text LIKE :pattern", { pattern: '%test-%' })
      .execute();
    console.log('✅ Cleared test workflows');

    // Clear test dummy data in correct order (children first, then parents) using DELETE
    await dummyDataService.subscriptionRepository
      .createQueryBuilder()
      .delete()
      .where("product LIKE :pattern", { pattern: 'test-%' })
      .execute();
    console.log('✅ Cleared test subscriptions');

    await dummyDataService.newsletterRepository
      .createQueryBuilder()
      .delete()
      .where("email LIKE :pattern", { pattern: 'test-%' })
      .execute();
    console.log('✅ Cleared test newsletters');

    await dummyDataService.subscriptionTypeRepository
      .createQueryBuilder()
      .delete()
      .where("name LIKE :pattern", { pattern: 'test-%' })
      .execute();
    console.log('✅ Cleared test subscription types');

    await dummyDataService.userRepository
      .createQueryBuilder()
      .delete()
      .where("email LIKE :pattern", { pattern: 'test-%' })
      .execute();
    console.log('✅ Cleared test users');

    console.log('\n📊 Test data cleared successfully!\n');

    // 2. Test 1: Simple subscription workflow
    console.log('🧪 Test 1: Simple Subscription Workflow');
    console.log('=====================================');

    const user1 = await dummyDataService.userRepository.save({
      email: 'test.simple@example.com',
      name: 'Test Simple User',
      phoneNumber: '+1234567890',
      isActive: true,
      timezone: 'UTC'
    });

    const subscription1 = await dummyDataService.subscriptionRepository.save({
      userId: user1.id,
      product: 'united',
      status: 'active',
      amount: 9.99,
      currency: 'USD',
      workflowProcessed: false,
      createdAt: new Date()
    });

    console.log(`✅ Created user: ${user1.name} (${user1.email})`);
    console.log(`✅ Created subscription: ${subscription1.product} (${subscription1.id})`);

    // Execute workflow
    const result1 = await workflowEngine.executeSubscriptionWorkflow(subscription1);
    console.log(`✅ Workflow executed: ${result1.success ? 'SUCCESS' : 'FAILED'}`);
    if (!result1.success) {
      console.log(`❌ Error: ${result1.error}`);
    }

    // 3. Test 2: Newsletter workflow
    console.log('\n🧪 Test 2: Newsletter Workflow');
    console.log('==============================');

    const user2 = await dummyDataService.userRepository.save({
      email: 'test.newsletter@example.com',
      name: 'Test Newsletter User',
      phoneNumber: '+1234567891',
      isActive: true,
      timezone: 'UTC'
    });

    const newsletter = await dummyDataService.newsletterRepository.save({
      userId: user2.id,
      email: user2.email,
      status: 'subscribed',
      emailVerified: true,
      source: 'website',
      workflowProcessed: false,
      subscribedAt: new Date()
    });

    console.log(`✅ Created user: ${user2.name} (${user2.email})`);
    console.log(`✅ Created newsletter: ${newsletter.email} (${newsletter.id})`);

    // Execute workflow
    const result2 = await workflowEngine.executeNewsletterWorkflow(newsletter);
    console.log(`✅ Workflow executed: ${result2.success ? 'SUCCESS' : 'FAILED'}`);
    if (!result2.success) {
      console.log(`❌ Error: ${result2.error}`);
    }

    // 4. Check execution states
    console.log('\n📋 Test 3: Checking Execution States');
    console.log('====================================');

    const executions = await workflowEngine.getAllExecutions();
    console.log(`📊 Total executions: ${executions.length}`);

    for (const execution of executions) {
      console.log(`\n🔍 Execution ${execution.id}:`);
      console.log(`   Status: ${execution.status}`);
      console.log(`   Workflow ID: ${execution.workflowId}`);
      console.log(`   Trigger Type: ${execution.triggerType}`);
      console.log(`   Created: ${execution.createdAt}`);
      console.log(`   Updated: ${execution.updatedAt}`);

      if (execution.state && execution.state.history) {
        console.log(`   History: ${execution.state.history.length} steps`);
        execution.state.history.forEach((step, index) => {
          console.log(`     ${index + 1}. ${step.stepId}: ${step.state} (${step.timestamp})`);
        });
      }
    }

    // 5. Check delays
    console.log('\n⏰ Test 4: Checking Delays');
    console.log('==========================');

    const delays = await delayRepo.find();
    console.log(`📊 Total delays: ${delays.length}`);

    for (const delay of delays) {
      console.log(`\n🔍 Delay ${delay.id}:`);
      console.log(`   Status: ${delay.status}`);
      console.log(`   Execute At: ${delay.executeAt}`);
      console.log(`   Execution ID: ${delay.executionId}`);
      console.log(`   Created: ${delay.createdAt}`);
      if (delay.error) {
        console.log(`   Error: ${delay.error}`);
      }
    }

    // 6. Check email logs
    console.log('\n📧 Test 5: Checking Email Logs');
    console.log('==============================');

    const emails = await emailRepo.find();
    console.log(`📊 Total emails: ${emails.length}`);

    for (const email of emails) {
      console.log(`\n🔍 Email ${email.id}:`);
      console.log(`   To: ${email.to}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   Status: ${email.status}`);
      console.log(`   Template: ${email.templateId}`);
      console.log(`   Sent: ${email.sentAt}`);
    }

    // 7. Test delay processing
    console.log('\n⏰ Test 6: Testing Delay Processing');
    console.log('===================================');

    if (delays.length > 0) {
      console.log('🔄 Processing delayed executions...');
      await workflowEngine.processDelayedExecutions();
      console.log('✅ Delay processing completed');
    } else {
      console.log('ℹ️  No delays to process');
    }

    // 8. Final status check
    console.log('\n📊 Final Status Check');
    console.log('=====================');

    const finalExecutions = await workflowEngine.getAllExecutions();
    const finalDelays = await delayRepo.find();
    const finalEmails = await emailRepo.find();

    console.log(`📈 Final Statistics:`);
    console.log(`   Executions: ${finalExecutions.length}`);
    console.log(`   Delays: ${finalDelays.length}`);
    console.log(`   Emails: ${finalEmails.length}`);

    // Check execution statuses
    const statusCounts = finalExecutions.reduce((acc, exec) => {
      acc[exec.status] = (acc[exec.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`\n📊 Execution Status Breakdown:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n🎉 Database clearing and testing completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  clearDatabaseAndTest().catch(console.error);
}

export { clearDatabaseAndTest };
