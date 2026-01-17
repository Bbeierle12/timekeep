import { pool } from '../db/connection';
import { dailySummaryService } from './dailySummary.service';
import { timeEntryService } from './timeEntry.service';

export type PendingCertification = {
  workDate: string;
  entries: Array<{
    id: string;
    work_date: string;
    action_type: string;
    recorded_at: Date;
    comment: string | null;
    resolved_address: string | null;
  }>;
  summary: unknown;
};

export type CertifyInput = {
  employeeId: string;
  workDate: string;
  comment?: string | null;
  requestCorrection?: boolean;
  correctionNote?: string | null;
};

function buildUpdate(fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  const setClauses = entries.map(([key], index) => `${key} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  return { setClauses, values };
}

export const certificationService = {
  async getPendingCertification(employeeId: string): Promise<PendingCertification | null> {
    // Get the most recent uncertified day (for backward compatibility)
    const result = await pool.query(
      `SELECT work_date
       FROM daily_summaries
       WHERE employee_id = $1 AND is_certified = FALSE AND clock_out_at IS NOT NULL
       ORDER BY work_date DESC
       LIMIT 1`,
      [employeeId]
    );

    if (!result.rowCount) {
      return null;
    }

    const workDate = result.rows[0].work_date as string;
    const entries = await timeEntryService.getEntriesForEmployee(employeeId, workDate);
    const summary = await dailySummaryService.getSummary(employeeId, workDate);

    return { workDate, entries, summary };
  },

  async getAllPendingCertifications(employeeId: string): Promise<PendingCertification[]> {
    // Get all uncertified days with completed shifts (clock_out_at is set)
    const result = await pool.query(
      `SELECT work_date
       FROM daily_summaries
       WHERE employee_id = $1 AND is_certified = FALSE AND clock_out_at IS NOT NULL
       ORDER BY work_date ASC`,
      [employeeId]
    );

    if (!result.rowCount) {
      return [];
    }

    const pendingDays: PendingCertification[] = [];

    for (const row of result.rows) {
      const workDate = row.work_date as string;
      const entries = await timeEntryService.getEntriesForEmployee(employeeId, workDate);
      const summary = await dailySummaryService.getSummary(employeeId, workDate);

      pendingDays.push({ workDate, entries, summary });
    }

    return pendingDays;
  },

  async certifyDay(input: CertifyInput) {
    await dailySummaryService.recalculate(input.employeeId, input.workDate);

    const fields: Record<string, unknown> = {
      is_certified: true,
      certified_at: new Date(),
      certification_comment: input.comment ?? null,
      updated_at: new Date()
    };

    if (input.requestCorrection !== undefined) {
      fields.correction_requested = input.requestCorrection;
      fields.correction_request_note = input.correctionNote ?? null;
    }

    const { setClauses, values } = buildUpdate(fields);

    if (!setClauses.length) {
      return dailySummaryService.getSummary(input.employeeId, input.workDate);
    }

    values.push(input.employeeId, input.workDate);

    await pool.query(
      `UPDATE daily_summaries
       SET ${setClauses.join(', ')}
       WHERE employee_id = $${values.length - 1} AND work_date = $${values.length}`,
      values
    );

    return dailySummaryService.getSummary(input.employeeId, input.workDate);
  },

  async requestCorrection(input: {
    employeeId: string;
    workDate: string;
    note: string;
  }) {
    await dailySummaryService.recalculate(input.employeeId, input.workDate);
    await pool.query(
      `UPDATE daily_summaries
       SET correction_requested = TRUE,
           correction_request_note = $1,
           updated_at = $2
       WHERE employee_id = $3 AND work_date = $4`,
      [input.note, new Date(), input.employeeId, input.workDate]
    );

    return dailySummaryService.getSummary(input.employeeId, input.workDate);
  }
};
