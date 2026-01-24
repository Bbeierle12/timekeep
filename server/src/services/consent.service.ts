import { pool } from '../db/connection';
import { CCPA_CONSENT_TYPE, CCPA_CONSENT_VERSION } from '../config/consent';

type ConsentRecord = {
  accepted: boolean;
  consented_at: Date;
  consent_version: string;
};

export const consentService = {
  async getLatest(employeeId: string) {
    const result = await pool.query(
      `SELECT accepted, consented_at, consent_version
       FROM employee_consents
       WHERE employee_id = $1 AND consent_type = $2
       ORDER BY consented_at DESC
       LIMIT 1`,
      [employeeId, CCPA_CONSENT_TYPE]
    );

    return (result.rows[0] as ConsentRecord | undefined) ?? null;
  },

  async record({
    employeeId,
    accepted,
    ipAddress,
    userAgent
  }: {
    employeeId: string;
    accepted: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const result = await pool.query(
      `INSERT INTO employee_consents
       (employee_id, consent_type, consent_version, accepted, consented_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING accepted, consented_at, consent_version`,
      [
        employeeId,
        CCPA_CONSENT_TYPE,
        CCPA_CONSENT_VERSION,
        accepted,
        new Date(),
        ipAddress ?? null,
        userAgent ?? null
      ]
    );

    return result.rows[0] as ConsentRecord;
  }
};
