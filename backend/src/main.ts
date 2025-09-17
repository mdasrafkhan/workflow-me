import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WorkflowOrchestrationEngine } from './workflow/execution/workflow-orchestration-engine';
import { DummyDataService } from './services/dummy-data.service';
import { WorkflowRecoveryService } from './services/workflow-recovery.service';

// Disable ioredis debug logging to reduce log noise
process.env.IOREDIS_DEBUG = '';
process.env.DEBUG = '';
process.env.REDIS_DEBUG = '';

// Set ioredis log level to silent
import { Redis } from 'ioredis';
Redis.prototype.debug = async () => {};

// Patch ioredis to suppress all logging
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

// Override all console methods to filter ioredis logs
const filterIoredisLogs = (originalMethod: Function) => {
  return (...args: any[]) => {
    const message = args.join(' ');
    if (!message.includes('ioredis:') &&
        !message.includes('redis write command') &&
        !message.includes('evalsha(') &&
        !message.includes('brpoplpush(') &&
        !message.includes('bull:workflow-') &&
        !message.includes('bull:workflow-execution') &&
        !message.includes('bull:workflow-delay') &&
        !message.includes('bull:workflow-scheduler')) {
      originalMethod.apply(console, args);
    }
  };
};

console.log = filterIoredisLogs(originalConsoleLog);
console.error = filterIoredisLogs(originalConsoleError);
console.warn = filterIoredisLogs(originalConsoleWarn);
console.info = filterIoredisLogs(originalConsoleInfo);

// Override process.stdout.write to catch ioredis logs
const originalStdoutWrite = process.stdout.write;
process.stdout.write = function(chunk: any, encoding?: any, callback?: any) {
  const message = chunk.toString();
  if (message.includes('ioredis:') ||
      message.includes('redis write command') ||
      message.includes('evalsha(') ||
      message.includes('brpoplpush(') ||
      message.includes('bull:workflow-') ||
      message.includes('bull:workflow-execution') ||
      message.includes('bull:workflow-delay') ||
      message.includes('bull:workflow-scheduler')) {
    return true; // Suppress the log
  }
  return originalStdoutWrite.call(this, chunk, encoding, callback);
};

// Also override process.stderr.write
const originalStderrWrite = process.stderr.write;
process.stderr.write = function(chunk: any, encoding?: any, callback?: any) {
  const message = chunk.toString();
  if (message.includes('ioredis:') ||
      message.includes('redis write command') ||
      message.includes('evalsha(') ||
      message.includes('brpoplpush(') ||
      message.includes('bull:workflow-') ||
      message.includes('bull:workflow-execution') ||
      message.includes('bull:workflow-delay') ||
      message.includes('bull:workflow-scheduler')) {
    return true; // Suppress the log
  }
  return originalStderrWrite.call(this, chunk, encoding, callback);
};


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

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