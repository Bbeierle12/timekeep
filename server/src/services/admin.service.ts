import { pool } from '../db/connection';
import { hashPassword } from '../utils/hash';

export type AdminRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: Date;
  last_login_at: Date | null;
};

export type CreateAdminInput = {
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'read_only' | 'payroll' | 'compliance';
  password: string;
};

export type UpdateAdminInput = {
  name?: string;
  role?: 'owner' | 'admin' | 'read_only' | 'payroll' | 'compliance';
  isActive?: boolean;
  mfaEnabled?: boolean;
};

function buildUpdate(fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  const setClauses = entries.map(([key], index) => `${key} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  return { setClauses, values };
}

export const adminService = {
  async list(): Promise<AdminRecord[]> {
    const result = await pool.query(
      `SELECT id, email, name, role, is_active, mfa_enabled, created_at, last_login_at
       FROM admins
       ORDER BY created_at ASC`
    );

    return result.rows as AdminRecord[];
  },

  async create(input: CreateAdminInput) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await hashPassword(input.password);

    const result = await pool.query(
      `INSERT INTO admins (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, is_active, mfa_enabled, created_at, last_login_at`,
      [email, passwordHash, input.name, input.role]
    );

    return result.rows[0] as AdminRecord;
  },

  async update(id: string, input: UpdateAdminInput) {
    const { setClauses, values } = buildUpdate({
      name: input.name,
      role: input.role,
      is_active: input.isActive,
      mfa_enabled: input.mfaEnabled,
      updated_at: new Date()
    });

    if (!setClauses.length) {
      const result = await pool.query(
        `SELECT id, email, name, role, is_active, mfa_enabled, created_at, last_login_at
         FROM admins WHERE id = $1`,
        [id]
      );
      return result.rowCount ? (result.rows[0] as AdminRecord) : null;
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE admins
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, email, name, role, is_active, mfa_enabled, created_at, last_login_at`,
      values
    );

    return result.rowCount ? (result.rows[0] as AdminRecord) : null;
  },

  async delete(id: string) {
    const ownerResult = await pool.query('SELECT role FROM admins WHERE id = $1', [id]);
    if (!ownerResult.rowCount) return null;
    const role = ownerResult.rows[0].role as string;
    if (role === 'owner') {
      throw new Error('Owner account cannot be deleted');
    }

    await pool.query('DELETE FROM admins WHERE id = $1', [id]);
    return { deleted: true };
  }
};
