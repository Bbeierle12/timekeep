import { pool } from '../db/connection';
import { getCompanySettings } from './settings.service';

export type ComplianceAlert = {
  employeeId: string;
  initials: string;
  fullName: string;
  elapsedMinutes: number;
  type: 'LUNCH_PLAN' | 'LUNCH_ESCALATE' | 'LUNCH_URGENT';
};

export type ComplianceDashboard = {
  date: string;
  totalEmployees: number;
  clockedInCount: number;
  onLunchCount: number;
  clockedOutCount: number;
  pendingCertifications: number;
  violationsToday: number;
  waiversToday: number;
  attestationsToday: number;
  activeAlerts: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high';
    employeeId: string;
    employeeName: string;
    message: string;
    createdAt: string;
  }>;
};

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number) {
  const copy = new Date(value);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export const complianceService = {
  async getDashboard(workDate?: string): Promise<ComplianceDashboard> {
    const now = new Date();
    const date = workDate ?? dateOnly(now);
    const settings = await getCompanySettings();

    // Total active employees
    const totalEmployeesResult = await pool.query(
      `SELECT COUNT(*) AS count FROM employees WHERE is_active = TRUE`
    );

    // Clocked in (working, not on lunch, not clocked out)
    const clockedInResult = await pool.query(
      `SELECT COUNT(DISTINCT te.employee_id) AS count
       FROM time_entries te
       WHERE te.work_date = $1
         AND te.action_type = 'CLOCK_IN'
         AND NOT EXISTS (
           SELECT 1 FROM time_entries t2
           WHERE t2.employee_id = te.employee_id
             AND t2.work_date = $1
             AND t2.action_type = 'CLOCK_OUT'
         )
         AND NOT EXISTS (
           SELECT 1 FROM time_entries t3
           WHERE t3.employee_id = te.employee_id
             AND t3.work_date = $1
             AND t3.action_type = 'LUNCH_START'
             AND NOT EXISTS (
               SELECT 1 FROM time_entries t4
               WHERE t4.employee_id = te.employee_id
                 AND t4.work_date = $1
                 AND t4.action_type = 'LUNCH_END'
             )
         )`,
      [date]
    );

    // On lunch (lunch started but not ended, not clocked out)
    const onLunchResult = await pool.query(
      `SELECT COUNT(DISTINCT te.employee_id) AS count
       FROM time_entries te
       WHERE te.work_date = $1
         AND te.action_type = 'LUNCH_START'
         AND NOT EXISTS (
           SELECT 1 FROM time_entries t2
           WHERE t2.employee_id = te.employee_id
             AND t2.work_date = $1
             AND t2.action_type = 'LUNCH_END'
         )
         AND NOT EXISTS (
           SELECT 1 FROM time_entries t3
           WHERE t3.employee_id = te.employee_id
             AND t3.work_date = $1
             AND t3.action_type = 'CLOCK_OUT'
         )`,
      [date]
    );

    // Clocked out
    const clockedOutResult = await pool.query(
      `SELECT COUNT(DISTINCT te.employee_id) AS count
       FROM time_entries te
       WHERE te.work_date = $1
         AND te.action_type = 'CLOCK_OUT'`,
      [date]
    );

    // Pending certifications
    const pendingCertificationsResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM daily_summaries
       WHERE work_date = $1 AND is_certified = FALSE AND clock_out_at IS NOT NULL`,
      [date]
    );

    // Violations today
    const violationsResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM daily_summaries
       WHERE work_date = $1 AND has_violation = TRUE`,
      [date]
    );

    // Waivers today
    const waiversResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM waivers
       WHERE work_date = $1 AND is_revoked = FALSE`,
      [date]
    );

    // Attestations today
    const attestationsResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM attestations
       WHERE work_date = $1`,
      [date]
    );

    const rawAlerts = await this.getActiveAlerts(date, now, settings.lunch_reminder_1_hours,
      settings.lunch_reminder_2_hours, settings.lunch_reminder_urgent_hours);

    // Transform alerts to frontend format
    const activeAlerts = rawAlerts.map((alert, index) => {
      const severityMap: Record<string, 'low' | 'medium' | 'high'> = {
        'LUNCH_PLAN': 'low',
        'LUNCH_ESCALATE': 'medium',
        'LUNCH_URGENT': 'high'
      };
      const messageMap: Record<string, string> = {
        'LUNCH_PLAN': `Has been working ${alert.elapsedMinutes} minutes without a lunch break`,
        'LUNCH_ESCALATE': `Approaching lunch deadline - ${alert.elapsedMinutes} minutes since clock in`,
        'LUNCH_URGENT': `URGENT: ${alert.elapsedMinutes} minutes without lunch - compliance violation imminent`
      };

      return {
        id: `alert-${alert.employeeId}-${index}`,
        type: alert.type,
        severity: severityMap[alert.type] ?? 'medium',
        employeeId: alert.employeeId,
        employeeName: alert.fullName,
        message: messageMap[alert.type] ?? `Lunch compliance alert`,
        createdAt: now.toISOString()
      };
    });

    return {
      date,
      totalEmployees: Number(totalEmployeesResult.rows[0].count ?? 0),
      clockedInCount: Number(clockedInResult.rows[0].count ?? 0),
      onLunchCount: Number(onLunchResult.rows[0].count ?? 0),
      clockedOutCount: Number(clockedOutResult.rows[0].count ?? 0),
      pendingCertifications: Number(pendingCertificationsResult.rows[0].count ?? 0),
      violationsToday: Number(violationsResult.rows[0].count ?? 0),
      waiversToday: Number(waiversResult.rows[0].count ?? 0),
      attestationsToday: Number(attestationsResult.rows[0].count ?? 0),
      activeAlerts
    };
  },

  async getActiveAlerts(
    date: string,
    now: Date,
    reminder1: number,
    reminder2: number,
    reminderUrgent: number
  ) {
    const entriesResult = await pool.query(
      `SELECT e.id, e.initials, e.full_name,
              MIN(CASE WHEN te.action_type = 'CLOCK_IN' THEN te.recorded_at END) AS clock_in_at,
              MIN(CASE WHEN te.action_type = 'LUNCH_START' THEN te.recorded_at END) AS lunch_start_at,
              MIN(CASE WHEN te.action_type = 'CLOCK_OUT' THEN te.recorded_at END) AS clock_out_at
       FROM time_entries te
       JOIN employees e ON e.id = te.employee_id
       WHERE te.work_date = $1
       GROUP BY e.id, e.initials, e.full_name`,
      [date]
    );

    const waiversResult = await pool.query(
      `SELECT employee_id FROM waivers WHERE work_date = $1 AND is_revoked = FALSE`,
      [date]
    );

    const waived = new Set(waiversResult.rows.map((row) => row.employee_id as string));

    const alerts: ComplianceAlert[] = [];
    const reminder1Ms = reminder1 * 60 * 60 * 1000;
    const reminder2Ms = reminder2 * 60 * 60 * 1000;
    const urgentMs = reminderUrgent * 60 * 60 * 1000;

    for (const row of entriesResult.rows) {
      const clockIn = row.clock_in_at as Date | null;
      const lunchStart = row.lunch_start_at as Date | null;
      const clockOut = row.clock_out_at as Date | null;

      if (!clockIn || lunchStart || clockOut) continue;
      if (waived.has(row.id as string)) continue;

      const elapsedMs = now.getTime() - clockIn.getTime();
      let type: ComplianceAlert['type'] | null = null;

      if (elapsedMs >= urgentMs) type = 'LUNCH_URGENT';
      else if (elapsedMs >= reminder2Ms) type = 'LUNCH_ESCALATE';
      else if (elapsedMs >= reminder1Ms) type = 'LUNCH_PLAN';

      if (type) {
        alerts.push({
          employeeId: row.id as string,
          initials: row.initials as string,
          fullName: row.full_name as string,
          elapsedMinutes: Math.floor(elapsedMs / 60000),
          type
        });
      }
    }

    return alerts;
  },

  async listViolations(params: { start?: string; end?: string; limit?: number }) {
    const filters: string[] = ['has_violation = TRUE'];
    const values: Array<string | number> = [];

    if (params.start) {
      values.push(params.start);
      filters.push(`work_date >= $${values.length}`);
    }

    if (params.end) {
      values.push(params.end);
      filters.push(`work_date <= $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const limit = params.limit ?? 200;
    values.push(limit);

    const result = await pool.query(
      `SELECT ds.work_date, ds.employee_id, ds.violation_type, ds.premium_pay_owed,
              ds.premium_pay_amount, e.initials, e.full_name
       FROM daily_summaries ds
       JOIN employees e ON e.id = ds.employee_id
       ${where}
       ORDER BY ds.work_date DESC
       LIMIT $${values.length}`,
      values
    );

    return result.rows;
  },

  async listWaivers(params: { start?: string; end?: string; limit?: number }) {
    const filters: string[] = [];
    const values: Array<string | number> = [];

    if (params.start) {
      values.push(params.start);
      filters.push(`work_date >= $${values.length}`);
    }

    if (params.end) {
      values.push(params.end);
      filters.push(`work_date <= $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const limit = params.limit ?? 200;
    values.push(limit);

    const result = await pool.query(
      `SELECT w.work_date, w.employee_id, w.waiver_type, w.signed_at, w.is_revoked,
              e.initials, e.full_name
       FROM waivers w
       JOIN employees e ON e.id = w.employee_id
       ${where}
       ORDER BY w.signed_at DESC
       LIMIT $${values.length}`,
      values
    );

    return result.rows;
  },

  async listAttestations(params: { start?: string; end?: string; limit?: number }) {
    const filters: string[] = [];
    const values: Array<string | number> = [];

    if (params.start) {
      values.push(params.start);
      filters.push(`work_date >= $${values.length}`);
    }

    if (params.end) {
      values.push(params.end);
      filters.push(`work_date <= $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const limit = params.limit ?? 200;
    values.push(limit);

    const result = await pool.query(
      `SELECT a.work_date, a.employee_id, a.attestation_type, a.selected_option,
              a.triggers_premium, a.signed_at, e.initials, e.full_name
       FROM attestations a
       JOIN employees e ON e.id = a.employee_id
       ${where}
       ORDER BY a.signed_at DESC
       LIMIT $${values.length}`,
      values
    );

    return result.rows;
  }
};
