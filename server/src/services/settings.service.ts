import { pool } from '../db/connection';

export type CompanySettings = {
  company_name: string;
  timezone: string;
  auth_method: string;
  pin_length: number;
  session_duration_employee: number;
  session_duration_admin: number;
  failed_login_lockout_count: number;
  failed_login_lockout_minutes: number;
  mfa_required_admin: boolean;
  lunch_minimum_minutes: number;
  lunch_reminder_1_hours: number;
  lunch_reminder_2_hours: number;
  lunch_reminder_urgent_hours: number;
  allow_first_meal_waiver: boolean;
  allow_second_meal_waiver: boolean;
};

export type SettingsUpdate = Partial<{
  company_name: string;
  timezone: string;
  auth_method: string;
  pin_length: number;
  session_duration_employee: number;
  session_duration_admin: number;
  require_reauth_each_punch: boolean;
  failed_login_lockout_count: number;
  failed_login_lockout_minutes: number;
  mfa_required_admin: boolean;
  feature_clock_enabled: boolean;
  feature_lunch_enabled: boolean;
  feature_breaks_enabled: boolean;
  feature_comments_enabled: boolean;
  feature_gps_enabled: boolean;
  feature_certification_required: boolean;
  lunch_reminder_1_hours: number;
  lunch_reminder_2_hours: number;
  lunch_reminder_urgent_hours: number;
  lunch_minimum_minutes: number;
  lunch_maximum_minutes: number | null;
  allow_first_meal_waiver: boolean;
  allow_second_meal_waiver: boolean;
  auto_flag_short_lunch: boolean;
  require_comment_early_out: boolean;
}>;

const fallbackSettings: CompanySettings = {
  company_name: 'Timekeep',
  timezone: 'America/Los_Angeles',
  auth_method: 'initials_pin',
  pin_length: 4,
  session_duration_employee: 43200,
  session_duration_admin: 28800,
  failed_login_lockout_count: 5,
  failed_login_lockout_minutes: 15,
  mfa_required_admin: true,
  lunch_minimum_minutes: 30,
  lunch_reminder_1_hours: 3.5,
  lunch_reminder_2_hours: 4.5,
  lunch_reminder_urgent_hours: 4.83,
  allow_first_meal_waiver: true,
  allow_second_meal_waiver: true
};

export async function getCompanySettings(): Promise<CompanySettings> {
  const result = await pool.query(
    `SELECT company_name, timezone, auth_method, pin_length, session_duration_employee,
            session_duration_admin, failed_login_lockout_count,
            failed_login_lockout_minutes, mfa_required_admin,
            lunch_minimum_minutes, lunch_reminder_1_hours, lunch_reminder_2_hours,
            lunch_reminder_urgent_hours, allow_first_meal_waiver, allow_second_meal_waiver
     FROM company_settings WHERE id = 1 LIMIT 1`
  );

  if (result.rowCount === 0) {
    const created = await pool.query(
      `INSERT INTO company_settings (company_name)
       VALUES ($1)
       RETURNING company_name, timezone, auth_method, pin_length, session_duration_employee,
                 session_duration_admin, failed_login_lockout_count,
                 failed_login_lockout_minutes, mfa_required_admin,
                 lunch_minimum_minutes, lunch_reminder_1_hours, lunch_reminder_2_hours,
                 lunch_reminder_urgent_hours, allow_first_meal_waiver, allow_second_meal_waiver`,
      [fallbackSettings.company_name]
    );
    return { ...fallbackSettings, ...created.rows[0] } as CompanySettings;
  }

  return { ...fallbackSettings, ...result.rows[0] } as CompanySettings;
}

export async function getSettingsRow() {
  const result = await pool.query('SELECT * FROM company_settings WHERE id = 1 LIMIT 1');
  if (result.rowCount === 0) {
    await getCompanySettings();
    const created = await pool.query('SELECT * FROM company_settings WHERE id = 1 LIMIT 1');
    return created.rows[0];
  }

  return result.rows[0];
}

function buildUpdate(fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  const setClauses = entries.map(([key], index) => `${key} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  return { setClauses, values };
}

export async function updateSettings(input: SettingsUpdate) {
  const { setClauses, values } = buildUpdate({
    ...input,
    updated_at: new Date()
  });

  if (!setClauses.length) {
    return getSettingsRow();
  }

  values.push(1);

  const result = await pool.query(
    `UPDATE company_settings
     SET ${setClauses.join(', ')}
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );

  return result.rows[0];
}
