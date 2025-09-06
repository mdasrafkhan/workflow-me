// Jest setup file for workflow backend tests
import 'reflect-metadata';

// Configure test environment
process.env.NODE_ENV = 'test';
process.env.TEST_DB_HOST = 'localhost';
process.env.TEST_DB_PORT = '5432';
process.env.TEST_DB_USER = 'test_user';
process.env.TEST_DB_PASSWORD = 'test_password';
process.env.TEST_DB_NAME = 'workflow_test';

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
