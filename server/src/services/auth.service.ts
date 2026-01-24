import { pool } from '../db/connection';
import { getCompanySettings } from './settings.service';
import { verifyPassword } from '../utils/hash';
import { signToken } from '../utils/jwt';
import { hashToken } from '../utils/token';
import { auditService } from './audit.service';
import { certificationService } from './certification.service';

export type AuthSuccess = {
  ok: true;
  token: string;
  expiresAt: Date;
  user: {
    id: string;
    type: 'ADMIN' | 'EMPLOYEE';
    name: string;
    initials?: string;
    role?: string;
  };
  pendingCertification?: {
    workDate: string;
    entries: Array<{
      id: string;
      work_date: string;
      action_type: string;
      recorded_at: Date;
      comment: string | null;
      resolved_address: string | null;
    }>;
    summary: unknown;
  } | null;
};

export type AuthFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

export const authService = {
  async getSessionUser(params: {
    userId: string;
    userType: 'ADMIN' | 'EMPLOYEE';
  }): Promise<AuthSuccess['user'] | null> {
    if (params.userType === 'EMPLOYEE') {
      const empResult = await pool.query(
        'SELECT id, full_name, initials, is_active FROM employees WHERE id = $1',
        [params.userId]
      );
      if (empResult.rowCount === 0 || !empResult.rows[0].is_active) {
        return null;
      }
      return {
        id: empResult.rows[0].id,
        type: 'EMPLOYEE',
        name: empResult.rows[0].full_name,
        initials: empResult.rows[0].initials
      };
    }

    const adminResult = await pool.query(
      'SELECT id, name, role, is_active FROM admins WHERE id = $1',
      [params.userId]
    );
    if (adminResult.rowCount === 0 || !adminResult.rows[0].is_active) {
      return null;
    }

    return {
      id: adminResult.rows[0].id,
      type: 'ADMIN',
      name: adminResult.rows[0].name,
      role: adminResult.rows[0].role
    };
  },
  async loginEmployee(params: {
    initials: string;
    pin: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuthSuccess | AuthFailure> {
    const settings = await getCompanySettings();
    const identifier = params.initials.trim().toUpperCase();
    const now = new Date();

    // Support login by either initials or employee_code (backward compatible)
    let employeeResult;
    try {
      employeeResult = await pool.query(
        `SELECT id, initials, employee_code, full_name, pin_hash, is_active, access_status,
                failed_login_count, locked_until
         FROM employees
         WHERE UPPER(initials) = $1 OR UPPER(employee_code) = $1
         LIMIT 1`,
        [identifier]
      );
    } catch (err: unknown) {
      // Fallback for databases without employee_code column
      if ((err as { code?: string }).code === '42703') {
        employeeResult = await pool.query(
          `SELECT id, initials, full_name, pin_hash, is_active, access_status,
                  failed_login_count, locked_until
           FROM employees
           WHERE UPPER(initials) = $1
           LIMIT 1`,
          [identifier]
        );
      } else {
        throw err;
      }
    }

    if (employeeResult.rowCount === 0) {
      return { ok: false, status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' };
    }

    const employee = employeeResult.rows[0];

    if (!employee.is_active) {
      return { ok: false, status: 403, code: 'EMPLOYEE_INACTIVE', message: 'Employee inactive' };
    }

    if (employee.access_status !== 'APPROVED') {
      await auditService.log({
        actorType: 'EMPLOYEE',
        actorId: employee.id,
        actorIdentifier: employee.initials,
        action: 'ACCESS_REQUESTED',
        details: { status: employee.access_status },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      });

      return {
        ok: false,
        status: 403,
        code: employee.access_status === 'DENIED' ? 'ACCESS_DENIED' : 'ACCESS_PENDING',
        message: 'Employee access pending approval'
      };
    }

    if (employee.locked_until && new Date(employee.locked_until).getTime() > now.getTime()) {
      return { ok: false, status: 403, code: 'LOCKED', message: 'Account locked. Try again later.' };
    }

    const pinValid = employee.pin_hash ? await verifyPassword(params.pin, employee.pin_hash) : false;

    if (!pinValid) {
      const failedCount = Number(employee.failed_login_count ?? 0) + 1;
      const lockedUntil =
        failedCount >= settings.failed_login_lockout_count
          ? addMinutes(now, settings.failed_login_lockout_minutes)
          : null;

      await pool.query(
        `UPDATE employees
         SET failed_login_count = $1,
             locked_until = $2
         WHERE id = $3`,
        [failedCount, lockedUntil, employee.id]
      );

      return { ok: false, status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' };
    }

    await pool.query(
      `UPDATE employees
       SET failed_login_count = 0,
           locked_until = NULL,
           last_login_at = $1
       WHERE id = $2`,
      [now, employee.id]
    );

    const expiresAt = new Date(now.getTime() + settings.session_duration_employee * 1000);
    const token = signToken({ sub: employee.id, type: 'EMPLOYEE' }, settings.session_duration_employee);

    await pool.query(
      `INSERT INTO sessions (user_type, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['EMPLOYEE', employee.id, hashToken(token), expiresAt, params.ipAddress ?? null, params.userAgent ?? null]
    );

    await auditService.log({
      actorType: 'EMPLOYEE',
      actorId: employee.id,
      actorIdentifier: employee.initials,
      action: 'LOGIN',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    const pendingCertification = await certificationService.getPendingCertification(employee.id);

    return {
      ok: true,
      token,
      expiresAt,
      user: {
        id: employee.id,
        type: 'EMPLOYEE',
        name: employee.full_name,
        initials: employee.initials
      },
      pendingCertification
    };
  },

  async loginAdmin(params: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuthSuccess | AuthFailure> {
    const settings = await getCompanySettings();
    const email = params.email.trim().toLowerCase();
    const now = new Date();

    const adminResult = await pool.query(
      `SELECT id, email, name, role, password_hash, is_active, failed_login_count, locked_until, mfa_enabled
       FROM admins
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    if (adminResult.rowCount === 0) {
      return { ok: false, status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' };
    }

    const admin = adminResult.rows[0];

    if (!admin.is_active) {
      return { ok: false, status: 403, code: 'ADMIN_INACTIVE', message: 'Admin inactive' };
    }

    if (admin.locked_until && new Date(admin.locked_until).getTime() > now.getTime()) {
      return { ok: false, status: 403, code: 'LOCKED', message: 'Account locked. Try again later.' };
    }

    const passwordValid = admin.password_hash
      ? await verifyPassword(params.password, admin.password_hash)
      : false;

    if (!passwordValid) {
      const failedCount = Number(admin.failed_login_count ?? 0) + 1;
      const lockedUntil =
        failedCount >= settings.failed_login_lockout_count
          ? addMinutes(now, settings.failed_login_lockout_minutes)
          : null;

      await pool.query(
        `UPDATE admins
         SET failed_login_count = $1,
             locked_until = $2
         WHERE id = $3`,
        [failedCount, lockedUntil, admin.id]
      );

      return { ok: false, status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' };
    }

    if (settings.mfa_required_admin && !admin.mfa_enabled) {
      return { ok: false, status: 403, code: 'MFA_REQUIRED', message: 'MFA enrollment required' };
    }

    await pool.query(
      `UPDATE admins
       SET failed_login_count = 0,
           locked_until = NULL,
           last_login_at = $1
       WHERE id = $2`,
      [now, admin.id]
    );

    const expiresAt = new Date(now.getTime() + settings.session_duration_admin * 1000);
    const token = signToken({ sub: admin.id, type: 'ADMIN', role: admin.role }, settings.session_duration_admin);

    await pool.query(
      `INSERT INTO sessions (user_type, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['ADMIN', admin.id, hashToken(token), expiresAt, params.ipAddress ?? null, params.userAgent ?? null]
    );

    await auditService.log({
      actorType: 'ADMIN',
      actorId: admin.id,
      actorIdentifier: admin.email,
      action: 'LOGIN',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    return {
      ok: true,
      token,
      expiresAt,
      user: {
        id: admin.id,
        type: 'ADMIN',
        name: admin.name,
        role: admin.role
      }
    };
  },

  async logout(params: { token: string }) {
    const tokenHash = hashToken(params.token);
    await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  },

  async refreshToken(params: {
    currentToken: string;
    userId: string;
    userType: 'ADMIN' | 'EMPLOYEE';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuthSuccess | AuthFailure> {
    const settings = await getCompanySettings();
    const now = new Date();
    const currentTokenHash = hashToken(params.currentToken);

    // Verify the current session exists and is valid
    const sessionResult = await pool.query(
      `SELECT id, expires_at FROM sessions
       WHERE token_hash = $1 AND user_id = $2 AND user_type = $3`,
      [currentTokenHash, params.userId, params.userType]
    );

    if (sessionResult.rowCount === 0) {
      return { ok: false, status: 401, code: 'INVALID_SESSION', message: 'Invalid or expired session' };
    }

    const session = sessionResult.rows[0];

    // Check if session is expired (allow some grace period for refresh)
    const gracePeriodMs = 5 * 60 * 1000; // 5 minutes grace period
    if (new Date(session.expires_at).getTime() + gracePeriodMs < now.getTime()) {
      // Session too old, delete it
      await pool.query('DELETE FROM sessions WHERE id = $1', [session.id]);
      return { ok: false, status: 401, code: 'SESSION_EXPIRED', message: 'Session expired' };
    }

    // Get user details
    let user: { id: string; name: string; initials?: string; role?: string };

    if (params.userType === 'EMPLOYEE') {
      const empResult = await pool.query(
        'SELECT id, full_name, initials, is_active FROM employees WHERE id = $1',
        [params.userId]
      );
      if (empResult.rowCount === 0 || !empResult.rows[0].is_active) {
        await pool.query('DELETE FROM sessions WHERE id = $1', [session.id]);
        return { ok: false, status: 403, code: 'USER_INACTIVE', message: 'User no longer active' };
      }
      user = { id: empResult.rows[0].id, name: empResult.rows[0].full_name, initials: empResult.rows[0].initials };
    } else {
      const adminResult = await pool.query(
        'SELECT id, name, role, is_active FROM admins WHERE id = $1',
        [params.userId]
      );
      if (adminResult.rowCount === 0 || !adminResult.rows[0].is_active) {
        await pool.query('DELETE FROM sessions WHERE id = $1', [session.id]);
        return { ok: false, status: 403, code: 'USER_INACTIVE', message: 'User no longer active' };
      }
      user = { id: adminResult.rows[0].id, name: adminResult.rows[0].name, role: adminResult.rows[0].role };
    }

    // Generate new token
    const sessionDuration = params.userType === 'EMPLOYEE'
      ? settings.session_duration_employee
      : settings.session_duration_admin;

    const expiresAt = new Date(now.getTime() + sessionDuration * 1000);
    const newToken = signToken(
      { sub: params.userId, type: params.userType, ...(user.role ? { role: user.role } : {}) },
      sessionDuration
    );
    const newTokenHash = hashToken(newToken);

    // Update session with new token
    await pool.query(
      `UPDATE sessions
       SET token_hash = $1, expires_at = $2, ip_address = $3, user_agent = $4
       WHERE id = $5`,
      [newTokenHash, expiresAt, params.ipAddress ?? null, params.userAgent ?? null, session.id]
    );

    await auditService.log({
      actorType: params.userType,
      actorId: params.userId,
      actorIdentifier: user.initials ?? user.name,
      action: 'TOKEN_REFRESH',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    // For employees, also check for pending certification
    let pendingCertification = null;
    if (params.userType === 'EMPLOYEE') {
      pendingCertification = await certificationService.getPendingCertification(params.userId);
    }

    return {
      ok: true,
      token: newToken,
      expiresAt,
      user: {
        id: user.id,
        type: params.userType,
        name: user.name,
        ...(user.initials ? { initials: user.initials } : {}),
        ...(user.role ? { role: user.role } : {})
      },
      pendingCertification
    };
  }
};
