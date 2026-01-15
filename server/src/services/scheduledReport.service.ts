import { pool } from '../db/connection';

export type ScheduledReportInput = {
  name: string;
  reportType: string;
  format: 'CSV' | 'PDF' | 'EXCEL';
  scheduleCron: string;
  recipients: string[];
  params?: Record<string, unknown> | null;
  isActive?: boolean;
  createdBy?: string | null;
};

export type ScheduledReportUpdate = Partial<{
  name: string;
  reportType: string;
  format: 'CSV' | 'PDF' | 'EXCEL';
  scheduleCron: string;
  recipients: string[];
  params: Record<string, unknown> | null;
  isActive: boolean;
}>;

function buildUpdate(fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  const setClauses = entries.map(([key], index) => `${key} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  return { setClauses, values };
}

export const scheduledReportService = {
  async list() {
    const result = await pool.query(
      `SELECT id, name, report_type, format, schedule_cron, recipients, params,
              is_active, last_run_at, next_run_at, created_by, created_at, updated_at
       FROM scheduled_reports
       ORDER BY created_at DESC`
    );

    return result.rows;
  },

  async create(input: ScheduledReportInput) {
    const result = await pool.query(
      `INSERT INTO scheduled_reports
       (name, report_type, format, schedule_cron, recipients, params, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, report_type, format, schedule_cron, recipients, params,
                 is_active, last_run_at, next_run_at, created_by, created_at, updated_at`,
      [
        input.name,
        input.reportType,
        input.format,
        input.scheduleCron,
        JSON.stringify(input.recipients),
        input.params ? JSON.stringify(input.params) : null,
        input.isActive ?? true,
        input.createdBy ?? null
      ]
    );

    return result.rows[0];
  },

  async update(id: string, input: ScheduledReportUpdate) {
    const { setClauses, values } = buildUpdate({
      name: input.name,
      report_type: input.reportType,
      format: input.format,
      schedule_cron: input.scheduleCron,
      recipients: input.recipients ? JSON.stringify(input.recipients) : undefined,
      params: input.params !== undefined ? (input.params ? JSON.stringify(input.params) : null) : undefined,
      is_active: input.isActive,
      updated_at: new Date()
    });

    if (!setClauses.length) {
      const result = await pool.query(
        `SELECT id, name, report_type, format, schedule_cron, recipients, params,
                is_active, last_run_at, next_run_at, created_by, created_at, updated_at
         FROM scheduled_reports WHERE id = $1`,
        [id]
      );
      return result.rowCount ? result.rows[0] : null;
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE scheduled_reports
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, name, report_type, format, schedule_cron, recipients, params,
                 is_active, last_run_at, next_run_at, created_by, created_at, updated_at`,
      values
    );

    return result.rowCount ? result.rows[0] : null;
  },

  async remove(id: string) {
    const result = await pool.query('DELETE FROM scheduled_reports WHERE id = $1 RETURNING id', [id]);
    return result.rowCount ? result.rows[0] : null;
  }
};
