import { pool } from '../db/connection';
import { getCompanySettings } from './settings.service';
import { dailySummaryService } from './dailySummary.service';

export type PunchInput = {
  employeeId: string;
  actionType:
    | 'CLOCK_IN'
    | 'CLOCK_OUT'
    | 'LUNCH_START'
    | 'LUNCH_END'
    | 'BREAK_ACK_1'
    | 'BREAK_ACK_2'
    | 'BREAK_ACK_3'
    | 'BREAK_SKIP_1'
    | 'BREAK_SKIP_2'
    | 'BREAK_SKIP_3';
  recordedAt: Date;
  comment?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  gpsAccuracyMeters?: number | null;
  resolvedAddress?: string | null;
  gpsUnavailable?: boolean | null;
};

function getWorkDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const timeEntryService = {
  async recordPunch(input: PunchInput) {
    const workDate = getWorkDate(input.recordedAt);
    const settings = await getCompanySettings();
    const entriesResult = await pool.query(
      `SELECT action_type, recorded_at
       FROM time_entries
       WHERE employee_id = $1 AND work_date = $2
       ORDER BY recorded_at ASC`,
      [input.employeeId, workDate]
    );

    const entries = entriesResult.rows as Array<{ action_type: string; recorded_at: Date }>;
    const hasAction = (action: string) => entries.some((entry) => entry.action_type === action);
    const clockIn = entries.find((entry) => entry.action_type === 'CLOCK_IN')?.recorded_at ?? null;
    const clockOut = entries.find((entry) => entry.action_type === 'CLOCK_OUT')?.recorded_at ?? null;
    const lunchStart = entries.find((entry) => entry.action_type === 'LUNCH_START')?.recorded_at ?? null;
    const lunchEnd = entries.find((entry) => entry.action_type === 'LUNCH_END')?.recorded_at ?? null;

    const breakMatch = input.actionType.match(/^BREAK_(ACK|SKIP)_(\d)$/);

    if (input.actionType === 'CLOCK_IN' && hasAction('CLOCK_IN')) {
      throw new Error('Already clocked in for the day');
    }

    if (input.actionType === 'CLOCK_OUT') {
      if (!clockIn) throw new Error('Clock in required before clock out');
      if (clockOut) throw new Error('Already clocked out for the day');
    }

    if (input.actionType === 'LUNCH_START') {
      if (!clockIn) throw new Error('Clock in required before lunch');
      if (lunchStart) throw new Error('Lunch already started');
      if (clockOut) throw new Error('Cannot start lunch after clock out');
    }

    if (input.actionType === 'LUNCH_END') {
      if (!lunchStart) throw new Error('Lunch has not started');
      if (lunchEnd) throw new Error('Lunch already ended');
      const lunchMinutes = Math.floor((input.recordedAt.getTime() - lunchStart.getTime()) / 60000);
      if (lunchMinutes < settings.lunch_minimum_minutes) {
        throw new Error('Lunch duration below minimum');
      }
    }

    if (breakMatch) {
      if (!clockIn) throw new Error('Clock in required before break');
      if (clockOut) throw new Error('Cannot take break after clock out');
      if (lunchStart && !lunchEnd) throw new Error('Cannot take break during lunch');

      const breakNumber = breakMatch[2];
      const ackAction = `BREAK_ACK_${breakNumber}`;
      const skipAction = `BREAK_SKIP_${breakNumber}`;

      if (hasAction(ackAction) || hasAction(skipAction)) {
        throw new Error('Break already recorded');
      }
    }

    const result = await pool.query(
      `INSERT INTO time_entries
       (employee_id, work_date, action_type, recorded_at, comment, gps_latitude,
        gps_longitude, gps_accuracy_meters, resolved_address, gps_unavailable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, employee_id, work_date, action_type, recorded_at, comment,
                 resolved_address`,
      [
        input.employeeId,
        workDate,
        input.actionType,
        input.recordedAt,
        input.comment ?? null,
        input.gpsLatitude ?? null,
        input.gpsLongitude ?? null,
        input.gpsAccuracyMeters ?? null,
        input.resolvedAddress ?? null,
        input.gpsUnavailable ?? null
      ]
    );

    const entry = result.rows[0];
    await dailySummaryService.recalculate(input.employeeId, workDate);
    return entry;
  },

  async recordBatch(employeeId: string, punches: Omit<PunchInput, 'employeeId'>[]) {
    const results = [];
    for (const punch of punches) {
      const entry = await this.recordPunch({ ...punch, employeeId });
      results.push(entry);
    }
    return results;
  },

  async getEntriesForEmployee(employeeId: string, date?: string) {
    const values: string[] = [employeeId];
    let where = 'employee_id = $1';

    if (date) {
      values.push(date);
      where += ` AND work_date = $${values.length}`;
    }

    const result = await pool.query(
      `SELECT id, work_date, action_type, recorded_at, comment, resolved_address
       FROM time_entries
       WHERE ${where}
       ORDER BY recorded_at ASC`,
      values
    );

    return result.rows;
  },

  async listEntriesForEmployee(employeeId: string, limit = 100) {
    const result = await pool.query(
      `SELECT id, work_date, action_type, recorded_at, comment, resolved_address
       FROM time_entries
       WHERE employee_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [employeeId, limit]
    );

    return result.rows;
  },

  async getEntriesForDate(date: string) {
    const result = await pool.query(
      `SELECT te.id, te.employee_id, te.work_date, te.action_type, te.recorded_at,
              te.comment, te.resolved_address, e.initials, e.full_name
       FROM time_entries te
       JOIN employees e ON e.id = te.employee_id
       WHERE te.work_date = $1
       ORDER BY e.initials ASC, te.recorded_at ASC`,
      [date]
    );

    return result.rows;
  },

  async listEntries(limit = 200) {
    const result = await pool.query(
      `SELECT te.id, te.employee_id, te.work_date, te.action_type, te.recorded_at,
              te.comment, te.resolved_address, e.initials, e.full_name
       FROM time_entries te
       JOIN employees e ON e.id = te.employee_id
       ORDER BY te.recorded_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }
};
