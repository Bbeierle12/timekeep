import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/timekeep_test';

// Mock the database pool for unit tests
vi.mock('../db/connection', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  },
}));

beforeAll(() => {
  // Global setup before all tests
});

afterEach(() => {
  // Reset mocks after each test
  vi.clearAllMocks();
});

afterAll(() => {
  // Global cleanup after all tests
});
