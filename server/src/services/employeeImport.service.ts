import { pool } from '../db/connection';
import { hashPassword } from '../utils/hash';

export type EmployeeImportRow = {
  initials: string;
  full_name: string;
  employee_code?: string;
  pin?: string;
  hourly_rate?: number;
  state_code?: string;
  is_exempt?: boolean;
};

export type ImportResult = {
  success: boolean;
  row: number;
  initials: string;
  error?: string;
};

export type ImportSummary = {
  importId: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  results: ImportResult[];
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function validateRow(row: EmployeeImportRow, rowNumber: number): string | null {
  if (!row.initials || row.initials.length < 2 || row.initials.length > 6) {
    return `Row ${rowNumber}: Initials must be 2-6 characters`;
  }

  if (!row.full_name || row.full_name.length < 2) {
    return `Row ${rowNumber}: Full name is required`;
  }

  if (row.pin && (row.pin.length < 4 || !/^\d+$/.test(row.pin))) {
    return `Row ${rowNumber}: PIN must be at least 4 digits`;
  }

  if (row.hourly_rate !== undefined && (row.hourly_rate < 0 || row.hourly_rate > 1000)) {
    return `Row ${rowNumber}: Invalid hourly rate`;
  }

  if (row.state_code && row.state_code.length !== 2) {
    return `Row ${rowNumber}: State code must be 2 characters`;
  }

  return null;
}

export const employeeImportService = {
  /**
   * Parse CSV content and return employee rows
   */
  parseCSV(csvContent: string): EmployeeImportRow[] {
    const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const rows: EmployeeImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });

      rows.push({
        initials: row.initials?.toUpperCase() ?? '',
        full_name: row.full_name ?? row.name ?? '',
        employee_code: row.employee_code || row.employee_id || undefined,
        pin: row.pin || undefined,
        hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
        state_code: row.state_code?.toUpperCase() || row.state?.toUpperCase() || undefined,
        is_exempt: row.is_exempt === 'true' || row.exempt === 'true' || row.is_exempt === '1'
      });
    }

    return rows;
  },

  /**
   * Import employees from parsed CSV data
   */
  async importEmployees(
    adminId: string,
    filename: string,
    rows: EmployeeImportRow[]
  ): Promise<ImportSummary> {
    // Create import record
    const importResult = await pool.query(
      `INSERT INTO employee_imports (admin_id, filename, total_rows, status)
       VALUES ($1, $2, $3, 'PROCESSING')
       RETURNING id`,
      [adminId, filename, rows.length]
    );

    const importId = importResult.rows[0].id;
    const results: ImportResult[] = [];
    let successfulRows = 0;
    let failedRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for 1-indexed and header row

      // Validate row
      const validationError = validateRow(row, rowNumber);
      if (validationError) {
        results.push({
          success: false,
          row: rowNumber,
          initials: row.initials,
          error: validationError
        });
        failedRows++;
        continue;
      }

      try {
        // Check for duplicate initials
        const existingResult = await pool.query(
          `SELECT id FROM employees WHERE initials = $1`,
          [row.initials]
        );

        if (existingResult.rows.length > 0) {
          results.push({
            success: false,
            row: rowNumber,
            initials: row.initials,
            error: `Row ${rowNumber}: Employee with initials '${row.initials}' already exists`
          });
          failedRows++;
          continue;
        }

        // Hash PIN if provided
        const pinHash = row.pin ? await hashPassword(row.pin) : null;

        // Insert employee
        await pool.query(
          `INSERT INTO employees
           (initials, full_name, employee_code, pin_hash, hourly_rate, state_code, is_exempt,
            is_active, access_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 'APPROVED')`,
          [
            row.initials,
            row.full_name,
            row.employee_code ?? null,
            pinHash,
            row.hourly_rate ?? null,
            row.state_code ?? 'CA',
            row.is_exempt ?? false
          ]
        );

        results.push({
          success: true,
          row: rowNumber,
          initials: row.initials
        });
        successfulRows++;
      } catch (error) {
        results.push({
          success: false,
          row: rowNumber,
          initials: row.initials,
          error: `Row ${rowNumber}: ${(error as Error).message}`
        });
        failedRows++;
      }
    }

    // Update import record
    await pool.query(
      `UPDATE employee_imports
       SET successful_rows = $1, failed_rows = $2, status = 'COMPLETED',
           completed_at = $3, error_details = $4
       WHERE id = $5`,
      [
        successfulRows,
        failedRows,
        new Date(),
        JSON.stringify(results.filter((r) => !r.success)),
        importId
      ]
    );

    return {
      importId,
      totalRows: rows.length,
      successfulRows,
      failedRows,
      results
    };
  },

  /**
   * Get import history for an admin
   */
  async getImportHistory(adminId: string, limit = 20) {
    const result = await pool.query(
      `SELECT id, filename, total_rows, successful_rows, failed_rows, status,
              started_at, completed_at
       FROM employee_imports
       WHERE admin_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [adminId, limit]
    );

    return result.rows;
  },

  /**
   * Get details of a specific import
   */
  async getImportDetails(importId: string) {
    const result = await pool.query(
      `SELECT * FROM employee_imports WHERE id = $1`,
      [importId]
    );

    return result.rows[0] ?? null;
  }
};
