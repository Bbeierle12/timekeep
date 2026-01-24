import { pool } from '../db/connection';
import { dailySummaryService } from './dailySummary.service';

export type CorrectionRequestInput = {
  timeEntryId: string;
  requestedBy: string;
  requestReason: string;
  newRecordedAt: Date;
  newActionType?: string | null;
};

export type CorrectionApproveInput = {
  correctionId: string;
  approvedBy: string;
};

export type CorrectionApplyInput = {
  correctionId: string;
  appliedBy: string;
  notifyEmployee?: boolean;
};

export const correctionService = {
  async list(params: { status?: string; limit?: number; offset?: number }) {
    const filters: string[] = [];
    const values: Array<string | number> = [];

    if (params.status) {
      values.push(params.status);
      filters.push(`c.status = $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const limit = params.limit ?? 200;
    const offset = params.offset ?? 0;
    values.push(limit, offset);

    const result = await pool.query(
      `SELECT c.id, c.time_entry_id, c.requested_by, c.request_reason, c.new_recorded_at,
              c.new_action_type, c.status, c.approved_by, c.approved_at, c.applied_at,
              c.employee_notified, te.employee_id, te.work_date, te.recorded_at,
              te.action_type
       FROM time_entry_corrections c
       JOIN time_entries te ON te.id = c.time_entry_id
       ${where}
       ORDER BY c.requested_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return result.rows;
  },

  async requestCorrection(input: CorrectionRequestInput) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const entryResult = await client.query(
        `SELECT id, employee_id, work_date, recorded_at, action_type
         FROM time_entries
         WHERE id = $1
         FOR UPDATE`,
        [input.timeEntryId]
      );

      if (!entryResult.rowCount) {
        throw new Error('Time entry not found');
      }

      const existing = await client.query(
        `SELECT id FROM time_entry_corrections
         WHERE time_entry_id = $1 AND status IN ('PENDING', 'APPROVED')
         LIMIT 1`,
        [input.timeEntryId]
      );

      if (existing.rowCount) {
        throw new Error('Existing correction already in progress');
      }

      const result = await client.query(
        `INSERT INTO time_entry_corrections
         (time_entry_id, requested_by, request_reason, new_recorded_at, new_action_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, time_entry_id, status, requested_at`,
        [
          input.timeEntryId,
          input.requestedBy,
          input.requestReason,
          input.newRecordedAt,
          input.newActionType ?? null
        ]
      );

      await client.query('COMMIT');
      return { ...result.rows[0], entry: entryResult.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async approveCorrection(input: CorrectionApproveInput) {
    const correctionResult = await pool.query(
      `SELECT requested_by FROM time_entry_corrections WHERE id = $1`,
      [input.correctionId]
    );

    if (!correctionResult.rowCount) {
      throw new Error('Correction not found');
    }

    const requestedBy = correctionResult.rows[0].requested_by as string;
    if (requestedBy === input.approvedBy) {
      throw new Error('Approver must be different from requester');
    }

    const result = await pool.query(
      `UPDATE time_entry_corrections
       SET status = 'APPROVED', approved_by = $1, approved_at = $2
       WHERE id = $3 AND status = 'PENDING'
       RETURNING id, time_entry_id, status`,
      [input.approvedBy, new Date(), input.correctionId]
    );

    if (!result.rowCount) {
      throw new Error('Correction not pending');
    }

    return result.rows[0];
  },

  async rejectCorrection(input: CorrectionApproveInput) {
    const correctionResult = await pool.query(
      `SELECT requested_by FROM time_entry_corrections WHERE id = $1`,
      [input.correctionId]
    );

    if (!correctionResult.rowCount) {
      throw new Error('Correction not found');
    }

    const requestedBy = correctionResult.rows[0].requested_by as string;
    if (requestedBy === input.approvedBy) {
      throw new Error('Approver must be different from requester');
    }

    const result = await pool.query(
      `UPDATE time_entry_corrections
       SET status = 'REJECTED', approved_by = $1, approved_at = $2
       WHERE id = $3 AND status = 'PENDING'
       RETURNING id, time_entry_id, status`,
      [input.approvedBy, new Date(), input.correctionId]
    );

    if (!result.rowCount) {
      throw new Error('Correction not pending');
    }

    return result.rows[0];
  },

  async applyCorrection(input: CorrectionApplyInput) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const correctionResult = await client.query(
        `SELECT id, time_entry_id, new_recorded_at, new_action_type, request_reason, status
         FROM time_entry_corrections
         WHERE id = $1
         FOR UPDATE`,
        [input.correctionId]
      );

      if (!correctionResult.rowCount) {
        throw new Error('Correction not found');
      }

      const correction = correctionResult.rows[0] as {
        time_entry_id: string;
        new_recorded_at: Date;
        new_action_type: string | null;
        request_reason: string;
        status: string;
      };

      if (correction.status !== 'APPROVED') {
        throw new Error('Correction not approved');
      }

      const entryResult = await client.query(
        `SELECT id, employee_id, work_date, recorded_at, action_type
         FROM time_entries
         WHERE id = $1
         FOR UPDATE`,
        [correction.time_entry_id]
      );

      if (!entryResult.rowCount) {
        throw new Error('Time entry not found');
      }

      const entry = entryResult.rows[0] as {
        employee_id: string;
        work_date: string;
        recorded_at: Date;
        action_type: string;
      };

      await client.query(
        `UPDATE time_entries
         SET original_value = $1,
             recorded_at = $2,
             action_type = $3,
             corrected_by = $4,
             correction_reason = $5,
             corrected_at = $6,
             is_original = FALSE
         WHERE id = $7`,
        [
          entry.recorded_at,
          correction.new_recorded_at,
          correction.new_action_type ?? entry.action_type,
          input.appliedBy,
          correction.request_reason,
          new Date(),
          correction.time_entry_id
        ]
      );

      const updatedCorrection = await client.query(
        `UPDATE time_entry_corrections
         SET status = 'APPLIED', applied_at = $1, employee_notified = $2
         WHERE id = $3
         RETURNING id, time_entry_id, status`,
        [new Date(), input.notifyEmployee ?? false, input.correctionId]
      );

      await client.query('COMMIT');
      await dailySummaryService.recalculate(entry.employee_id, entry.work_date);

      return updatedCorrection.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};
