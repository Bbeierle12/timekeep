import { vi, type Mock } from 'vitest';
import request from 'supertest';
import type { QueryResult, QueryResultRow } from 'pg';
import app from '../app';
import { signToken } from '../utils/jwt';
import { pool } from '../db/connection';

export const testRequest = request(app);

// Type helper for mocking pool.query with proper return type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mockQueryResult(rows: any[], rowCount?: number): QueryResult<any> {
  return {
    rows,
    rowCount: rowCount ?? rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

// Type-safe mock for pool.query
type QueryMock = Mock<(...args: unknown[]) => Promise<QueryResult>>;
export const mockPoolQuery = pool.query as unknown as QueryMock;

// Create test tokens
export function createEmployeeToken(employeeId: string = 'test-employee-id') {
  return signToken({ sub: employeeId, type: 'EMPLOYEE' }, 3600);
}

export function createAdminToken(adminId: string = 'test-admin-id', role: string = 'SUPER_ADMIN') {
  return signToken({ sub: adminId, type: 'ADMIN', role }, 3600);
}

// Mock database responses
export const mockDbResponse = (rows: unknown[], rowCount: number = rows.length) => ({
  rows,
  rowCount,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

// Mock employee data
export const mockEmployee = {
  id: 'emp-test-123',
  initials: 'JD',
  full_name: 'John Doe',
  pin_hash: '$2a$10$test-hash',
  is_active: true,
  access_status: 'APPROVED',
  failed_login_count: 0,
  locked_until: null,
  last_login_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

// Mock admin data
export const mockAdmin = {
  id: 'admin-test-123',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'SUPER_ADMIN',
  password_hash: '$2a$10$test-hash',
  is_active: true,
  mfa_enabled: false,
  failed_login_count: 0,
  locked_until: null,
  last_login_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

// Mock time entry data
export const mockTimeEntry = {
  id: 'entry-test-123',
  employee_id: 'emp-test-123',
  work_date: '2024-01-15',
  action_type: 'CLOCK_IN',
  recorded_at: new Date(),
  latitude: 37.7749,
  longitude: -122.4194,
  resolved_address: '123 Main St, San Francisco, CA',
  comment: null,
  is_override: false,
  override_by: null,
  override_reason: null,
  created_at: new Date(),
};

// Mock settings data
export const mockSettings = {
  id: 'settings-1',
  company_name: 'Test Company',
  timezone: 'America/Los_Angeles',
  session_duration_employee: 28800,
  session_duration_admin: 86400,
  failed_login_lockout_count: 5,
  failed_login_lockout_minutes: 15,
  meal_waiver_text: 'Test waiver text',
  daily_attestation_text: 'Test attestation text',
  geofencing_enabled: false,
  geofence_radius_meters: 100,
  mfa_required_admin: false,
};

// Helper to set up pool mock
export function setupPoolMock(poolMock: { query: ReturnType<typeof vi.fn> }) {
  return poolMock;
}
