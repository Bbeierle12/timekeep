import { pool } from '../db/connection';
import { getCompanySettings, CompanySettings } from './settings.service';
import { dailySummaryService } from './dailySummary.service';
import { attestationService } from './attestation.service';
import { geofenceService } from './geofence.service';
import { formatInTimeZone } from 'date-fns-tz';
import { AttestationRequiredError } from '../errors/AttestationRequiredError';

export type PunchInput = {
  employeeId: string;
  actionType:
    | 'CLOCK_IN'
    | 'CLOCK_OUT'
    | 'LUNCH_START'
    | 'LUNCH_END'
    | 'SECOND_LUNCH_START'
    | 'SECOND_LUNCH_END'
    | 'THIRD_LUNCH_START'
    | 'THIRD_LUNCH_END'
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
  isOfflineSync?: boolean;
};

const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OFFLINE_SYNC_DRIFT_MS = 24 * 60 * 60 * 1000; // 24 hours

function validateTimestamp(clientTimestamp: Date, isOfflineSync: boolean = false): void {
  const serverTime = new Date();
  const drift = Math.abs(serverTime.getTime() - clientTimestamp.getTime());
  const maxDrift = isOfflineSync ? MAX_OFFLINE_SYNC_DRIFT_MS : MAX_TIMESTAMP_DRIFT_MS;

  if (drift > maxDrift) {
    const driftMinutes = Math.round(drift / 60000);
    throw new Error(
      `Timestamp outside allowed window (${driftMinutes} minutes drift). ` +
        `Max allowed: ${Math.round(maxDrift / 60000)} minutes.`
    );
  }
}

function getWorkDate(date: Date, settings: CompanySettings): string {
  const timezone = settings.timezone || 'America/Los_Angeles';
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

/**
 * For overnight shifts, we need to use the clock-in date as the work_date
 * for all subsequent actions (lunch, breaks, clock-out)
 */
async function getWorkDateForAction(
  employeeId: string,
  actionType: string,
  recordedAt: Date,
  settings: CompanySettings
): Promise<{ workDate: string; crossesMidnight: boolean }> {
  const currentWorkDate = getWorkDate(recordedAt, settings);

  // For CLOCK_IN, always use the current date
  if (actionType === 'CLOCK_IN') {
    return { workDate: currentWorkDate, crossesMidnight: false };
  }

  // For other actions, check if there's an active shift from a previous day
  const activeShiftResult = await pool.query(
    `SELECT work_date, clock_in_at
     FROM daily_summaries
     WHERE employee_id = $1 AND clock_out_at IS NULL
     ORDER BY work_date DESC
     LIMIT 1`,
    [employeeId]
  );

  if (activeShiftResult.rows.length > 0) {
    const activeWorkDate = activeShiftResult.rows[0].work_date;
    const clockInAt = activeShiftResult.rows[0].clock_in_at;

    // If the active shift's work_date is different from current, it's an overnight shift
    if (activeWorkDate !== currentWorkDate) {
      // Verify the clock-in was recent enough (within 24 hours) to be a valid overnight shift
      const hoursSinceClockIn = (recordedAt.getTime() - new Date(clockInAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceClockIn <= 24) {
        return { workDate: activeWorkDate, crossesMidnight: true };
      }
    }

    return { workDate: activeWorkDate, crossesMidnight: false };
  }

  // No active shift found, use current date
  return { workDate: currentWorkDate, crossesMidnight: false };
}

/**
 * Validates GPS data and returns whether it's suspicious
 * Returns true if GPS data appears suspicious/fake
 */
function validateGpsData(
  lat: number | null | undefined,
  lng: number | null | undefined,
  accuracy: number | null | undefined
): boolean {
  // No GPS data is not suspicious
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }

  // Invalid coordinate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return true;
  }

  // Check accuracy if provided
  if (accuracy !== null && accuracy !== undefined) {
    // Suspiciously high accuracy (real GPS rarely below 3m)
    if (accuracy < 1) {
      return true;
    }

    // Impossibly large accuracy (>1km usually indicates fake data or cellular only)
    if (accuracy > 1000) {
      return true;
    }
  }

  return false;
}

export const timeEntryService = {
  async recordPunch(input: PunchInput) {
    // Validate timestamp to prevent backdating
    validateTimestamp(input.recordedAt, input.isOfflineSync ?? false);

    const settings = await getCompanySettings();
    const { workDate, crossesMidnight } = await getWorkDateForAction(
      input.employeeId,
      input.actionType,
      input.recordedAt,
      settings
    );
    const serverReceivedAt = new Date();

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
    const secondLunchStart =
      entries.find((entry) => entry.action_type === 'SECOND_LUNCH_START')?.recorded_at ?? null;
    const secondLunchEnd =
      entries.find((entry) => entry.action_type === 'SECOND_LUNCH_END')?.recorded_at ?? null;
    const thirdLunchStart =
      entries.find((entry) => entry.action_type === 'THIRD_LUNCH_START')?.recorded_at ?? null;
    const thirdLunchEnd =
      entries.find((entry) => entry.action_type === 'THIRD_LUNCH_END')?.recorded_at ?? null;

    const breakMatch = input.actionType.match(/^BREAK_(ACK|SKIP)_(\d)$/);

    if (input.actionType === 'CLOCK_IN' && hasAction('CLOCK_IN')) {
      throw new Error('Already clocked in for the day');
    }

    if (input.actionType === 'CLOCK_OUT') {
      if (!clockIn) throw new Error('Clock in required before clock out');
      if (clockOut) throw new Error('Already clocked out for the day');

      // Check waiver eligibility - if shift exceeds 6 hours, invalidate first meal waiver
      const totalMinutes = Math.floor((input.recordedAt.getTime() - clockIn.getTime()) / 60000);
      const SIX_HOURS_MINUTES = 360;
      const TWELVE_HOURS_MINUTES = 720;
      const FIVE_HOURS_MINUTES = 300;

      if (totalMinutes > SIX_HOURS_MINUTES) {
        // Invalidate first meal waiver if shift exceeded 6 hours
        await pool.query(
          `UPDATE waivers
           SET is_invalid = TRUE, invalid_reason = 'Shift exceeded 6 hours'
           WHERE employee_id = $1 AND work_date = $2 AND waiver_type = 'FIRST_MEAL_WAIVER'
             AND is_revoked = FALSE AND is_invalid = FALSE`,
          [input.employeeId, workDate]
        );
      }

      if (totalMinutes > TWELVE_HOURS_MINUTES) {
        // Invalidate second meal waiver if shift exceeded 12 hours
        await pool.query(
          `UPDATE waivers
           SET is_invalid = TRUE, invalid_reason = 'Shift exceeded 12 hours'
           WHERE employee_id = $1 AND work_date = $2 AND waiver_type = 'SECOND_MEAL_WAIVER'
             AND is_revoked = FALSE AND is_invalid = FALSE`,
          [input.employeeId, workDate]
        );
      }

      // Check if employee is exempt from compliance tracking
      const employeeResult = await pool.query(
        'SELECT is_exempt FROM employees WHERE id = $1',
        [input.employeeId]
      );
      const isExempt = employeeResult.rows[0]?.is_exempt ?? false;

      // Check for meal violations and require attestation (non-exempt only)
      if (!isExempt && totalMinutes >= FIVE_HOURS_MINUTES) {
        // Check for valid waiver
        const waiverResult = await pool.query(
          `SELECT id FROM waivers
           WHERE employee_id = $1 AND work_date = $2
             AND waiver_type = 'FIRST_MEAL_WAIVER'
             AND is_revoked = FALSE AND is_invalid = FALSE`,
          [input.employeeId, workDate]
        );
        const hasValidWaiver = waiverResult.rows.length > 0;

        // Detect violation type
        let violationType: string | null = null;

        if (!lunchStart && !hasValidWaiver) {
          violationType = 'MISSED_LUNCH';
        } else if (lunchStart) {
          const minutesToLunch = Math.floor((lunchStart.getTime() - clockIn.getTime()) / 60000);
          if (minutesToLunch >= FIVE_HOURS_MINUTES) {
            violationType = 'LATE_LUNCH';
          } else if (lunchEnd) {
            const lunchMinutes = Math.floor((lunchEnd.getTime() - lunchStart.getTime()) / 60000);
            if (lunchMinutes < settings.lunch_minimum_minutes) {
              violationType = 'SHORT_LUNCH';
            }
          }
        }

        // If there's a violation, check for existing attestation
        if (violationType) {
          const existingAttestation = await attestationService.getExistingAttestation(
            input.employeeId,
            workDate
          );

          if (!existingAttestation) {
            throw new AttestationRequiredError(violationType);
          }
        }
      }
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

    if (input.actionType === 'SECOND_LUNCH_START') {
      if (!clockIn) throw new Error('Clock in required before second lunch');
      if (!lunchEnd) throw new Error('First lunch must be completed before second lunch');
      if (secondLunchStart) throw new Error('Second lunch already started');
      if (clockOut) throw new Error('Cannot start second lunch after clock out');
    }

    if (input.actionType === 'SECOND_LUNCH_END') {
      if (!secondLunchStart) throw new Error('Second lunch has not started');
      if (secondLunchEnd) throw new Error('Second lunch already ended');
      const lunchMinutes = Math.floor(
        (input.recordedAt.getTime() - secondLunchStart.getTime()) / 60000
      );
      if (lunchMinutes < settings.lunch_minimum_minutes) {
        throw new Error('Second lunch duration below minimum');
      }
    }

    if (input.actionType === 'THIRD_LUNCH_START') {
      if (!clockIn) throw new Error('Clock in required before third lunch');
      if (!secondLunchEnd) throw new Error('Second lunch must be completed before third lunch');
      if (thirdLunchStart) throw new Error('Third lunch already started');
      if (clockOut) throw new Error('Cannot start third lunch after clock out');
    }

    if (input.actionType === 'THIRD_LUNCH_END') {
      if (!thirdLunchStart) throw new Error('Third lunch has not started');
      if (thirdLunchEnd) throw new Error('Third lunch already ended');
      const lunchMinutes = Math.floor(
        (input.recordedAt.getTime() - thirdLunchStart.getTime()) / 60000
      );
      if (lunchMinutes < settings.lunch_minimum_minutes) {
        throw new Error('Third lunch duration below minimum');
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

    // Validate GPS data plausibility
    const gpsSuspicious = validateGpsData(
      input.gpsLatitude,
      input.gpsLongitude,
      input.gpsAccuracyMeters
    );

    // Check geofence
    const geofenceResult = await geofenceService.validateLocation(
      input.gpsLatitude,
      input.gpsLongitude
    );

    // Block punch if outside geofence and enforcement is BLOCK
    if (!geofenceResult.withinGeofence && geofenceResult.enforcement === 'BLOCK') {
      throw new Error(
        `Location is outside the allowed work area (${geofenceResult.distanceMeters}m from boundary)`
      );
    }

    const result = await pool.query(
      `INSERT INTO time_entries
       (employee_id, work_date, action_type, recorded_at, comment, gps_latitude,
        gps_longitude, gps_accuracy_meters, resolved_address, gps_unavailable,
        is_offline_sync, server_received_at, gps_suspicious, outside_geofence,
        distance_from_geofence_meters)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, employee_id, work_date, action_type, recorded_at, comment,
                 resolved_address, is_offline_sync, gps_suspicious, outside_geofence`,
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
        input.gpsUnavailable ?? null,
        input.isOfflineSync ?? false,
        serverReceivedAt,
        gpsSuspicious,
        !geofenceResult.withinGeofence,
        geofenceResult.distanceMeters
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
  },

  async getEntryById(id: string) {
    const result = await pool.query(
      `SELECT te.*, e.initials, e.full_name
       FROM time_entries te
       JOIN employees e ON e.id = te.employee_id
       WHERE te.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async updateEntry(
    id: string,
    update: {
      recordedAt?: Date;
      comment?: string | null;
      correctedBy?: string;
      correctionReason?: string;
    }
  ) {
    // Get the original entry first
    const original = await this.getEntryById(id);
    if (!original) {
      return null;
    }

    // Build update query
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (update.recordedAt !== undefined) {
      // Store original value if this is the first correction
      if (!original.original_recorded_at) {
        setClauses.push(`original_recorded_at = recorded_at`);
      }
      setClauses.push(`recorded_at = $${paramIndex}`);
      values.push(update.recordedAt);
      paramIndex++;
    }

    if (update.comment !== undefined) {
      // Store original value if this is the first correction
      if (!original.original_comment && update.comment !== original.comment) {
        setClauses.push(`original_comment = comment`);
      }
      setClauses.push(`comment = $${paramIndex}`);
      values.push(update.comment);
      paramIndex++;
    }

    if (update.correctedBy) {
      setClauses.push(`corrected_by = $${paramIndex}`);
      values.push(update.correctedBy);
      paramIndex++;
    }

    if (update.correctionReason) {
      setClauses.push(`correction_reason = $${paramIndex}`);
      values.push(update.correctionReason);
      paramIndex++;
    }

    setClauses.push(`corrected_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    if (setClauses.length === 0) {
      return original;
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE time_entries
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    const updated = result.rows[0];

    // Recalculate daily summary
    await dailySummaryService.recalculate(original.employee_id, original.work_date);

    return updated;
  },

  async createManualEntry(
    adminId: string,
    entry: {
      employeeId: string;
      workDate: string;
      actionType: string;
      recordedAt: Date;
      comment?: string;
      reason?: string;
    }
  ) {
    const result = await pool.query(
      `INSERT INTO time_entries
       (employee_id, work_date, action_type, recorded_at, comment,
        corrected_by, correction_reason, corrected_at, is_manual_entry)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), TRUE)
       RETURNING *`,
      [
        entry.employeeId,
        entry.workDate,
        entry.actionType,
        entry.recordedAt,
        entry.comment ?? null,
        adminId,
        entry.reason ?? 'Manual entry by admin'
      ]
    );

    const newEntry = result.rows[0];

    // Recalculate daily summary
    await dailySummaryService.recalculate(entry.employeeId, entry.workDate);

    return newEntry;
  }
};
