import { pool } from '../db/connection';
import { minutesBetween } from '../utils/time';

export type RestBreakInput = {
  employeeId: string;
  workDate: string;
  breakNumber: 1 | 2 | 3;
  startAt: Date;
};

export type RestBreak = {
  id: string;
  employee_id: string;
  work_date: string;
  break_number: number;
  start_at: Date;
  end_at: Date | null;
  duration_minutes: number | null;
  acknowledged_only: boolean;
};

export const restBreakService = {
  /**
   * Start a timed rest break (as opposed to just acknowledging)
   */
  async startBreak(input: RestBreakInput): Promise<RestBreak> {
    // Check if break already exists
    const existing = await pool.query(
      `SELECT id FROM rest_breaks
       WHERE employee_id = $1 AND work_date = $2 AND break_number = $3`,
      [input.employeeId, input.workDate, input.breakNumber]
    );

    if (existing.rows.length > 0) {
      throw new Error(`Break ${input.breakNumber} already recorded for this day`);
    }

    const result = await pool.query(
      `INSERT INTO rest_breaks
       (employee_id, work_date, break_number, start_at, acknowledged_only)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING *`,
      [input.employeeId, input.workDate, input.breakNumber, input.startAt]
    );

    return result.rows[0] as RestBreak;
  },

  /**
   * End a timed rest break and record the duration
   */
  async endBreak(
    employeeId: string,
    workDate: string,
    breakNumber: 1 | 2 | 3,
    endAt: Date
  ): Promise<RestBreak> {
    // Get the existing break
    const existing = await pool.query(
      `SELECT * FROM rest_breaks
       WHERE employee_id = $1 AND work_date = $2 AND break_number = $3`,
      [employeeId, workDate, breakNumber]
    );

    if (existing.rows.length === 0) {
      throw new Error(`Break ${breakNumber} has not been started`);
    }

    const restBreak = existing.rows[0] as RestBreak;

    if (restBreak.end_at) {
      throw new Error(`Break ${breakNumber} has already ended`);
    }

    if (restBreak.acknowledged_only) {
      throw new Error(`Break ${breakNumber} was acknowledged only, not timed`);
    }

    const durationMinutes = minutesBetween(restBreak.start_at, endAt);

    const result = await pool.query(
      `UPDATE rest_breaks
       SET end_at = $1, duration_minutes = $2
       WHERE employee_id = $3 AND work_date = $4 AND break_number = $5
       RETURNING *`,
      [endAt, durationMinutes, employeeId, workDate, breakNumber]
    );

    return result.rows[0] as RestBreak;
  },

  /**
   * Record an acknowledged-only break (no timing)
   * This is the existing behavior for BREAK_ACK actions
   */
  async acknowledgeBreak(
    employeeId: string,
    workDate: string,
    breakNumber: 1 | 2 | 3,
    acknowledgedAt: Date
  ): Promise<RestBreak> {
    // Check if break already exists
    const existing = await pool.query(
      `SELECT id FROM rest_breaks
       WHERE employee_id = $1 AND work_date = $2 AND break_number = $3`,
      [employeeId, workDate, breakNumber]
    );

    if (existing.rows.length > 0) {
      throw new Error(`Break ${breakNumber} already recorded for this day`);
    }

    const result = await pool.query(
      `INSERT INTO rest_breaks
       (employee_id, work_date, break_number, start_at, acknowledged_only)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
      [employeeId, workDate, breakNumber, acknowledgedAt]
    );

    return result.rows[0] as RestBreak;
  },

  /**
   * Get all breaks for an employee on a given date
   */
  async getBreaksForDate(employeeId: string, workDate: string): Promise<RestBreak[]> {
    const result = await pool.query(
      `SELECT * FROM rest_breaks
       WHERE employee_id = $1 AND work_date = $2
       ORDER BY break_number ASC`,
      [employeeId, workDate]
    );

    return result.rows as RestBreak[];
  },

  /**
   * Get break summary for compliance reporting
   */
  async getBreakSummary(employeeId: string, workDate: string) {
    const breaks = await this.getBreaksForDate(employeeId, workDate);

    const totalTimedMinutes = breaks
      .filter((b) => !b.acknowledged_only && b.duration_minutes !== null)
      .reduce((sum, b) => sum + (b.duration_minutes ?? 0), 0);

    const acknowledgedCount = breaks.filter((b) => b.acknowledged_only).length;
    const timedCount = breaks.filter((b) => !b.acknowledged_only).length;

    return {
      breaks,
      totalTimedMinutes,
      acknowledgedCount,
      timedCount,
      totalBreaks: breaks.length
    };
  }
};
