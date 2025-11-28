import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';

/**
 * Global Test Setup
 * 
 * Configures test environment, mocks, and cleanup procedures
 */

// Global test timeout
vi.setConfig({
  testTimeout: 30000,
  hookTimeout: 30000
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  if (process.env.NODE_ENV === 'test') {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  }
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset environment variables
  process.env.NODE_ENV = 'test';
  // PHI_ENCRYPTION_KEY should be set via environment variable
  // Never hardcode encryption keys - they should come from .env.test or CI/CD secrets
  if (!process.env.PHI_ENCRYPTION_KEY) {
    throw new Error('PHI_ENCRYPTION_KEY environment variable must be set for tests');
  }
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllTimers();
  vi.useRealTimers();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Mock external services
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    accounts: {
      retrieve: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
      confirm: vi.fn()
    },
    webhooks: {
      constructEvent: vi.fn()
    },
    refunds: {
      create: vi.fn()
    }
  }))
}));

// Mock database operations
vi.mock('@db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    query: {
      usersAuth: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      therapistProfiles: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      therapistPHI: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      patients: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      clinicalSessions: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      auditLogsHIPAA: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      }
    }
  },
  getActiveSchema: vi.fn().mockReturnValue({
    isHIPAASchema: true,
    usersAuth: {},
    therapistProfiles: {},
    therapistPHI: {},
    patients: {},
    clinicalSessions: {},
    auditLogsHIPAA: {}
  })
}));

// Mock Redis client
vi.mock('redis', () => ({
  createClient: vi.fn().mockReturnValue({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
    isOpen: true
  })
}));

// Mock email service
vi.mock('nodemailer', () => ({
  createTransporter: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({
      messageId: 'test-message-id',
      response: '250 OK'
    })
  })
}));

// Mock AI services
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: 'Mock AI response' }],
        usage: { input_tokens: 10, output_tokens: 20 }
      })
    }
  }))
}));

vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock OpenAI response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20 }
        })
      }
    }
  }))
}));

// Mock file system operations
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn().mockReturnValue('mock file content'),
    writeFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([])
  },
  readFileSync: vi.fn().mockReturnValue('mock file content'),
  writeFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([])
}));

// Mock crypto operations
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue(Buffer.from('mock-random-bytes')),
    createCipheriv: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue('encrypted'),
      final: vi.fn().mockReturnValue('data'),
      getAuthTag: vi.fn().mockReturnValue(Buffer.from('auth-tag'))
    }),
    createDecipheriv: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue('decrypted'),
      final: vi.fn().mockReturnValue('data'),
      setAuthTag: vi.fn()
    })
  };
});

// Test utilities
export const createMockRequest = (overrides = {}) => ({
  method: 'GET',
  path: '/api/test',
  user: null,
  isAuthenticated: vi.fn().mockReturnValue(false),
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides
});

export const createMockResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
  cookie: vi.fn().mockReturnThis(),
  clearCookie: vi.fn().mockReturnThis(),
  redirect: vi.fn().mockReturnThis()
});

export const createMockNext = () => vi.fn();

// Test data factories
export const createTestUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  name: 'Test User',
  title: 'Licensed Therapist',
  license: 'LCSW-12345',
  specialties: 'CBT, Anxiety, Depression',
  created_at: new Date(),
  ...overrides
});

export const createTestClient = (overrides = {}) => ({
  id: 1,
  name: 'Test Client',
  email: 'client@example.com',
  phone: '555-123-4567',
  type: 'individual',
  billingType: 'private_pay',
  sessionCost: '150',
  age: 30,
  pronouns: 'they/them',
  notes: 'Test client notes',
  deleted: false,
  ...overrides
});

export const createTestSession = (overrides = {}) => ({
  id: 1,
  patientId: 1,
  userId: 1,
  date: '2025-01-20',
  time: '10:00',
  duration: 50,
  type: 'therapy',
  format: 'in_person',
  cost: 150,
  status: 'scheduled',
  notes: 'Test session notes',
  ...overrides
});

// Test assertions
export const expectToBeValidUUID = (value: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  expect(value).toMatch(uuidRegex);
};

export const expectToBeValidEmail = (value: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  expect(value).toMatch(emailRegex);
};

export const expectToBeValidPhone = (value: string) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  expect(value).toMatch(phoneRegex);
};

export const expectToBeValidDate = (value: string) => {
  const date = new Date(value);
  expect(date).toBeInstanceOf(Date);
  expect(date.getTime()).not.toBeNaN();
};

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<any>) => {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
};

export const expectPerformanceToBeUnder = (duration: number, maxMs: number) => {
  expect(duration).toBeLessThan(maxMs);
};

// Cleanup utilities
export const cleanupTestData = async () => {
  // Clean up any test data that might have been created
  // This would be implemented based on your specific test database setup
};

// Test environment validation
export const validateTestEnvironment = () => {
  const requiredEnvVars = [
    'NODE_ENV',
    'PHI_ENCRYPTION_KEY'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('NODE_ENV must be set to "test" for running tests');
  }
};

// Initialize test environment
validateTestEnvironment();