import { pool } from '../db/connection';

export type StateComplianceRules = {
  state_code: string;
  state_name: string;
  meal_period_required_minutes: number;
  meal_period_by_hour: number;
  second_meal_by_hour: number;
  rest_break_minutes: number;
  rest_break_per_hours: number;
  overtime_daily_threshold: number;
  overtime_weekly_threshold: number;
  allow_meal_waiver: boolean;
  time_rounding_allowed: boolean;
};

const DEFAULT_CALIFORNIA_RULES: StateComplianceRules = {
  state_code: 'CA',
  state_name: 'California',
  meal_period_required_minutes: 30,
  meal_period_by_hour: 5.0,
  second_meal_by_hour: 10.0,
  rest_break_minutes: 10,
  rest_break_per_hours: 4.0,
  overtime_daily_threshold: 8,
  overtime_weekly_threshold: 40,
  allow_meal_waiver: true,
  time_rounding_allowed: false
};

export const stateComplianceService = {
  /**
   * Get compliance rules for a specific state
   */
  async getRulesForState(stateCode: string): Promise<StateComplianceRules> {
    const result = await pool.query(
      `SELECT * FROM state_compliance_rules WHERE state_code = $1`,
      [stateCode.toUpperCase()]
    );

    if (result.rows.length === 0) {
      // Default to California rules if state not found
      return DEFAULT_CALIFORNIA_RULES;
    }

    return result.rows[0] as StateComplianceRules;
  },

  /**
   * Get compliance rules for an employee based on their state
   */
  async getRulesForEmployee(employeeId: string): Promise<StateComplianceRules> {
    const employeeResult = await pool.query(
      `SELECT state_code FROM employees WHERE id = $1`,
      [employeeId]
    );

    const stateCode = employeeResult.rows[0]?.state_code ?? 'CA';
    return this.getRulesForState(stateCode);
  },

  /**
   * Get all available state compliance rules
   */
  async getAllRules(): Promise<StateComplianceRules[]> {
    const result = await pool.query(
      `SELECT * FROM state_compliance_rules ORDER BY state_name`
    );

    return result.rows as StateComplianceRules[];
  },

  /**
   * Create or update compliance rules for a state
   */
  async upsertRules(rules: StateComplianceRules): Promise<StateComplianceRules> {
    const result = await pool.query(
      `INSERT INTO state_compliance_rules
       (state_code, state_name, meal_period_required_minutes, meal_period_by_hour,
        second_meal_by_hour, rest_break_minutes, rest_break_per_hours,
        overtime_daily_threshold, overtime_weekly_threshold, allow_meal_waiver, time_rounding_allowed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (state_code)
       DO UPDATE SET
         state_name = EXCLUDED.state_name,
         meal_period_required_minutes = EXCLUDED.meal_period_required_minutes,
         meal_period_by_hour = EXCLUDED.meal_period_by_hour,
         second_meal_by_hour = EXCLUDED.second_meal_by_hour,
         rest_break_minutes = EXCLUDED.rest_break_minutes,
         rest_break_per_hours = EXCLUDED.rest_break_per_hours,
         overtime_daily_threshold = EXCLUDED.overtime_daily_threshold,
         overtime_weekly_threshold = EXCLUDED.overtime_weekly_threshold,
         allow_meal_waiver = EXCLUDED.allow_meal_waiver,
         time_rounding_allowed = EXCLUDED.time_rounding_allowed
       RETURNING *`,
      [
        rules.state_code.toUpperCase(),
        rules.state_name,
        rules.meal_period_required_minutes,
        rules.meal_period_by_hour,
        rules.second_meal_by_hour,
        rules.rest_break_minutes,
        rules.rest_break_per_hours,
        rules.overtime_daily_threshold,
        rules.overtime_weekly_threshold,
        rules.allow_meal_waiver,
        rules.time_rounding_allowed
      ]
    );

    return result.rows[0] as StateComplianceRules;
  },

  /**
   * Calculate meal period deadline based on state rules
   */
  getMealPeriodDeadlineMinutes(rules: StateComplianceRules): number {
    return Math.floor(rules.meal_period_by_hour * 60);
  },

  /**
   * Calculate second meal period deadline based on state rules
   */
  getSecondMealPeriodDeadlineMinutes(rules: StateComplianceRules): number {
    return Math.floor(rules.second_meal_by_hour * 60);
  },

  /**
   * Calculate how many rest breaks are required for a shift
   */
  getRequiredRestBreaks(rules: StateComplianceRules, totalShiftMinutes: number): number {
    const hoursWorked = totalShiftMinutes / 60;
    return Math.floor(hoursWorked / rules.rest_break_per_hours);
  }
};
