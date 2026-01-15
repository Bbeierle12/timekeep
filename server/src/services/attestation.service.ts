import { pool } from '../db/connection';
import { ATTESTATION_TEXT, ATTESTATION_TEXT_VERSION } from '../config/waiver-text';
import { getCompanySettings } from './settings.service';
import { dailySummaryService } from './dailySummary.service';

export type AttestationInput = {
  employeeId: string;
  workDate: string;
  selectedOption: 'OPTION_A' | 'OPTION_B';
  optionASuboption?: 'NOT_TAKEN' | 'SHORTER' | 'LATE';
  comment?: string | null;
  signatureImage?: Buffer | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  resolvedAddress?: string | null;
};

export const attestationService = {
  async sign(input: AttestationInput) {
    if (!input.signatureImage) {
      throw new Error('Signature is required');
    }

    const settings = await getCompanySettings();
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

    let attestationType: 'LATE_MEAL' | 'SHORT_MEAL' | 'MISSED_MEAL' | null = null;

    if (clockIn && !lunchStart) {
      const endTime = clockOut ?? new Date();
      const minutesSinceClockIn = Math.floor((endTime.getTime() - clockIn.getTime()) / 60000);
      if (minutesSinceClockIn >= 300) {
        attestationType = 'MISSED_MEAL';
      }
    }

    if (!attestationType && clockIn && lunchStart) {
      const minutesToLunch = Math.floor((lunchStart.getTime() - clockIn.getTime()) / 60000);
      if (minutesToLunch > 300) {
        attestationType = 'LATE_MEAL';
      }
    }

    if (!attestationType && lunchStart && lunchEnd) {
      const lunchMinutes = Math.floor((lunchEnd.getTime() - lunchStart.getTime()) / 60000);
      if (lunchMinutes < settings.lunch_minimum_minutes) {
        attestationType = 'SHORT_MEAL';
      }
    }

    if (!attestationType) {
      throw new Error('No meal compliance issue found for attestation');
    }

    const signedAt = new Date();
    const triggersPremium = input.selectedOption === 'OPTION_B';

    const result = await pool.query(
      `INSERT INTO attestations
       (employee_id, work_date, attestation_type, selected_option, option_a_suboption,
        attestation_text_version, comment, signature_image, signed_at, gps_latitude,
        gps_longitude, resolved_address, triggers_premium)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, attestation_type, signed_at, triggers_premium`,
      [
        input.employeeId,
        input.workDate,
        attestationType,
        input.selectedOption,
        input.optionASuboption ?? null,
        ATTESTATION_TEXT_VERSION,
        input.comment ?? null,
        input.signatureImage ?? null,
        signedAt,
        input.gpsLatitude ?? null,
        input.gpsLongitude ?? null,
        input.resolvedAddress ?? null,
        triggersPremium
      ]
    );

    await dailySummaryService.recalculate(input.employeeId, input.workDate);

    if (triggersPremium) {
      await dailySummaryService.flagPremiumPay(input.employeeId, input.workDate, true);
    }

    return { ...result.rows[0], attestation_text: ATTESTATION_TEXT };
  }
};
