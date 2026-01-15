import { pool } from '../db/connection';
import { getCompanySettings } from './settings.service';

export type LunchReminder = {
  type: 'LUNCH_PLAN' | 'LUNCH_ESCALATE' | 'LUNCH_URGENT';
  dueAt: Date;
  deadlineAt: Date;
};

function hoursToMs(hours: number) {
  return hours * 60 * 60 * 1000;
}

export const reminderService = {
  async getLunchReminder(employeeId: string, workDate: string, now = new Date()) {
    const entriesResult = await pool.query(
      `SELECT action_type, recorded_at
       FROM time_entries
       WHERE employee_id = $1 AND work_date = $2
       ORDER BY recorded_at ASC`,
      [employeeId, workDate]
    );

    const entries = entriesResult.rows as Array<{ action_type: string; recorded_at: Date }>;
    const clockIn = entries.find((entry) => entry.action_type === 'CLOCK_IN')?.recorded_at ?? null;
    const lunchStart = entries.find((entry) => entry.action_type === 'LUNCH_START')?.recorded_at ?? null;

    if (!clockIn || lunchStart) {
      return null;
    }

    const waiverResult = await pool.query(
      `SELECT id FROM waivers WHERE employee_id = $1 AND work_date = $2 AND is_revoked = FALSE LIMIT 1`,
      [employeeId, workDate]
    );

    if ((waiverResult.rowCount ?? 0) > 0) {
      return null;
    }

    const reminderResult = await pool.query(
      `SELECT reminder_type FROM reminders WHERE employee_id = $1 AND work_date = $2`,
      [employeeId, workDate]
    );

    const shown = new Set(reminderResult.rows.map((row) => row.reminder_type as string));
    const settings = await getCompanySettings();

    const elapsedMs = now.getTime() - clockIn.getTime();
    const urgentMs = hoursToMs(settings.lunch_reminder_urgent_hours);
    const escalateMs = hoursToMs(settings.lunch_reminder_2_hours);
    const planMs = hoursToMs(settings.lunch_reminder_1_hours);

    let reminder: LunchReminder | null = null;

    if (elapsedMs >= urgentMs && !shown.has('LUNCH_URGENT')) {
      reminder = {
        type: 'LUNCH_URGENT',
        dueAt: new Date(clockIn.getTime() + urgentMs),
        deadlineAt: new Date(clockIn.getTime() + hoursToMs(5))
      };
    } else if (elapsedMs >= escalateMs && !shown.has('LUNCH_ESCALATE')) {
      reminder = {
        type: 'LUNCH_ESCALATE',
        dueAt: new Date(clockIn.getTime() + escalateMs),
        deadlineAt: new Date(clockIn.getTime() + hoursToMs(5))
      };
    } else if (elapsedMs >= planMs && !shown.has('LUNCH_PLAN')) {
      reminder = {
        type: 'LUNCH_PLAN',
        dueAt: new Date(clockIn.getTime() + planMs),
        deadlineAt: new Date(clockIn.getTime() + hoursToMs(5))
      };
    }

    if (!reminder) {
      return null;
    }

    await pool.query(
      `INSERT INTO reminders (employee_id, work_date, reminder_type, shown_at)
       VALUES ($1, $2, $3, $4)`,
      [employeeId, workDate, reminder.type, now]
    );

    return reminder;
  }
};
