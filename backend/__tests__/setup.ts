import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

// Setup test database before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  // Suppress mongoose deprecation warnings in tests
  mongoose.set('strictQuery', false);
});

// Clean up database between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    if (collection) {
      await collection.deleteMany({});
    }
  }
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Global test utilities
global.testTimeout = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Mock external services
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
  })),
}));

// Mock fetch for Ollama health checks
global.fetch = jest.fn();

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    flushall: jest.fn(),
    ping: jest.fn(() => 'PONG'),
  })),
}));

// Suppress console.log in tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Custom matchers
expect.extend({
  toBeValidObjectId(received: string) {
    const isValid = mongoose.Types.ObjectId.isValid(received);
    return {
      message: () => `expected ${received} ${isValid ? 'not ' : ''}to be a valid ObjectId`,
      pass: isValid,
    };
  },
  
  toHaveValidationError(received: any, path: string) {
    const hasError = received?.errors?.[path] !== undefined;
    return {
      message: () => `expected validation error at path '${path}' ${hasError ? 'not ' : ''}to exist`,
      pass: hasError,
    };
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidObjectId(): R;
      toHaveValidationError(path: string): R;
    }
  }
  
  function testTimeout(ms: number): Promise<void>;
}