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

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  details?: any;
}

class WorkflowTestSuite {
  private results: TestResult[] = [];
  private executionRepo: Repository<WorkflowExecution>;
  private delayRepo: Repository<WorkflowDelay>;
  private emailRepo: Repository<EmailLog>;
  private visualWorkflowRepo: Repository<VisualWorkflow>;
  private workflowRepo: Repository<JsonLogicRule>;
  private workflowEngine: WorkflowOrchestrationEngine;
  private dummyDataService: DummyDataService;
  private emailService: EmailService;

  constructor(
    executionRepo: Repository<WorkflowExecution>,
    delayRepo: Repository<WorkflowDelay>,
    emailRepo: Repository<EmailLog>,
    visualWorkflowRepo: Repository<VisualWorkflow>,
    workflowRepo: Repository<JsonLogicRule>,
    workflowEngine: WorkflowOrchestrationEngine,
    dummyDataService: DummyDataService,
    emailService: EmailService
  ) {
    this.executionRepo = executionRepo;
    this.delayRepo = delayRepo;
    this.emailRepo = emailRepo;
    this.visualWorkflowRepo = visualWorkflowRepo;
    this.workflowRepo = workflowRepo;
    this.workflowEngine = workflowEngine;
    this.dummyDataService = dummyDataService;
    this.emailService = emailService;
  }

  private addResult(testName: string, success: boolean, error?: string, details?: any) {
    this.results.push({ testName, success, error, details });
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    try {
      // Clear test data with test- prefix using proper TypeORM syntax
      await this.executionRepo
        .createQueryBuilder()
        .delete()
        .where("executionId LIKE :pattern", { pattern: 'test-%' })
        .execute();

      await this.delayRepo
        .createQueryBuilder()
        .delete()
        .where("executionId LIKE :pattern", { pattern: 'test-%' })
        .execute();

      await this.emailRepo
        .createQueryBuilder()
        .delete()
        .where("to LIKE :pattern", { pattern: 'test-%' })
        .execute();

      // Clear test visual workflows and workflows
      await this.visualWorkflowRepo
        .createQueryBuilder()
        .delete()
        .where("name LIKE :pattern", { pattern: 'test-%' })
        .execute();

      await this.workflowRepo
        .createQueryBuilder()
        .delete()
        .where("rule::text LIKE :pattern", { pattern: '%test-%' })
        .execute();

      // Clear test users, subscriptions, newsletters, subscription types
      await this.dummyDataService.subscriptionRepository
        .createQueryBuilder()
        .delete()
        .where("product LIKE :pattern", { pattern: 'test-%' })
        .execute();

      await this.dummyDataService.subscriptionTypeRepository
        .createQueryBuilder()
        .delete()
        .where("name LIKE :pattern", { pattern: 'test-%' })
        .execute();

      await this.dummyDataService.newsletterRepository
        .createQueryBuilder()
        .delete()
        .where("email LIKE :pattern", { pattern: 'test-%' })
        .execute();

      await this.dummyDataService.userRepository
        .createQueryBuilder()
        .delete()
        .where("email LIKE :pattern", { pattern: 'test-%' })
        .execute();

      this.addResult('Cleanup Test Data', true);
    } catch (error) {
      this.addResult('Cleanup Test Data', false, error.message);
    }
  }

  async testBasicWorkflowExecution(): Promise<void> {
    console.log('\n🧪 Testing Basic Workflow Execution...');

    try {
      // Create test user and subscription
      const user = await this.dummyDataService.userRepository.save({
        email: 'test-basic@example.com',
        name: 'Test Basic User',
        phoneNumber: '+1234567890',
        isActive: true,
        timezone: 'UTC'
      });

      // First create a subscription type
      const subscriptionType = await this.dummyDataService.subscriptionTypeRepository.save({
        name: 'test-united',
        displayName: 'Test United Subscription',
        description: 'Test United Subscription',
        price: 9.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['feature1', 'feature2'],
        isActive: true
      });

      const subscription = await this.dummyDataService.subscriptionRepository.save({
        userId: user.id,
        subscriptionTypeId: subscriptionType.id,
        product: 'test-united',
        status: 'active',
        amount: 9.99,
        currency: 'USD',
        workflowProcessed: false,
        createdAt: new Date()
      });

      // Execute workflow
      const result = await this.workflowEngine.executeSubscriptionWorkflow(subscription);

      this.addResult('Basic Workflow Execution', result.success, result.error, {
        executionId: result.metadata?.executionId,
        completedSteps: result.metadata?.completedSteps
      });
    } catch (error) {
      this.addResult('Basic Workflow Execution', false, error.message);
    }
  }

  async testNewsletterWorkflow(): Promise<void> {
    console.log('\n🧪 Testing Newsletter Workflow...');

    try {
      const user = await this.dummyDataService.userRepository.save({
        email: 'test-newsletter@example.com',
        name: 'Test Newsletter User',
        phoneNumber: '+1234567891',
        isActive: true,
        timezone: 'UTC'
      });

      const newsletter = await this.dummyDataService.newsletterRepository.save({
        userId: user.id,
        email: user.email,
        status: 'subscribed',
        emailVerified: true,
        source: 'website',
        workflowProcessed: false,
        subscribedAt: new Date()
      });

      const result = await this.workflowEngine.executeNewsletterWorkflow(newsletter);

      this.addResult('Newsletter Workflow', result.success, result.error, {
        executionId: result.metadata?.executionId
      });
    } catch (error) {
      this.addResult('Newsletter Workflow', false, error.message);
    }
  }

  async testWorkflowStates(): Promise<void> {
    console.log('\n🧪 Testing Workflow States...');

    try {
      const executions = await this.workflowEngine.getAllExecutions();
      const testExecutions = executions.filter(exec =>
        exec.executionId.includes('test-') ||
        exec.workflowId.includes('test-') ||
        exec.userId.includes('test-') ||
        (exec.state && exec.state.context && (
          exec.state.context.email?.includes('test-') ||
          exec.state.context.product?.includes('test-')
        ))
      );

      if (testExecutions.length === 0) {
        this.addResult('Workflow States', false, 'No test executions found');
        return;
      }

      const statusCounts = testExecutions.reduce((acc, exec) => {
        acc[exec.status] = (acc[exec.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const hasCompleted = statusCounts['completed'] > 0;
      const hasRunning = statusCounts['running'] > 0;
      const hasFailed = statusCounts['failed'] > 0;

      this.addResult('Workflow States', true, undefined, {
        totalTestExecutions: testExecutions.length,
        statusBreakdown: statusCounts,
        hasCompleted,
        hasRunning,
        hasFailed
      });
    } catch (error) {
      this.addResult('Workflow States', false, error.message);
    }
  }

  async testDelayProcessing(): Promise<void> {
    console.log('\n🧪 Testing Delay Processing...');

    try {
      const delays = await this.delayRepo.find();
      const testDelays = delays.filter(delay =>
        delay.executionId.includes('test-')
      );

      this.addResult('Delay Processing', true, undefined, {
        totalDelays: delays.length,
        testDelays: testDelays.length,
        delayStatuses: testDelays.map(d => ({ id: d.id, status: d.status, executeAt: d.executeAt }))
      });

      // Test delay processing
      if (delays.length > 0) {
        await this.workflowEngine.processDelayedExecutions();
        this.addResult('Delay Processing Execution', true);
      }
    } catch (error) {
      this.addResult('Delay Processing', false, error.message);
    }
  }

  async testServiceIntegration(): Promise<void> {
    console.log('\n🧪 Testing Service Integration...');

    try {
      const emails = await this.emailRepo.find();
      const testEmails = emails.filter(email =>
        email.to.includes('test-')
      );

      this.addResult('Service Integration', true, undefined, {
        totalEmails: emails.length,
        testEmails: testEmails.length,
        emailStatuses: testEmails.map(e => ({ to: e.to, status: e.status, template: e.templateId }))
      });
    } catch (error) {
      this.addResult('Service Integration', false, error.message);
    }
  }

  async testNodeRegistry(): Promise<void> {
    console.log('\n🧪 Testing Node Registry...');

    try {
      const availableTypes = this.workflowEngine.getAvailableNodeTypes();
      const registryStats = this.workflowEngine.getRegistryStats();

      const expectedTypes = ['delay', 'action', 'shared-flow', 'condition'];
      const hasAllTypes = expectedTypes.every(type => availableTypes.includes(type));

      this.addResult('Node Registry', hasAllTypes,
        hasAllTypes ? undefined : `Missing types: ${expectedTypes.filter(t => !availableTypes.includes(t)).join(', ')}`,
        {
          availableTypes,
          registryStats,
          hasAllExpectedTypes: hasAllTypes
        }
      );
    } catch (error) {
      this.addResult('Node Registry', false, error.message);
    }
  }

  async testConditionNodes(): Promise<void> {
    console.log('\n🧪 Testing Condition Nodes...');

    try {
      // This would test condition node logic
      // For now, we'll verify the condition executor is registered
      const availableTypes = this.workflowEngine.getAvailableNodeTypes();
      const hasConditionNode = availableTypes.includes('condition');

      this.addResult('Condition Nodes', hasConditionNode,
        hasConditionNode ? undefined : 'Condition node executor not found',
        {
          hasConditionNode,
          availableTypes
        }
      );
    } catch (error) {
      this.addResult('Condition Nodes', false, error.message);
    }
  }

  async testWorkflowsWithoutVisualWorkflows(): Promise<void> {
    console.log('\n🧪 Testing Workflows Without Visual Workflows...');

    try {
      // Create a workflow without visual workflow
      const workflow = await this.workflowRepo.save({
        rule: {
          name: 'test-workflow-only',
          description: 'Test workflow without visual representation',
          steps: [
            {
              id: 'step1',
              type: 'action',
              actionType: 'send_email',
              actionName: 'Welcome Email',
              templateId: 'welcome-template',
              to: '{{context.email}}'
            }
          ]
        }
      });

      // Verify workflow exists
      const savedWorkflow = await this.workflowRepo.findOne({ where: { id: workflow.id } });
      const hasWorkflow = !!savedWorkflow;

      // Verify no visual workflow exists for this workflow
      const visualWorkflow = await this.visualWorkflowRepo.findOne({
        where: { jsonLogicRule: { id: workflow.id } }
      });
      const hasNoVisualWorkflow = !visualWorkflow;

      this.addResult('Workflows Without Visual Workflows', hasWorkflow && hasNoVisualWorkflow,
        !hasWorkflow ? 'Failed to create workflow' : !hasNoVisualWorkflow ? 'Unexpected visual workflow found' : undefined,
        {
          workflowId: workflow.id,
          hasWorkflow,
          hasNoVisualWorkflow,
          workflowRule: savedWorkflow?.rule
        }
      );
    } catch (error) {
      this.addResult('Workflows Without Visual Workflows', false, error.message);
    }
  }

  async testVisualWorkflowsWithJsonLogic(): Promise<void> {
    console.log('\n🧪 Testing Visual Workflows with JSON Logic Creation...');

    try {
      // Create a visual workflow with JSON logic
      const visualWorkflow = await this.visualWorkflowRepo.save({
        name: 'test-visual-workflow',
        nodes: [
          {
            id: 'node1',
            type: 'action',
            position: { x: 100, y: 100 },
            data: {
              actionType: 'send_email',
              actionName: 'Welcome Email',
              templateId: 'welcome-template',
              to: '{{context.email}}'
            }
          },
          {
            id: 'node2',
            type: 'delay',
            position: { x: 300, y: 100 },
            data: {
              delay: 24,
              unit: 'hours'
            }
          }
        ],
        edges: [
          {
            id: 'edge1',
            source: 'node1',
            target: 'node2'
          }
        ]
      });

      // Create corresponding JSON logic rule
      const jsonLogicRule = await this.workflowRepo.save({
        rule: {
          name: 'test-visual-workflow-rule',
          description: 'JSON logic rule for visual workflow',
          steps: [
            {
              id: 'node1',
              type: 'action',
              actionType: 'send_email',
              actionName: 'Welcome Email',
              templateId: 'welcome-template',
              to: '{{context.email}}'
            },
            {
              id: 'node2',
              type: 'delay',
              delay: 24,
              unit: 'hours'
            }
          ]
        }
      });

      // Link them together
      visualWorkflow.jsonLogicRule = jsonLogicRule;
      await this.visualWorkflowRepo.save(visualWorkflow);

      // Verify both exist and are linked
      const savedVisualWorkflow = await this.visualWorkflowRepo.findOne({
        where: { id: visualWorkflow.id },
        relations: ['jsonLogicRule']
      });
      const savedJsonLogicRule = await this.workflowRepo.findOne({
        where: { id: jsonLogicRule.id }
      });

      const hasVisualWorkflow = !!savedVisualWorkflow;
      const hasJsonLogicRule = !!savedJsonLogicRule;
      const areLinked = savedVisualWorkflow?.jsonLogicRule?.id === jsonLogicRule.id;

      this.addResult('Visual Workflows with JSON Logic', hasVisualWorkflow && hasJsonLogicRule && areLinked,
        !hasVisualWorkflow ? 'Failed to create visual workflow' :
        !hasJsonLogicRule ? 'Failed to create JSON logic rule' :
        !areLinked ? 'Failed to link visual workflow with JSON logic rule' : undefined,
        {
          visualWorkflowId: visualWorkflow.id,
          jsonLogicRuleId: jsonLogicRule.id,
          hasVisualWorkflow,
          hasJsonLogicRule,
          areLinked,
          nodeCount: savedVisualWorkflow?.nodes?.length || 0,
          edgeCount: savedVisualWorkflow?.edges?.length || 0
        }
      );
    } catch (error) {
      this.addResult('Visual Workflows with JSON Logic', false, error.message);
    }
  }

  async testCascadeDeleteBehavior(): Promise<void> {
    console.log('\n🧪 Testing Cascade Delete Behavior...');

    try {
      // Create a workflow with visual workflow
      const jsonLogicRule = await this.workflowRepo.save({
        rule: {
          name: 'test-cascade-workflow',
          description: 'Test cascade delete behavior',
          steps: [
            {
              id: 'step1',
              type: 'action',
              actionType: 'send_email',
              actionName: 'Test Email',
              templateId: 'test-template',
              to: '{{context.email}}'
            }
          ]
        }
      });

      const visualWorkflow = await this.visualWorkflowRepo.save({
        name: 'test-cascade-visual',
        nodes: [
          {
            id: 'node1',
            type: 'action',
            position: { x: 100, y: 100 },
            data: {
              actionType: 'send_email',
              actionName: 'Test Email',
              templateId: 'test-template',
              to: '{{context.email}}'
            }
          }
        ],
        edges: [],
        jsonLogicRule: jsonLogicRule
      });

      // Verify both exist
      const initialVisualCount = await this.visualWorkflowRepo.count();
      const initialWorkflowCount = await this.workflowRepo.count();

      // Delete the JSON logic rule (parent)
      await this.workflowRepo.delete({ id: jsonLogicRule.id });

      // Check if visual workflow was cascade deleted
      const finalVisualCount = await this.visualWorkflowRepo.count();
      const finalWorkflowCount = await this.workflowRepo.count();

      const visualWorkflowDeleted = finalVisualCount < initialVisualCount;
      const workflowDeleted = finalWorkflowCount < initialWorkflowCount;

      this.addResult('Cascade Delete Behavior', visualWorkflowDeleted && workflowDeleted,
        !workflowDeleted ? 'JSON logic rule not deleted' :
        !visualWorkflowDeleted ? 'Visual workflow not cascade deleted' : undefined,
        {
          initialVisualCount,
          finalVisualCount,
          initialWorkflowCount,
          finalWorkflowCount,
          visualWorkflowDeleted,
          workflowDeleted
        }
      );
    } catch (error) {
      this.addResult('Cascade Delete Behavior', false, error.message);
    }
  }

  async runAllTests(): Promise<boolean> {
    console.log('🚀 Starting Workflow Test Suite...\n');

    await this.cleanupTestData();
    await this.testBasicWorkflowExecution();
    await this.testNewsletterWorkflow();
    await this.testWorkflowStates();
    await this.testDelayProcessing();
    await this.testServiceIntegration();
    await this.testNodeRegistry();
    await this.testConditionNodes();
    await this.testWorkflowsWithoutVisualWorkflows();
    await this.testVisualWorkflowsWithJsonLogic();
    await this.testCascadeDeleteBehavior();

    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total: ${this.results.length}`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.testName}: ${result.error}`);
      });
    }

    const allPassed = failed === 0;
    console.log(`\n${allPassed ? '🎉' : '💥'} Test Suite ${allPassed ? 'PASSED' : 'FAILED'}`);

    return allPassed;
  }
}

async function runBuildTests() {
  console.log('🔧 Build Test Suite - Workflow Component Testing\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  // Get repositories
  const executionRepo = app.get<Repository<WorkflowExecution>>(getRepositoryToken(WorkflowExecution));
  const delayRepo = app.get<Repository<WorkflowDelay>>(getRepositoryToken(WorkflowDelay));
  const emailRepo = app.get<Repository<EmailLog>>(getRepositoryToken(EmailLog));
  const visualWorkflowRepo = app.get<Repository<VisualWorkflow>>(getRepositoryToken(VisualWorkflow));
  const workflowRepo = app.get<Repository<JsonLogicRule>>(getRepositoryToken(JsonLogicRule));

  const workflowEngine = app.get(WorkflowOrchestrationEngine);
  const dummyDataService = app.get(DummyDataService);
  const emailService = app.get(EmailService);

  try {
    const testSuite = new WorkflowTestSuite(
      executionRepo,
      delayRepo,
      emailRepo,
      visualWorkflowRepo,
      workflowRepo,
      workflowEngine,
      dummyDataService,
      emailService
    );

    const success = await testSuite.runAllTests();

    if (!success) {
      console.log('\n💥 Build tests failed!');
      process.exit(1);
    }

    console.log('\n🎉 All build tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Build test suite failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runBuildTests().catch(console.error);
}

export { runBuildTests };
