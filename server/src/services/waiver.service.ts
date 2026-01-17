import { pool } from '../db/connection';
import {
  WAIVER_TEXT_VERSION,
  FIRST_MEAL_WAIVER_TEXT,
  SECOND_MEAL_WAIVER_TEXT
} from '../config/waiver-text';
import { getCompanySettings } from './settings.service';
import { dailySummaryService } from './dailySummary.service';

export type WaiverInput = {
  employeeId: string;
  workDate: string;
  waiverType: 'FIRST_MEAL_WAIVER' | 'SECOND_MEAL_WAIVER';
  checkboxChecked: boolean;
  signatureImage?: Buffer | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  resolvedAddress?: string | null;
};

export const waiverService = {
  async sign(input: WaiverInput) {
    const settings = await getCompanySettings();

    if (!input.checkboxChecked) {
      throw new Error('Waiver checkbox must be accepted');
    }

    if (!input.signatureImage) {
      throw new Error('Signature is required');
    }

    if (input.waiverType === 'FIRST_MEAL_WAIVER' && !settings.allow_first_meal_waiver) {
      throw new Error('First meal waiver disabled');
    }

    if (input.waiverType === 'SECOND_MEAL_WAIVER' && !settings.allow_second_meal_waiver) {
      throw new Error('Second meal waiver disabled');
    }

    // Check for existing waiver of the same type
    const existing = await pool.query(
      `SELECT id FROM waivers WHERE employee_id = $1 AND work_date = $2 AND waiver_type = $3 AND is_revoked = FALSE LIMIT 1`,
      [input.employeeId, input.workDate, input.waiverType]
    );

    if ((existing.rowCount ?? 0) > 0) {
      throw new Error('Waiver of this type already signed for this date');
    }

    const entriesResult = await pool.query(
      `SELECT action_type, recorded_at
       FROM time_entries
       WHERE employee_id = $1 AND work_date = $2
       ORDER BY recorded_at ASC`,
      [input.employeeId, input.workDate]
    );

    const entries = entriesResult.rows as Array<{ action_type: string; recorded_at: Date }>;
    const clockIn = entries.find((entry) => entry.action_type === 'CLOCK_IN')?.recorded_at ?? null;
    const clockOut = entries.find((entry) => entry.action_type === 'CLOCK_OUT')?.recorded_at ?? null;
    const lunchStart = entries.find((entry) => entry.action_type === 'LUNCH_START')?.recorded_at ?? null;
    const lunchEnd = entries.find((entry) => entry.action_type === 'LUNCH_END')?.recorded_at ?? null;

    if (clockIn) {
      const endTime = clockOut ?? new Date();
      const totalMinutes = Math.floor((endTime.getTime() - clockIn.getTime()) / 60000);

      if (input.waiverType === 'FIRST_MEAL_WAIVER') {
        if (!dailySummaryService.isWaiverEligible(totalMinutes)) {
          throw new Error('Shift exceeds first meal waiver eligibility (max 6 hours)');
        }
      } else if (input.waiverType === 'SECOND_MEAL_WAIVER') {
        const firstMealTaken = lunchStart !== null && lunchEnd !== null;
        if (!dailySummaryService.isSecondMealWaiverEligible(totalMinutes, firstMealTaken)) {
          if (!firstMealTaken) {
            throw new Error('First meal must be taken before signing second meal waiver');
          }
          throw new Error('Shift exceeds second meal waiver eligibility (max 12 hours)');
        }
      }
    }

    const signedAt = new Date();
    const result = await pool.query(
      `INSERT INTO waivers
       (employee_id, work_date, waiver_type, waiver_text_version, checkbox_checked, signature_image,
        signed_at, gps_latitude, gps_longitude, resolved_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, waiver_type, signed_at`,
      [
        input.employeeId,
        input.workDate,
        input.waiverType,
        WAIVER_TEXT_VERSION,
        input.checkboxChecked,
        input.signatureImage ?? null,
        signedAt,
        input.gpsLatitude ?? null,
        input.gpsLongitude ?? null,
        input.resolvedAddress ?? null
      ]
    );

    await dailySummaryService.recalculate(input.employeeId, input.workDate);

    const waiverText =
      input.waiverType === 'SECOND_MEAL_WAIVER'
        ? SECOND_MEAL_WAIVER_TEXT
        : FIRST_MEAL_WAIVER_TEXT;

    return { ...result.rows[0], waiver_text: waiverText };
  },

  async revoke(employeeId: string, workDate: string, waiverType?: 'FIRST_MEAL_WAIVER' | 'SECOND_MEAL_WAIVER') {
    // If waiverType specified, revoke only that type; otherwise revoke all active waivers for the day
    let query: string;
    let params: (string | undefined)[];

    if (waiverType) {
      query = `UPDATE waivers
               SET is_revoked = TRUE, revoked_at = $1
               WHERE employee_id = $2 AND work_date = $3 AND waiver_type = $4
                 AND is_revoked = FALSE
               RETURNING id, waiver_type, signed_at, revoked_at`;
      params = [new Date().toISOString(), employeeId, workDate, waiverType];
    } else {
      query = `UPDATE waivers
               SET is_revoked = TRUE, revoked_at = $1
               WHERE employee_id = $2 AND work_date = $3 AND is_revoked = FALSE
               RETURNING id, waiver_type, signed_at, revoked_at`;
      params = [new Date().toISOString(), employeeId, workDate];
    }

    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      throw new Error('No active waiver found to revoke');
    }

    // Recalculate compliance after revocation
    await dailySummaryService.recalculate(employeeId, workDate);

    return result.rows;
  },

  async getActiveWaivers(employeeId: string, workDate: string) {
    const result = await pool.query(
      `SELECT id, waiver_type, signed_at, is_revoked, is_invalid, invalid_reason
       FROM waivers
       WHERE employee_id = $1 AND work_date = $2 AND is_revoked = FALSE AND is_invalid = FALSE
       ORDER BY signed_at ASC`,
      [employeeId, workDate]
    );

    return result.rows;
  }
};
