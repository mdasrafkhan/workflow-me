import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WorkflowOrchestrationEngine } from './workflow/execution/workflow-orchestration-engine';
import { DummyDataService } from './services/dummy-data.service';
import { WorkflowRecoveryService } from './services/workflow-recovery.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get services
  const workflowEngine = app.get(WorkflowOrchestrationEngine);
  const dummyDataService = app.get(DummyDataService);
  const recoveryService = app.get(WorkflowRecoveryService);

  // Initialize dummy data
  await dummyDataService.initializeDummyData();

  // Recover workflows after restart
  console.log('🔄 Recovering workflows after restart...');
  const recoveryResult = await recoveryService.recoverWorkflows();
  console.log(`✅ Recovery completed: ${recoveryResult.recovered} recovered, ${recoveryResult.failed} failed`);
  if (recoveryResult.details.length > 0) {
    console.log('📋 Recovery details:', recoveryResult.details);
  }

  // Start the application
  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`🚀 Workflow Engine started on port ${port}`);
  console.log(`📊 Dummy data initialized`);
  console.log(`⏰ Batch processing every 30 seconds`);
  console.log(`📧 Email service ready (${process.env.NODE_ENV === 'production' ? 'SMTP' : 'MOCK'} mode)`);

  // Log system status
  const dataStats = await dummyDataService.getAllData();
  console.log(`📈 System Status:`, dataStats);
}

bootstrap().catch(console.error);