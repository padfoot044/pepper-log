// Jest setup file
// Global test configuration and utilities

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch globally for browser-like testing
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Setup timeout for async tests
jest.setTimeout(10000);