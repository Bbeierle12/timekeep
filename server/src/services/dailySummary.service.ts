import { pool } from '../db/connection';
import { minutesBetween } from '../utils/time';
import { getCompanySettings } from './settings.service';

export type DailySummary = {
  employee_id: string;
  work_date: string;
  clock_in_at: Date | null;
  clock_out_at: Date | null;
  lunch_start_at: Date | null;
  lunch_end_at: Date | null;
  lunch_duration_minutes: number | null;
  lunch_compliant: boolean | null;
  total_shift_minutes: number | null;
  worked_minutes: number | null;
  has_violation: boolean;
  violation_type: string | null;
  premium_pay_owed: boolean | null;
};

const FIVE_HOURS_MINUTES = 300;
const SIX_HOURS_MINUTES = 360;
const REST_BREAK_FIRST_THRESHOLD = 210;
const REST_BREAK_SECOND_THRESHOLD = 360;
const REST_BREAK_THIRD_THRESHOLD = 600;

function firstMatch(entries: Array<{ action_type: string; recorded_at: Date }>, type: string) {
  return entries.find((entry) => entry.action_type === type)?.recorded_at ?? null;
}

function lastMatch(entries: Array<{ action_type: string; recorded_at: Date }>, type: string) {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (entries[index].action_type === type) {
      return entries[index].recorded_at;
    }
  }
  return null;
}

function calculateBreaksRequired(totalShiftMinutes: number | null) {
  if (totalShiftMinutes === null) return 0;
  if (totalShiftMinutes < REST_BREAK_FIRST_THRESHOLD) return 0;
  if (totalShiftMinutes < REST_BREAK_SECOND_THRESHOLD) return 1;
  if (totalShiftMinutes < REST_BREAK_THIRD_THRESHOLD) return 2;
  return 3;
}

export const dailySummaryService = {
  async getSummary(employeeId: string, workDate: string) {
    const result = await pool.query(
      `SELECT * FROM daily_summaries WHERE employee_id = $1 AND work_date = $2`,
      [employeeId, workDate]
    );

    return result.rowCount ? (result.rows[0] as DailySummary) : null;
  },

  async recalculate(employeeId: string, workDate: string) {
    const settings = await getCompanySettings();
    const entriesResult = await pool.query(
      `SELECT action_type, recorded_at
       FROM time_entries
       WHERE employee_id = $1 AND work_date = $2
       ORDER BY recorded_at ASC`,
      [employeeId, workDate]
    );

    const entries = entriesResult.rows as Array<{ action_type: string; recorded_at: Date }>;

    const clockIn = firstMatch(entries, 'CLOCK_IN');
    const clockOut = lastMatch(entries, 'CLOCK_OUT');
    const lunchStart = firstMatch(entries, 'LUNCH_START');

    let lunchEnd: Date | null = null;
    if (lunchStart) {
      lunchEnd = entries.find(
        (entry) => entry.action_type === 'LUNCH_END' && entry.recorded_at > lunchStart
      )?.recorded_at ?? null;
    }

    const waiverResult = await pool.query(
      `SELECT id FROM waivers WHERE employee_id = $1 AND work_date = $2 AND is_revoked = FALSE LIMIT 1`,
      [employeeId, workDate]
    );

    const hasWaiver = (waiverResult.rowCount ?? 0) > 0;

    const endTime = clockOut ?? new Date();
    const totalShiftMinutes = clockIn ? minutesBetween(clockIn, endTime) : null;
    const lunchDurationMinutes = lunchStart && lunchEnd ? minutesBetween(lunchStart, lunchEnd) : null;
    const workedMinutes =
      totalShiftMinutes !== null
        ? Math.max(0, totalShiftMinutes - (lunchDurationMinutes ?? 0))
        : null;

    const breakAckSet = new Set<string>();
    for (const entry of entries) {
      if (entry.action_type.startsWith('BREAK_ACK_')) {
        breakAckSet.add(entry.action_type);
      }
    }

    const breaksTaken = breakAckSet.size;
    const breaksRequired = calculateBreaksRequired(totalShiftMinutes);

    const lateLunch =
      clockIn && lunchStart ? minutesBetween(clockIn, lunchStart) > FIVE_HOURS_MINUTES : false;
    const shortLunch =
      lunchDurationMinutes !== null && lunchDurationMinutes < settings.lunch_minimum_minutes;

    let missedLunch = false;
    if (!lunchStart && !hasWaiver && totalShiftMinutes !== null) {
      missedLunch = totalShiftMinutes >= FIVE_HOURS_MINUTES;
    }

    const violationType = missedLunch
      ? 'MISSED_LUNCH'
      : lateLunch
        ? 'LATE_LUNCH'
        : shortLunch
          ? 'SHORT_LUNCH'
          : null;

    let lunchCompliant: boolean | null = null;
    if (hasWaiver) {
      lunchCompliant = true;
    } else if (lunchStart && lunchEnd) {
      lunchCompliant = !lateLunch && !shortLunch;
    }

    const hasViolation = Boolean(violationType);

    await pool.query(
      `INSERT INTO daily_summaries
       (employee_id, work_date, clock_in_at, clock_out_at, lunch_start_at, lunch_end_at,
        lunch_duration_minutes, lunch_compliant, total_shift_minutes, worked_minutes,
        breaks_required, breaks_taken,
        has_violation, violation_type, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (employee_id, work_date)
       DO UPDATE SET
         clock_in_at = EXCLUDED.clock_in_at,
         clock_out_at = EXCLUDED.clock_out_at,
         lunch_start_at = EXCLUDED.lunch_start_at,
         lunch_end_at = EXCLUDED.lunch_end_at,
         lunch_duration_minutes = EXCLUDED.lunch_duration_minutes,
         lunch_compliant = EXCLUDED.lunch_compliant,
         total_shift_minutes = EXCLUDED.total_shift_minutes,
         worked_minutes = EXCLUDED.worked_minutes,
         breaks_required = EXCLUDED.breaks_required,
         breaks_taken = EXCLUDED.breaks_taken,
         has_violation = EXCLUDED.has_violation,
         violation_type = EXCLUDED.violation_type,
         updated_at = EXCLUDED.updated_at`,
      [
        employeeId,
        workDate,
        clockIn,
        clockOut,
        lunchStart,
        lunchEnd,
        lunchDurationMinutes,
        lunchCompliant,
        totalShiftMinutes,
        workedMinutes,
        breaksRequired,
        breaksTaken,
        hasViolation,
        violationType,
        new Date()
      ]
    );

    return this.getSummary(employeeId, workDate);
  },

  async flagPremiumPay(employeeId: string, workDate: string, premiumPayOwed: boolean) {
    await pool.query(
      `UPDATE daily_summaries
       SET premium_pay_owed = $1,
           updated_at = $2
       WHERE employee_id = $3 AND work_date = $4`,
      [premiumPayOwed, new Date(), employeeId, workDate]
    );
  },

  isWaiverEligible(totalShiftMinutes: number | null) {
    if (totalShiftMinutes === null) return true;
    return totalShiftMinutes <= SIX_HOURS_MINUTES;
  }
};
