"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
let mongoServer;
beforeAll(async () => {
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose_1.default.connect(mongoUri);
    mongoose_1.default.set('strictQuery', false);
});
beforeEach(async () => {
    const collections = mongoose_1.default.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        if (collection) {
            await collection.deleteMany({});
        }
    }
});
afterAll(async () => {
    await mongoose_1.default.connection.dropDatabase();
    await mongoose_1.default.connection.close();
    await mongoServer.stop();
});
global.testTimeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
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
expect.extend({
    toBeValidObjectId(received) {
        const isValid = mongoose_1.default.Types.ObjectId.isValid(received);
        return {
            message: () => `expected ${received} ${isValid ? 'not ' : ''}to be a valid ObjectId`,
            pass: isValid,
        };
    },
    toHaveValidationError(received, path) {
        const hasError = received?.errors?.[path] !== undefined;
        return {
            message: () => `expected validation error at path '${path}' ${hasError ? 'not ' : ''}to exist`,
            pass: hasError,
        };
    },
});
//# sourceMappingURL=setup.js.map