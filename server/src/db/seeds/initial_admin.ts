import { pool } from '../connection';
import { hashPassword } from '../../utils/hash';

export type SeedAdminInput = {
  email: string;
  password: string;
  name: string;
  role?: 'owner' | 'admin';
  mfaEnabled?: boolean;
};

export async function seedInitialAdmin(input: SeedAdminInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await pool.query('SELECT id FROM admins WHERE email = $1 LIMIT 1', [email]);
  if (existing.rowCount) {
    return { created: false, adminId: existing.rows[0].id as string };
  }

  const passwordHash = await hashPassword(input.password);
  const result = await pool.query(
    `INSERT INTO admins (email, password_hash, name, role, mfa_enabled)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [email, passwordHash, input.name, input.role ?? 'owner', input.mfaEnabled ?? false]
  );

  return { created: true, adminId: result.rows[0].id as string };
}
