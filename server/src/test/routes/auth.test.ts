import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testRequest, mockEmployee, mockDbResponse, mockSettings } from '../helpers';
import { pool } from '../../db/connection';
import * as hashUtils from '../../utils/hash';

// Mock the hash verification
vi.mock('../../utils/hash', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  verifyPassword: vi.fn(),
}));

// Mock the settings service
vi.mock('../../services/settings.service', () => ({
  getCompanySettings: vi.fn().mockResolvedValue({
    session_duration_employee: 28800,
    session_duration_admin: 86400,
    failed_login_lockout_count: 5,
    failed_login_lockout_minutes: 15,
    mfa_required_admin: false,
  }),
}));

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/employee/login', () => {
    it('returns 400 for invalid payload', async () => {
      const response = await testRequest
        .post('/api/auth/employee/login')
        .send({ initials: 'J' }); // Missing pin, initials too short

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('returns 401 for non-existent employee', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce(mockDbResponse([]));

      const response = await testRequest
        .post('/api/auth/employee/login')
        .send({ initials: 'XX', pin: '1234' });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 403 for inactive employee', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce(
        mockDbResponse([{ ...mockEmployee, is_active: false }])
      );

      const response = await testRequest
        .post('/api/auth/employee/login')
        .send({ initials: 'JD', pin: '1234' });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('EMPLOYEE_INACTIVE');
    });

    it('returns 403 for pending access employee', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce(
        mockDbResponse([{ ...mockEmployee, access_status: 'PENDING' }])
      );

      const response = await testRequest
        .post('/api/auth/employee/login')
        .send({ initials: 'JD', pin: '1234' });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('ACCESS_PENDING');
    });

    it('returns 403 for locked account', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce(
        mockDbResponse([{
          ...mockEmployee,
          locked_until: new Date(Date.now() + 3600000).toISOString(),
        }])
      );

      const response = await testRequest
        .post('/api/auth/employee/login')
        .send({ initials: 'JD', pin: '1234' });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('LOCKED');
    });

    it('returns 401 for invalid PIN', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce(mockDbResponse([mockEmployee]));
      vi.mocked(hashUtils.verifyPassword).mockResolvedValueOnce(false);
      vi.mocked(pool.query).mockResolvedValueOnce(mockDbResponse([])); // Update failed count

      const response = await testRequest
        .post('/api/auth/employee/login')
        .send({ initials: 'JD', pin: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns token for valid credentials', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce(mockDbResponse([mockEmployee])) // Get employee
        .mockResolvedValueOnce(mockDbResponse([])) // Update login time
        .mockResolvedValueOnce(mockDbResponse([])) // Insert session
        .mockResolvedValueOnce(mockDbResponse([])) // Audit log
        .mockResolvedValueOnce(mockDbResponse([])); // Get pending certification

      vi.mocked(hashUtils.verifyPassword).mockResolvedValueOnce(true);

      const response = await testRequest
        .post('/api/auth/employee/login')
        .send({ initials: 'JD', pin: '1234' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.type).toBe('EMPLOYEE');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 401 without auth token', async () => {
      const response = await testRequest.post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });
});
