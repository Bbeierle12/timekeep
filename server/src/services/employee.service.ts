import { pool } from '../db/connection';
import { hashPassword, verifyPassword } from '../utils/hash';
import { getCompanySettings } from './settings.service';

export type EmployeeRecord = {
  id: string;
  initials: string;
  full_name: string;
  is_active: boolean;
  is_exempt: boolean;
  email: string | null;
  phone_number: string | null;
  hire_date: string | null;
  hourly_rate: string | null;
  access_status: string;
};

export type CreateEmployeeInput = {
  initials: string;
  fullName: string;
  isExempt: boolean;
  pin?: string;
  email?: string | null;
  phoneNumber?: string | null;
  hireDate?: string | null;
  hourlyRate?: number | null;
  notes?: string | null;
  siteId?: string | null;
  createdBy?: string | null;
};

export type UpdateEmployeeInput = {
  initials?: string;
  fullName?: string;
  isExempt?: boolean;
  email?: string | null;
  phoneNumber?: string | null;
  hireDate?: string | null;
  hourlyRate?: number | null;
  notes?: string | null;
  siteId?: string | null;
  isActive?: boolean;
};

function buildUpdate(fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  const setClauses = entries.map(([key], index) => `${key} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  return { setClauses, values };
}

export const employeeService = {
  async list(params: { status?: 'active' | 'inactive' | 'all'; search?: string }) {
    const filters: string[] = [];
    const values: Array<string | boolean> = [];

    if (params.status === 'active') {
      values.push(true);
      filters.push(`is_active = $${values.length}`);
    }

    if (params.status === 'inactive') {
      values.push(false);
      filters.push(`is_active = $${values.length}`);
    }

    if (params.search) {
      values.push(`%${params.search}%`);
      filters.push(`(full_name ILIKE $${values.length} OR initials ILIKE $${values.length})`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, initials, full_name, is_active, is_exempt, email, phone_number,
              hire_date, hourly_rate, access_status
       FROM employees
       ${whereClause}
       ORDER BY full_name ASC`,
      values
    );

    return result.rows as EmployeeRecord[];
  },

  async getById(id: string) {
    const result = await pool.query(
      `SELECT id, initials, full_name, is_active, is_exempt, email, phone_number,
              hire_date, hourly_rate, access_status, notes, site_id
       FROM employees
       WHERE id = $1`,
      [id]
    );

    return result.rowCount ? result.rows[0] : null;
  },

  async create(input: CreateEmployeeInput) {
    const settings = await getCompanySettings();
    const initials = input.initials.trim().toUpperCase();
    const pinHash = input.pin ? await hashPassword(input.pin) : null;

    if (settings.auth_method === 'pin' || settings.auth_method === 'initials_pin') {
      if (!pinHash) {
        throw new Error('PIN required for current authentication method');
      }
    }

    const result = await pool.query(
      `INSERT INTO employees
       (initials, full_name, is_exempt, pin_hash, email, phone_number, hire_date,
        hourly_rate, notes, site_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, initials, full_name, is_active, is_exempt, email, phone_number,
                 hire_date, hourly_rate, access_status`,
      [
        initials,
        input.fullName,
        input.isExempt,
        pinHash,
        input.email ?? null,
        input.phoneNumber ?? null,
        input.hireDate ?? null,
        input.hourlyRate ?? null,
        input.notes ?? null,
        input.siteId ?? null,
        input.createdBy ?? null
      ]
    );

    return result.rows[0] as EmployeeRecord;
  },

  async update(id: string, input: UpdateEmployeeInput) {
    const fields: Record<string, unknown> = {
      initials: input.initials ? input.initials.trim().toUpperCase() : undefined,
      full_name: input.fullName,
      is_exempt: input.isExempt,
      email: input.email,
      phone_number: input.phoneNumber,
      hire_date: input.hireDate,
      hourly_rate: input.hourlyRate,
      notes: input.notes,
      site_id: input.siteId,
      is_active: input.isActive,
      updated_at: new Date()
    };

    const { setClauses, values } = buildUpdate(fields);

    if (setClauses.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE employees
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, initials, full_name, is_active, is_exempt, email, phone_number,
                 hire_date, hourly_rate, access_status`,
      values
    );

    return result.rowCount ? (result.rows[0] as EmployeeRecord) : null;
  },

  async deactivate(id: string, adminId?: string) {
    const result = await pool.query(
      `UPDATE employees
       SET is_active = FALSE,
           deactivated_at = $1,
           deactivated_by = $2
       WHERE id = $3
       RETURNING id, initials, full_name, is_active`,
      [new Date(), adminId ?? null, id]
    );

    return result.rowCount ? result.rows[0] : null;
  },

  async reactivate(id: string) {
    const result = await pool.query(
      `UPDATE employees
       SET is_active = TRUE,
           deactivated_at = NULL,
           deactivated_by = NULL
       WHERE id = $1
       RETURNING id, initials, full_name, is_active`,
      [id]
    );

    return result.rowCount ? result.rows[0] : null;
  },

  async resetPin(id: string, pin: string) {
    const pinHash = await hashPassword(pin);
    const result = await pool.query(
      `UPDATE employees
       SET pin_hash = $1,
           failed_login_count = 0,
           locked_until = NULL
       WHERE id = $2
       RETURNING id, initials, full_name`,
      [pinHash, id]
    );

    return result.rowCount ? result.rows[0] : null;
  },

  async verifyPin(id: string, pin: string) {
    const result = await pool.query('SELECT pin_hash FROM employees WHERE id = $1', [id]);
    if (result.rowCount === 0) return false;
    const hash = result.rows[0].pin_hash as string | null;
    if (!hash) return false;
    return verifyPassword(pin, hash);
  },

  async updatePin(id: string, newPin: string) {
    const pinHash = await hashPassword(newPin);
    await pool.query('UPDATE employees SET pin_hash = $1 WHERE id = $2', [pinHash, id]);
  }
};
