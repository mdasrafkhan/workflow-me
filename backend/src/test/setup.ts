// Jest setup file for workflow backend tests
import 'reflect-metadata';

// Configure test environment
process.env.NODE_ENV = 'test';
process.env.TEST_DB_HOST = 'localhost';
process.env.TEST_DB_PORT = '15432'; // Docker mapped port for main database
process.env.TEST_DB_USER = 'workflow_user';
process.env.TEST_DB_PASSWORD = 'workflow_password';
process.env.TEST_DB_NAME = 'workflow_db';

// Redis configuration for testing
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '16379'; // Docker mapped port for Redis
process.env.REDIS_DB = '1'; // Use different DB for tests

// Optimization configuration for testing
process.env.WORKFLOW_EXECUTION_CONCURRENCY = '10';
process.env.WORKFLOW_DELAY_CONCURRENCY = '5';
process.env.WORKFLOW_SCHEDULER_CONCURRENCY = '1';
process.env.MAX_CONCURRENT_EXECUTIONS = '20';
process.env.DATABASE_BATCH_SIZE = '10';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set up test timeout
jest.setTimeout(30000);
