import { pool } from '../db/connection';

export type PushTokenInput = {
  employeeId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceInfo?: string | null;
};

export const pushTokenService = {
  async register(input: PushTokenInput) {
    const result = await pool.query(
      `INSERT INTO push_tokens (employee_id, token, platform, device_info, last_seen, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (token)
       DO UPDATE SET employee_id = EXCLUDED.employee_id,
                    platform = EXCLUDED.platform,
                    device_info = EXCLUDED.device_info,
                    last_seen = EXCLUDED.last_seen,
                    is_active = TRUE
       RETURNING id, employee_id, token, platform, device_info, last_seen, is_active`,
      [input.employeeId, input.token, input.platform, input.deviceInfo ?? null, new Date()]
    );

    return result.rows[0];
  },

  async revoke(employeeId: string, token: string) {
    const result = await pool.query(
      `UPDATE push_tokens
       SET is_active = FALSE,
           last_seen = $1
       WHERE employee_id = $2 AND token = $3
       RETURNING id`,
      [new Date(), employeeId, token]
    );

    return result.rowCount ? result.rows[0] : null;
  }
};
