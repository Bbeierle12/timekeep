import { pool } from '../db/connection';
import { WAIVER_TEXT, WAIVER_TEXT_VERSION } from '../config/waiver-text';
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

    const existing = await pool.query(
      `SELECT id FROM waivers WHERE employee_id = $1 AND work_date = $2 AND is_revoked = FALSE LIMIT 1`,
      [input.employeeId, input.workDate]
    );

    if ((existing.rowCount ?? 0) > 0) {
      throw new Error('Waiver already signed for this date');
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

    if (clockIn) {
      const endTime = clockOut ?? new Date();
      const totalMinutes = Math.floor((endTime.getTime() - clockIn.getTime()) / 60000);
      if (!dailySummaryService.isWaiverEligible(totalMinutes)) {
        throw new Error('Shift exceeds waiver eligibility');
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

    return { ...result.rows[0], waiver_text: WAIVER_TEXT };
  }
};
