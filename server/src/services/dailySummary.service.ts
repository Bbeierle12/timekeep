import { pool, type Queryable } from '../db/connection';
import { minutesBetween } from '../utils/time';
import { getCompanySettings } from './settings.service';
import { formatInTimeZone } from 'date-fns-tz';

export type DailySummary = {
  employee_id: string;
  work_date: string;
  clock_in_at: Date | null;
  clock_out_at: Date | null;
  lunch_start_at: Date | null;
  lunch_end_at: Date | null;
  lunch_duration_minutes: number | null;
  lunch_compliant: boolean | null;
  second_lunch_start_at: Date | null;
  second_lunch_end_at: Date | null;
  second_lunch_duration_minutes: number | null;
  second_lunch_compliant: boolean | null;
  second_lunch_violation_type: string | null;
  total_shift_minutes: number | null;
  worked_minutes: number | null;
  has_violation: boolean;
  violation_type: string | null;
  premium_pay_owed: boolean | null;
  premium_pay_amount: number | null;
  shift_crosses_midnight: boolean;
  has_split_shift: boolean;
  split_shift_gap_minutes: number | null;
  split_shift_premium_owed: boolean;
  third_lunch_start_at: Date | null;
  third_lunch_end_at: Date | null;
  third_lunch_duration_minutes: number | null;
  third_lunch_compliant: boolean | null;
  third_lunch_violation_type: string | null;
};

const FIVE_HOURS_MINUTES = 300;
const SIX_HOURS_MINUTES = 360;
const EIGHT_HOURS_MINUTES = 480;  // Regular time threshold (California daily OT)
const TEN_HOURS_MINUTES = 600;
const TWELVE_HOURS_MINUTES = 720; // Doubletime threshold (California daily OT)
const FIFTEEN_HOURS_MINUTES = 900;
const REST_BREAK_FIRST_THRESHOLD = 210;
const REST_BREAK_SECOND_THRESHOLD = 360;
const REST_BREAK_THIRD_THRESHOLD = 600;
const SPLIT_SHIFT_GAP_MINUTES = 60; // Gap > 1 hour indicates split shift

/**
 * Calculate California daily overtime and doubletime
 * - Regular time: first 8 hours
 * - Overtime (1.5x): hours 8-12
 * - Doubletime (2x): beyond 12 hours
 */
function calculateOvertimeMinutes(workedMinutes: number | null): { overtime: number; doubletime: number } {
  if (workedMinutes === null || workedMinutes <= EIGHT_HOURS_MINUTES) {
    return { overtime: 0, doubletime: 0 };
  }

  if (workedMinutes <= TWELVE_HOURS_MINUTES) {
    // Between 8-12 hours: all extra time is overtime
    return {
      overtime: workedMinutes - EIGHT_HOURS_MINUTES,
      doubletime: 0
    };
  }

  // Beyond 12 hours: 4 hours of overtime + rest is doubletime
  return {
    overtime: TWELVE_HOURS_MINUTES - EIGHT_HOURS_MINUTES, // Always 4 hours (240 minutes)
    doubletime: workedMinutes - TWELVE_HOURS_MINUTES
  };
}

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
  async getSummary(employeeId: string, workDate: string, db: Queryable = pool) {
    const result = await db.query(
      `SELECT * FROM daily_summaries WHERE employee_id = $1 AND work_date = $2`,
      [employeeId, workDate]
    );

    return result.rowCount ? (result.rows[0] as DailySummary) : null;
  },

  async recalculate(employeeId: string, workDate: string, db: Queryable = pool) {
    const settings = await getCompanySettings();

    // Check if employee is exempt from compliance tracking
    const employeeResult = await db.query(
      'SELECT is_exempt FROM employees WHERE id = $1',
      [employeeId]
    );
    const isExempt = employeeResult.rows[0]?.is_exempt ?? false;

    const entriesResult = await db.query(
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
      lunchEnd =
        entries.find(
          (entry) => entry.action_type === 'LUNCH_END' && entry.recorded_at > lunchStart
        )?.recorded_at ?? null;
    }

    const secondLunchStart = firstMatch(entries, 'SECOND_LUNCH_START');
    let secondLunchEnd: Date | null = null;
    if (secondLunchStart) {
      secondLunchEnd =
        entries.find(
          (entry) => entry.action_type === 'SECOND_LUNCH_END' && entry.recorded_at > secondLunchStart
        )?.recorded_at ?? null;
    }

    // Third meal period tracking (for 15+ hour shifts)
    const thirdLunchStart = firstMatch(entries, 'THIRD_LUNCH_START');
    let thirdLunchEnd: Date | null = null;
    if (thirdLunchStart) {
      thirdLunchEnd =
        entries.find(
          (entry) => entry.action_type === 'THIRD_LUNCH_END' && entry.recorded_at > thirdLunchStart
        )?.recorded_at ?? null;
    }

    const waiverResult = await db.query(
      `SELECT id, waiver_type FROM waivers WHERE employee_id = $1 AND work_date = $2 AND is_revoked = FALSE AND is_invalid = FALSE`,
      [employeeId, workDate]
    );

    const waivers = waiverResult.rows as Array<{ id: string; waiver_type: string }>;
    const hasFirstMealWaiver = waivers.some((w) => w.waiver_type === 'FIRST_MEAL_WAIVER');
    const hasSecondMealWaiver = waivers.some((w) => w.waiver_type === 'SECOND_MEAL_WAIVER');
    const hasWaiver = hasFirstMealWaiver;

    const endTime = clockOut ?? new Date();
    const totalShiftMinutes = clockIn ? minutesBetween(clockIn, endTime) : null;

    // Detect if shift crosses midnight (overnight shift)
    const timezone = settings.timezone || 'America/Los_Angeles';
    let shiftCrossesMidnight = false;
    if (clockIn && clockOut) {
      const clockInDate = formatInTimeZone(clockIn, timezone, 'yyyy-MM-dd');
      const clockOutDate = formatInTimeZone(clockOut, timezone, 'yyyy-MM-dd');
      shiftCrossesMidnight = clockInDate !== clockOutDate;
    }

    const lunchDurationMinutes = lunchStart && lunchEnd ? minutesBetween(lunchStart, lunchEnd) : null;
    const secondLunchDurationMinutes =
      secondLunchStart && secondLunchEnd ? minutesBetween(secondLunchStart, secondLunchEnd) : null;
    const thirdLunchDurationMinutes =
      thirdLunchStart && thirdLunchEnd ? minutesBetween(thirdLunchStart, thirdLunchEnd) : null;
    const totalLunchMinutes =
      (lunchDurationMinutes ?? 0) + (secondLunchDurationMinutes ?? 0) + (thirdLunchDurationMinutes ?? 0);
    const workedMinutes =
      totalShiftMinutes !== null ? Math.max(0, totalShiftMinutes - totalLunchMinutes) : null;

    // Calculate California daily overtime and doubletime
    // Exempt employees don't get overtime
    const { overtime: overtimeMinutes, doubletime: doubletimeMinutes } = isExempt
      ? { overtime: 0, doubletime: 0 }
      : calculateOvertimeMinutes(workedMinutes);

    // Split shift detection: check for gaps > 1 hour between meal end and next work segment
    // A split shift occurs when lunch period exceeds normal duration significantly
    let hasSplitShift = false;
    let splitShiftGapMinutes: number | null = null;

    if (lunchDurationMinutes && lunchDurationMinutes > SPLIT_SHIFT_GAP_MINUTES) {
      // Lunch longer than 1 hour may indicate a split shift
      const excessGap = lunchDurationMinutes - settings.lunch_minimum_minutes;
      if (excessGap > SPLIT_SHIFT_GAP_MINUTES) {
        hasSplitShift = true;
        splitShiftGapMinutes = excessGap;
      }
    }

    // California split shift premium is owed when shift spans more than 10 hours
    // with a gap of 1+ hour between segments
    const splitShiftPremiumOwed = hasSplitShift && (totalShiftMinutes ?? 0) > TEN_HOURS_MINUTES;

    const breakAckSet = new Set<string>();
    for (const entry of entries) {
      if (entry.action_type.startsWith('BREAK_ACK_')) {
        breakAckSet.add(entry.action_type);
      }
    }

    const breaksTaken = breakAckSet.size;
    const breaksRequired = isExempt ? 0 : calculateBreaksRequired(totalShiftMinutes);

    // Skip violation detection for exempt employees
    let violationType: string | null = null;
    let lunchCompliant: boolean | null = null;
    let secondLunchViolationType: string | null = null;
    let secondLunchCompliant: boolean | null = null;
    let thirdLunchViolationType: string | null = null;
    let thirdLunchCompliant: boolean | null = null;

    if (!isExempt) {
      const lateLunch =
        clockIn && lunchStart ? minutesBetween(clockIn, lunchStart) >= FIVE_HOURS_MINUTES : false;
      const shortLunch =
        lunchDurationMinutes !== null && lunchDurationMinutes < settings.lunch_minimum_minutes;

      let missedLunch = false;
      if (!lunchStart && !hasWaiver && totalShiftMinutes !== null) {
        missedLunch = totalShiftMinutes >= FIVE_HOURS_MINUTES;
      }

      violationType = missedLunch
        ? 'MISSED_LUNCH'
        : lateLunch
          ? 'LATE_LUNCH'
          : shortLunch
            ? 'SHORT_LUNCH'
            : null;

      if (hasWaiver) {
        lunchCompliant = true;
      } else if (lunchStart && lunchEnd) {
        lunchCompliant = !lateLunch && !shortLunch;
      }

      // Second meal period compliance (required for shifts > 10 hours)
      const secondMealRequired =
        totalShiftMinutes !== null && totalShiftMinutes > TEN_HOURS_MINUTES;

      if (secondMealRequired) {
        // Second meal waiver only valid if shift <= 12 hours AND first meal was taken
        const secondWaiverEligible =
          totalShiftMinutes !== null &&
          totalShiftMinutes <= TWELVE_HOURS_MINUTES &&
          lunchStart !== null &&
          lunchEnd !== null;

        const secondWaiverValid = hasSecondMealWaiver && secondWaiverEligible;

        if (secondWaiverValid) {
          secondLunchCompliant = true;
        } else if (secondLunchStart && secondLunchEnd) {
          // Check if second lunch started before end of 10th hour
          const minutesToSecondLunch = clockIn
            ? minutesBetween(clockIn, secondLunchStart)
            : null;
          const lateSecondLunch =
            minutesToSecondLunch !== null && minutesToSecondLunch >= TEN_HOURS_MINUTES;
          const shortSecondLunch =
            secondLunchDurationMinutes !== null &&
            secondLunchDurationMinutes < settings.lunch_minimum_minutes;

          if (lateSecondLunch) {
            secondLunchViolationType = 'LATE_SECOND_LUNCH';
          } else if (shortSecondLunch) {
            secondLunchViolationType = 'SHORT_SECOND_LUNCH';
          }

          secondLunchCompliant = !lateSecondLunch && !shortSecondLunch;
        } else if (!secondLunchStart && !secondWaiverValid) {
          secondLunchViolationType = 'MISSED_SECOND_LUNCH';
          secondLunchCompliant = false;
        }
      }

      // Third meal period compliance (required for shifts > 15 hours)
      const thirdMealRequired =
        totalShiftMinutes !== null && totalShiftMinutes > FIFTEEN_HOURS_MINUTES;

      if (thirdMealRequired) {
        if (thirdLunchStart && thirdLunchEnd) {
          // Check if third lunch started before end of 15th hour
          const minutesToThirdLunch = clockIn
            ? minutesBetween(clockIn, thirdLunchStart)
            : null;
          const lateThirdLunch =
            minutesToThirdLunch !== null && minutesToThirdLunch >= FIFTEEN_HOURS_MINUTES;
          const shortThirdLunch =
            thirdLunchDurationMinutes !== null &&
            thirdLunchDurationMinutes < settings.lunch_minimum_minutes;

          if (lateThirdLunch) {
            thirdLunchViolationType = 'LATE_THIRD_LUNCH';
          } else if (shortThirdLunch) {
            thirdLunchViolationType = 'SHORT_THIRD_LUNCH';
          }

          thirdLunchCompliant = !lateThirdLunch && !shortThirdLunch;
        } else if (!thirdLunchStart) {
          thirdLunchViolationType = 'MISSED_THIRD_LUNCH';
          thirdLunchCompliant = false;
        }
      }
    }

    const hasViolation = Boolean(violationType) || Boolean(secondLunchViolationType) || Boolean(thirdLunchViolationType);

    await db.query(
      `INSERT INTO daily_summaries
       (employee_id, work_date, clock_in_at, clock_out_at, lunch_start_at, lunch_end_at,
        lunch_duration_minutes, lunch_compliant,
        second_lunch_start_at, second_lunch_end_at, second_lunch_duration_minutes,
        second_lunch_compliant, second_lunch_violation_type,
        third_lunch_start_at, third_lunch_end_at, third_lunch_duration_minutes,
        third_lunch_compliant, third_lunch_violation_type,
        total_shift_minutes, worked_minutes, overtime_minutes, doubletime_minutes,
        breaks_required, breaks_taken,
        has_violation, violation_type, shift_crosses_midnight,
        has_split_shift, split_shift_gap_minutes, split_shift_premium_owed, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
       ON CONFLICT (employee_id, work_date)
       DO UPDATE SET
         clock_in_at = EXCLUDED.clock_in_at,
         clock_out_at = EXCLUDED.clock_out_at,
         lunch_start_at = EXCLUDED.lunch_start_at,
         lunch_end_at = EXCLUDED.lunch_end_at,
         lunch_duration_minutes = EXCLUDED.lunch_duration_minutes,
         lunch_compliant = EXCLUDED.lunch_compliant,
         second_lunch_start_at = EXCLUDED.second_lunch_start_at,
         second_lunch_end_at = EXCLUDED.second_lunch_end_at,
         second_lunch_duration_minutes = EXCLUDED.second_lunch_duration_minutes,
         second_lunch_compliant = EXCLUDED.second_lunch_compliant,
         second_lunch_violation_type = EXCLUDED.second_lunch_violation_type,
         third_lunch_start_at = EXCLUDED.third_lunch_start_at,
         third_lunch_end_at = EXCLUDED.third_lunch_end_at,
         third_lunch_duration_minutes = EXCLUDED.third_lunch_duration_minutes,
         third_lunch_compliant = EXCLUDED.third_lunch_compliant,
         third_lunch_violation_type = EXCLUDED.third_lunch_violation_type,
         total_shift_minutes = EXCLUDED.total_shift_minutes,
         worked_minutes = EXCLUDED.worked_minutes,
         overtime_minutes = EXCLUDED.overtime_minutes,
         doubletime_minutes = EXCLUDED.doubletime_minutes,
         breaks_required = EXCLUDED.breaks_required,
         breaks_taken = EXCLUDED.breaks_taken,
         has_violation = EXCLUDED.has_violation,
         violation_type = EXCLUDED.violation_type,
         shift_crosses_midnight = EXCLUDED.shift_crosses_midnight,
         has_split_shift = EXCLUDED.has_split_shift,
         split_shift_gap_minutes = EXCLUDED.split_shift_gap_minutes,
         split_shift_premium_owed = EXCLUDED.split_shift_premium_owed,
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
        secondLunchStart,
        secondLunchEnd,
        secondLunchDurationMinutes,
        secondLunchCompliant,
        secondLunchViolationType,
        thirdLunchStart,
        thirdLunchEnd,
        thirdLunchDurationMinutes,
        thirdLunchCompliant,
        thirdLunchViolationType,
        totalShiftMinutes,
        workedMinutes,
        overtimeMinutes,
        doubletimeMinutes,
        breaksRequired,
        breaksTaken,
        hasViolation,
        violationType,
        shiftCrossesMidnight,
        hasSplitShift,
        splitShiftGapMinutes,
        splitShiftPremiumOwed,
        new Date()
      ]
    );

    return this.getSummary(employeeId, workDate, db);
  },

  async flagPremiumPay(
    employeeId: string,
    workDate: string,
    premiumPayOwed: boolean,
    violationCount: number = 1
  ) {
    let premiumPayAmount: number | null = null;

    if (premiumPayOwed) {
      // Get employee's hourly rate to calculate premium pay (1 hour per violation)
      const employeeResult = await pool.query(
        'SELECT hourly_rate FROM employees WHERE id = $1',
        [employeeId]
      );

      const hourlyRate = employeeResult.rows[0]?.hourly_rate ?? 0;
      premiumPayAmount = parseFloat(hourlyRate) * violationCount;
    }

    await pool.query(
      `UPDATE daily_summaries
       SET premium_pay_owed = $1,
           premium_pay_amount = $2,
           updated_at = $3
       WHERE employee_id = $4 AND work_date = $5`,
      [premiumPayOwed, premiumPayAmount, new Date(), employeeId, workDate]
    );

    return premiumPayAmount;
  },

  async calculatePremiumPay(employeeId: string, violationCount: number): Promise<number> {
    const employeeResult = await pool.query(
      'SELECT hourly_rate FROM employees WHERE id = $1',
      [employeeId]
    );

    const hourlyRate = employeeResult.rows[0]?.hourly_rate ?? 0;
    // 1 hour premium pay per violation
    return parseFloat(hourlyRate) * violationCount;
  },

  isWaiverEligible(totalShiftMinutes: number | null) {
    if (totalShiftMinutes === null) return true;
    return totalShiftMinutes <= SIX_HOURS_MINUTES;
  },

  isSecondMealWaiverEligible(
    totalShiftMinutes: number | null,
    firstMealTaken: boolean
  ): boolean {
    if (totalShiftMinutes === null) return true;
    // Second meal waiver only valid if shift <= 12 hours AND first meal was taken
    return totalShiftMinutes <= TWELVE_HOURS_MINUTES && firstMealTaken;
  }
};
