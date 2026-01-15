import { pool } from '../db/connection';

function toCsv(headers: string[], rows: Array<Array<string | number | null>>) {
  const escape = (value: string | number | null) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}

function toHours(minutes: number | null) {
  if (minutes === null || minutes === undefined) return '';
  return (minutes / 60).toFixed(2);
}

export const reportService = {
  async payrollReport(params: { start: string; end: string }) {
    const result = await pool.query(
      `SELECT ds.work_date, ds.employee_id, e.initials, e.full_name,
              ds.worked_minutes, ds.overtime_minutes, ds.doubletime_minutes
       FROM daily_summaries ds
       JOIN employees e ON e.id = ds.employee_id
       WHERE ds.work_date >= $1 AND ds.work_date <= $2
       ORDER BY ds.work_date ASC, e.full_name ASC`,
      [params.start, params.end]
    );

    const rows = result.rows.map((row) => [
      row.work_date,
      row.employee_id,
      row.initials,
      row.full_name,
      toHours(row.worked_minutes),
      toHours(row.overtime_minutes),
      toHours(row.doubletime_minutes)
    ]);

    return toCsv(
      ['work_date', 'employee_id', 'initials', 'full_name', 'worked_hours', 'ot_hours', 'doubletime_hours'],
      rows
    );
  },

  async timesheetReport(params: { start: string; end: string }) {
    const result = await pool.query(
      `SELECT ds.work_date, ds.employee_id, e.initials, e.full_name,
              ds.clock_in_at, ds.clock_out_at, ds.lunch_duration_minutes, ds.worked_minutes
       FROM daily_summaries ds
       JOIN employees e ON e.id = ds.employee_id
       WHERE ds.work_date >= $1 AND ds.work_date <= $2
       ORDER BY ds.work_date ASC, e.full_name ASC`,
      [params.start, params.end]
    );

    const rows = result.rows.map((row) => [
      row.work_date,
      row.employee_id,
      row.initials,
      row.full_name,
      row.clock_in_at ? new Date(row.clock_in_at).toISOString() : '',
      row.clock_out_at ? new Date(row.clock_out_at).toISOString() : '',
      row.lunch_duration_minutes ?? '',
      toHours(row.worked_minutes)
    ]);

    return toCsv(
      ['work_date', 'employee_id', 'initials', 'full_name', 'clock_in_at', 'clock_out_at', 'lunch_minutes', 'worked_hours'],
      rows
    );
  },

  async violationsReport(params: { start: string; end: string }) {
    const result = await pool.query(
      `SELECT ds.work_date, ds.employee_id, e.initials, e.full_name,
              ds.violation_type, ds.premium_pay_owed, ds.premium_pay_amount
       FROM daily_summaries ds
       JOIN employees e ON e.id = ds.employee_id
       WHERE ds.work_date >= $1 AND ds.work_date <= $2 AND ds.has_violation = TRUE
       ORDER BY ds.work_date DESC`,
      [params.start, params.end]
    );

    const rows = result.rows.map((row) => [
      row.work_date,
      row.employee_id,
      row.initials,
      row.full_name,
      row.violation_type,
      row.premium_pay_owed ?? '',
      row.premium_pay_amount ?? ''
    ]);

    return toCsv(
      ['work_date', 'employee_id', 'initials', 'full_name', 'violation_type', 'premium_pay_owed', 'premium_pay_amount'],
      rows
    );
  },

  async waiversReport(params: { start: string; end: string }) {
    const waiverResult = await pool.query(
      `SELECT w.work_date, w.employee_id, e.initials, e.full_name,
              w.waiver_type, w.signed_at
       FROM waivers w
       JOIN employees e ON e.id = w.employee_id
       WHERE w.work_date >= $1 AND w.work_date <= $2
       ORDER BY w.signed_at DESC`,
      [params.start, params.end]
    );

    const attestationResult = await pool.query(
      `SELECT a.work_date, a.employee_id, e.initials, e.full_name,
              a.attestation_type, a.selected_option, a.signed_at
       FROM attestations a
       JOIN employees e ON e.id = a.employee_id
       WHERE a.work_date >= $1 AND a.work_date <= $2
       ORDER BY a.signed_at DESC`,
      [params.start, params.end]
    );

    const rows = [
      ...waiverResult.rows.map((row) => [
        row.work_date,
        row.employee_id,
        row.initials,
        row.full_name,
        'WAIVER',
        row.waiver_type,
        row.signed_at ? new Date(row.signed_at).toISOString() : ''
      ]),
      ...attestationResult.rows.map((row) => [
        row.work_date,
        row.employee_id,
        row.initials,
        row.full_name,
        'ATTESTATION',
        row.attestation_type,
        row.signed_at ? new Date(row.signed_at).toISOString() : ''
      ])
    ];

    return toCsv(['work_date', 'employee_id', 'initials', 'full_name', 'record_type', 'type', 'signed_at'], rows);
  },

  async customReport(params: { start: string; end: string }) {
    const result = await pool.query(
      `SELECT ds.work_date, ds.employee_id, e.initials, e.full_name,
              ds.clock_in_at, ds.clock_out_at, ds.lunch_duration_minutes, ds.worked_minutes,
              ds.has_violation, ds.violation_type
       FROM daily_summaries ds
       JOIN employees e ON e.id = ds.employee_id
       WHERE ds.work_date >= $1 AND ds.work_date <= $2
       ORDER BY ds.work_date ASC, e.full_name ASC`,
      [params.start, params.end]
    );

    const rows = result.rows.map((row) => [
      row.work_date,
      row.employee_id,
      row.initials,
      row.full_name,
      row.clock_in_at ? new Date(row.clock_in_at).toISOString() : '',
      row.clock_out_at ? new Date(row.clock_out_at).toISOString() : '',
      row.lunch_duration_minutes ?? '',
      toHours(row.worked_minutes),
      row.has_violation ?? '',
      row.violation_type ?? ''
    ]);

    return toCsv(
      [
        'work_date',
        'employee_id',
        'initials',
        'full_name',
        'clock_in_at',
        'clock_out_at',
        'lunch_minutes',
        'worked_hours',
        'has_violation',
        'violation_type'
      ],
      rows
    );
  }
};
