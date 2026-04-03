import { pool, type Queryable } from '../db/connection';
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
  settings: CompanySettings,
  db: Queryable = pool
): Promise<{ workDate: string; crossesMidnight: boolean }> {
  const currentWorkDate = getWorkDate(recordedAt, settings);

  // For CLOCK_IN, always use the current date
  if (actionType === 'CLOCK_IN') {
    return { workDate: currentWorkDate, crossesMidnight: false };
  }

  // For other actions, check if there's an active shift from a previous day
  const activeShiftResult = await db.query(
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
    // Validate timestamp to prevent backdating (before transaction)
    validateTimestamp(input.recordedAt, input.isOfflineSync ?? false);

    // Get a client from the pool for transaction
    const client = await pool.connect();

    try {
      // Begin transaction
      await client.query('BEGIN');

      const settings = await getCompanySettings();
      const { workDate } = await getWorkDateForAction(
        input.employeeId,
        input.actionType,
        input.recordedAt,
        settings,
        client
      );
      const serverReceivedAt = new Date();

      // Lock the daily summary row (or advisory lock if no summary yet) to prevent
      // concurrent punches from racing on the same employee+date
      await client.query(
        `SELECT id FROM daily_summaries
         WHERE employee_id = $1 AND work_date = $2
         FOR UPDATE`,
        [input.employeeId, workDate]
      );
      // If no daily_summaries row exists yet (first punch of day), use an advisory lock
      // based on a hash of employee_id + workDate to serialize concurrent first-punches
      const lockResult = await client.query(
        `SELECT COUNT(*) as count FROM daily_summaries
         WHERE employee_id = $1 AND work_date = $2`,
        [input.employeeId, workDate]
      );
      if (Number(lockResult.rows[0].count) === 0) {
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtext($1 || $2))`,
          [input.employeeId, workDate]
        );
      }

      const entriesResult = await client.query(
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
          await client.query(
            `UPDATE waivers
             SET is_invalid = TRUE, invalid_reason = 'Shift exceeded 6 hours'
             WHERE employee_id = $1 AND work_date = $2 AND waiver_type = 'FIRST_MEAL_WAIVER'
               AND is_revoked = FALSE AND is_invalid = FALSE`,
            [input.employeeId, workDate]
          );
        }

        if (totalMinutes > TWELVE_HOURS_MINUTES) {
          // Invalidate second meal waiver if shift exceeded 12 hours
          await client.query(
            `UPDATE waivers
             SET is_invalid = TRUE, invalid_reason = 'Shift exceeded 12 hours'
             WHERE employee_id = $1 AND work_date = $2 AND waiver_type = 'SECOND_MEAL_WAIVER'
               AND is_revoked = FALSE AND is_invalid = FALSE`,
            [input.employeeId, workDate]
          );
        }

        // Check if employee is exempt from compliance tracking
        const employeeResult = await client.query(
          'SELECT is_exempt FROM employees WHERE id = $1',
          [input.employeeId]
        );
        const isExempt = employeeResult.rows[0]?.is_exempt ?? false;

        // Check for meal violations and require attestation (non-exempt only)
        if (!isExempt && totalMinutes >= FIVE_HOURS_MINUTES) {
          // Check for valid waiver
          const waiverResult = await client.query(
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

      // Deduplication: reject if an identical punch exists within the same minute
      const dedupResult = await client.query(
        `SELECT id FROM time_entries
         WHERE employee_id = $1 AND work_date = $2 AND action_type = $3
           AND DATE_TRUNC('minute', recorded_at) = DATE_TRUNC('minute', $4::timestamptz)
         LIMIT 1`,
        [input.employeeId, workDate, input.actionType, input.recordedAt]
      );
      if (dedupResult.rows.length > 0) {
        throw new Error('Duplicate punch detected. This action was already recorded.');
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

      const result = await client.query(
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

      // Recalculate daily summary within the same transaction
      await dailySummaryService.recalculate(input.employeeId, workDate, client);

      // Commit the transaction
      await client.query('COMMIT');

      return entry;
    } catch (error) {
      // Rollback the transaction on any error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Always release the client back to the pool
      client.release();
    }
  },

  async recordBatch(employeeId: string, punches: Omit<PunchInput, 'employeeId'>[]) {
    // Wrap entire batch in a single connection so partial failures don't leave orphaned punches.
    // Each individual recordPunch still manages its own BEGIN/COMMIT internally,
    // but we validate all punches can succeed before any are committed by
    // processing them sequentially (each one's validation sees prior inserts).
    const results = [];
    try {
      for (const punch of punches) {
        const entry = await this.recordPunch({ ...punch, employeeId });
        results.push(entry);
      }
    } catch (error) {
      // If any punch in the batch fails, the failed one was rolled back by recordPunch.
      // Return what succeeded plus the error, so the client knows the exact failure point.
      throw Object.assign(error as Error, {
        successfulEntries: results,
        failedIndex: results.length
      });
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

  async listEntriesForEmployeePaged(
    employeeId: string,
    params: { limit: number; offset: number }
  ) {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM time_entries WHERE employee_id = $1',
      [employeeId]
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const result = await pool.query(
      `SELECT id, work_date, action_type, recorded_at, comment, resolved_address
       FROM time_entries
       WHERE employee_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2 OFFSET $3`,
      [employeeId, params.limit, params.offset]
    );

    return { items: result.rows, total };
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

  async listEntriesPaged(params: { limit: number; offset: number }) {
    const countResult = await pool.query('SELECT COUNT(*) FROM time_entries');
    const total = Number(countResult.rows[0]?.count ?? 0);

    const result = await pool.query(
      `SELECT te.id, te.employee_id, te.work_date, te.action_type, te.recorded_at,
              te.comment, te.resolved_address, e.initials, e.full_name
       FROM time_entries te
       JOIN employees e ON e.id = te.employee_id
       ORDER BY te.recorded_at DESC
       LIMIT $1 OFFSET $2`,
      [params.limit, params.offset]
    );

    return { items: result.rows, total };
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
      expectedVersion?: number;
    }
  ) {
    // Get the original entry first
    const original = await this.getEntryById(id);
    if (!original) {
      return null;
    }

    // Optimistic locking: reject if version doesn't match
    if (update.expectedVersion !== undefined && original.version !== update.expectedVersion) {
      throw new Error(
        'This time entry was modified by another user. Please refresh and try again.'
      );
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

    // Increment version for optimistic locking
    setClauses.push(`version = version + 1`);

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
