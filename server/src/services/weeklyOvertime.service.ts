import { pool, type Queryable } from '../db/connection';

const WEEKLY_OVERTIME_THRESHOLD_MINUTES = 2400; // 40 hours

export type WeeklySummary = {
  id: string;
  employee_id: string;
  week_start_date: string;
  week_end_date: string;
  total_worked_minutes: number;
  total_daily_overtime_minutes: number;
  total_daily_doubletime_minutes: number;
  weekly_overtime_minutes: number;
  consecutive_days_worked: number;
  is_seventh_day_week: boolean;
  seventh_day_date: string | null;
  seventh_day_overtime_minutes: number;
  seventh_day_doubletime_minutes: number;
};

type DailySummaryRow = {
  work_date: string;
  worked_minutes: number | null;
  overtime_minutes: number | null;
  doubletime_minutes: number | null;
};

/**
 * Get the work week boundaries based on the company's week_start_day setting
 * week_start_day: 0 = Sunday, 1 = Monday, etc.
 */
export function getWorkWeekBounds(
  workDate: string,
  weekStartDay: number = 0
): { start: string; end: string } {
  const date = new Date(workDate + 'T12:00:00Z'); // Use noon to avoid timezone issues
  const dayOfWeek = date.getUTCDay();

  // Calculate days since the start of the work week
  let daysSinceWeekStart = dayOfWeek - weekStartDay;
  if (daysSinceWeekStart < 0) {
    daysSinceWeekStart += 7;
  }

  // Calculate week start date
  const weekStart = new Date(date);
  weekStart.setUTCDate(date.getUTCDate() - daysSinceWeekStart);

  // Calculate week end date (6 days after start)
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10)
  };
}

export const weeklyOvertimeService = {
  /**
   * Get the week_start_day setting from company_settings
   */
  async getWeekStartDay(db: Queryable = pool): Promise<number> {
    const result = await db.query(
      'SELECT week_start_day FROM company_settings WHERE id = 1'
    );
    return result.rows[0]?.week_start_day ?? 0;
  },

  /**
   * Get all daily summaries for a given employee within a work week
   */
  async getDailySummariesForWeek(
    employeeId: string,
    weekStart: string,
    weekEnd: string,
    db: Queryable = pool
  ): Promise<DailySummaryRow[]> {
    const result = await db.query(
      `SELECT work_date, worked_minutes, overtime_minutes, doubletime_minutes
       FROM daily_summaries
       WHERE employee_id = $1
         AND work_date >= $2
         AND work_date <= $3
         AND worked_minutes > 0
       ORDER BY work_date ASC`,
      [employeeId, weekStart, weekEnd]
    );
    return result.rows;
  },

  /**
   * Calculate weekly overtime for an employee
   * Weekly overtime = total hours over 40 that weren't already counted as daily OT
   */
  calculateWeeklyOvertime(
    dailySummaries: DailySummaryRow[],
    isExempt: boolean
  ): {
    totalWorkedMinutes: number;
    totalDailyOvertimeMinutes: number;
    totalDailyDoubletimeMinutes: number;
    weeklyOvertimeMinutes: number;
    consecutiveDaysWorked: number;
  } {
    if (isExempt) {
      return {
        totalWorkedMinutes: dailySummaries.reduce(
          (sum, d) => sum + (d.worked_minutes ?? 0),
          0
        ),
        totalDailyOvertimeMinutes: 0,
        totalDailyDoubletimeMinutes: 0,
        weeklyOvertimeMinutes: 0,
        consecutiveDaysWorked: dailySummaries.length
      };
    }

    const totalWorkedMinutes = dailySummaries.reduce(
      (sum, d) => sum + (d.worked_minutes ?? 0),
      0
    );

    const totalDailyOvertimeMinutes = dailySummaries.reduce(
      (sum, d) => sum + (d.overtime_minutes ?? 0),
      0
    );

    const totalDailyDoubletimeMinutes = dailySummaries.reduce(
      (sum, d) => sum + (d.doubletime_minutes ?? 0),
      0
    );

    // Weekly overtime is hours over 40 that weren't already counted as daily OT/DT
    // This prevents double-counting
    const rawWeeklyOvertime = Math.max(
      0,
      totalWorkedMinutes - WEEKLY_OVERTIME_THRESHOLD_MINUTES
    );

    // Subtract daily OT/DT already counted to avoid double-counting
    const weeklyOvertimeMinutes = Math.max(
      0,
      rawWeeklyOvertime - totalDailyOvertimeMinutes - totalDailyDoubletimeMinutes
    );

    return {
      totalWorkedMinutes,
      totalDailyOvertimeMinutes,
      totalDailyDoubletimeMinutes,
      weeklyOvertimeMinutes,
      consecutiveDaysWorked: dailySummaries.length
    };
  },

  /**
   * Check if a specific date is the 7th consecutive day worked in the work week
   */
  isSeventhConsecutiveDay(
    workDate: string,
    dailySummaries: DailySummaryRow[],
    seventhDayRuleEnabled: boolean
  ): boolean {
    if (!seventhDayRuleEnabled) {
      return false;
    }

    // Need exactly 7 days worked in the week
    if (dailySummaries.length !== 7) {
      return false;
    }

    // Sort by date and check if workDate is the 7th
    const sortedDates = dailySummaries
      .map((d) => d.work_date)
      .sort();

    return sortedDates[6] === workDate;
  },

  /**
   * Calculate overtime for 7th consecutive day
   * California: First 8 hours at 1.5x, beyond 8 hours at 2x
   */
  calculateSeventhDayOvertime(workedMinutes: number): {
    overtimeMinutes: number;
    doubletimeMinutes: number;
  } {
    const EIGHT_HOURS = 480;

    if (workedMinutes <= 0) {
      return { overtimeMinutes: 0, doubletimeMinutes: 0 };
    }

    // All hours on 7th day get special treatment:
    // - First 8 hours: 1.5x (overtime)
    // - Beyond 8 hours: 2x (doubletime)
    return {
      overtimeMinutes: Math.min(workedMinutes, EIGHT_HOURS),
      doubletimeMinutes: Math.max(0, workedMinutes - EIGHT_HOURS)
    };
  },

  /**
   * Recalculate weekly summary for an employee's work week
   */
  async recalculateWeeklySummary(
    employeeId: string,
    workDate: string,
    db: Queryable = pool
  ): Promise<WeeklySummary | null> {
    // Get week start day setting
    const weekStartDay = await this.getWeekStartDay(db);

    // Get week boundaries
    const { start: weekStart, end: weekEnd } = getWorkWeekBounds(
      workDate,
      weekStartDay
    );

    // Get employee exempt status
    const employeeResult = await db.query(
      'SELECT is_exempt FROM employees WHERE id = $1',
      [employeeId]
    );
    const isExempt = employeeResult.rows[0]?.is_exempt ?? false;

    // Get 7th day rule setting
    const settingsResult = await db.query(
      'SELECT seventh_day_rule_enabled FROM company_settings WHERE id = 1'
    );
    const seventhDayRuleEnabled =
      settingsResult.rows[0]?.seventh_day_rule_enabled ?? true;

    // Get all daily summaries for this week
    const dailySummaries = await this.getDailySummariesForWeek(
      employeeId,
      weekStart,
      weekEnd,
      db
    );

    // Calculate weekly overtime
    const {
      totalWorkedMinutes,
      totalDailyOvertimeMinutes,
      totalDailyDoubletimeMinutes,
      weeklyOvertimeMinutes,
      consecutiveDaysWorked
    } = this.calculateWeeklyOvertime(dailySummaries, isExempt);

    // Check for 7th consecutive day
    const isSeventhDayWeek = consecutiveDaysWorked === 7 && seventhDayRuleEnabled && !isExempt;
    let seventhDayDate: string | null = null;
    let seventhDayOvertimeMinutes = 0;
    let seventhDayDoubletimeMinutes = 0;

    if (isSeventhDayWeek) {
      const sortedDates = dailySummaries.map((d) => d.work_date).sort();
      seventhDayDate = sortedDates[6];

      const seventhDaySummary = dailySummaries.find(
        (d) => d.work_date === seventhDayDate
      );
      if (seventhDaySummary) {
        const seventhDayCalc = this.calculateSeventhDayOvertime(
          seventhDaySummary.worked_minutes ?? 0
        );
        seventhDayOvertimeMinutes = seventhDayCalc.overtimeMinutes;
        seventhDayDoubletimeMinutes = seventhDayCalc.doubletimeMinutes;
      }
    }

    // Upsert weekly summary
    const result = await db.query(
      `INSERT INTO weekly_summaries (
        employee_id, week_start_date, week_end_date,
        total_worked_minutes, total_daily_overtime_minutes, total_daily_doubletime_minutes,
        weekly_overtime_minutes, consecutive_days_worked, is_seventh_day_week,
        seventh_day_date, seventh_day_overtime_minutes, seventh_day_doubletime_minutes,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (employee_id, week_start_date)
      DO UPDATE SET
        week_end_date = EXCLUDED.week_end_date,
        total_worked_minutes = EXCLUDED.total_worked_minutes,
        total_daily_overtime_minutes = EXCLUDED.total_daily_overtime_minutes,
        total_daily_doubletime_minutes = EXCLUDED.total_daily_doubletime_minutes,
        weekly_overtime_minutes = EXCLUDED.weekly_overtime_minutes,
        consecutive_days_worked = EXCLUDED.consecutive_days_worked,
        is_seventh_day_week = EXCLUDED.is_seventh_day_week,
        seventh_day_date = EXCLUDED.seventh_day_date,
        seventh_day_overtime_minutes = EXCLUDED.seventh_day_overtime_minutes,
        seventh_day_doubletime_minutes = EXCLUDED.seventh_day_doubletime_minutes,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      [
        employeeId,
        weekStart,
        weekEnd,
        totalWorkedMinutes,
        totalDailyOvertimeMinutes,
        totalDailyDoubletimeMinutes,
        weeklyOvertimeMinutes,
        consecutiveDaysWorked,
        isSeventhDayWeek,
        seventhDayDate,
        seventhDayOvertimeMinutes,
        seventhDayDoubletimeMinutes,
        new Date()
      ]
    );

    return result.rows[0] as WeeklySummary;
  },

  /**
   * Get weekly summary for an employee
   */
  async getWeeklySummary(
    employeeId: string,
    workDate: string,
    db: Queryable = pool
  ): Promise<WeeklySummary | null> {
    const weekStartDay = await this.getWeekStartDay(db);
    const { start: weekStart } = getWorkWeekBounds(workDate, weekStartDay);

    const result = await db.query(
      `SELECT * FROM weekly_summaries
       WHERE employee_id = $1 AND week_start_date = $2`,
      [employeeId, weekStart]
    );

    return result.rowCount ? (result.rows[0] as WeeklySummary) : null;
  }
};
