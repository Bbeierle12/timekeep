import { pool } from '../connection';
import { hashPassword } from '../../utils/hash';

async function seedTestData() {
  console.log('Seeding test data...');

  // 1. Create company settings
  const settingsExists = await pool.query('SELECT id FROM company_settings LIMIT 1');
  if (!settingsExists.rowCount) {
    await pool.query(`
      INSERT INTO company_settings (id, company_name, timezone)
      VALUES (1, 'Acme Construction Inc.', 'America/Los_Angeles')
    `);
    console.log('Created company settings');
  }

  // 2. Create test employees
  const employees = [
    { initials: 'JD', fullName: 'John Doe', pin: '1234' },
    { initials: 'JS', fullName: 'Jane Smith', pin: '5678' },
    { initials: 'MB', fullName: 'Mike Brown', pin: '4321' },
    { initials: 'AW', fullName: 'Alice Wilson', pin: '8765' },
    { initials: 'TC', fullName: 'Tom Clark', pin: '1111' },
  ];

  const employeeIds: string[] = [];

  for (const emp of employees) {
    const existing = await pool.query('SELECT id FROM employees WHERE initials = $1', [emp.initials]);
    if (existing.rowCount) {
      employeeIds.push(existing.rows[0].id);
      console.log(`Employee ${emp.initials} already exists`);
      continue;
    }

    const pinHash = await hashPassword(emp.pin);
    const result = await pool.query(
      `INSERT INTO employees (initials, full_name, pin_hash, is_active, access_status)
       VALUES ($1, $2, $3, true, 'APPROVED')
       RETURNING id`,
      [emp.initials, emp.fullName, pinHash]
    );
    employeeIds.push(result.rows[0].id);
    console.log(`Created employee: ${emp.fullName} (${emp.initials}) - PIN: ${emp.pin}`);
  }

  // 3. Create time entries for the past 7 days
  const today = new Date();

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const workDate = new Date(today);
    workDate.setDate(workDate.getDate() - dayOffset);
    const dateStr = workDate.toISOString().split('T')[0];

    // Skip weekends
    const dayOfWeek = workDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (let i = 0; i < employeeIds.length; i++) {
      const empId = employeeIds[i];

      // Check if entries already exist for this employee/date
      const existing = await pool.query(
        'SELECT id FROM time_entries WHERE employee_id = $1 AND work_date = $2 LIMIT 1',
        [empId, dateStr]
      );
      if (existing.rowCount) continue;

      // Randomize start time between 6:00 and 8:30 AM
      const startHour = 6 + Math.floor(Math.random() * 2.5);
      const startMinute = Math.floor(Math.random() * 60);

      const clockIn = new Date(workDate);
      clockIn.setHours(startHour, startMinute, 0, 0);

      // Clock in
      await pool.query(
        `INSERT INTO time_entries (employee_id, work_date, action_type, recorded_at, gps_latitude, gps_longitude, resolved_address)
         VALUES ($1, $2, 'CLOCK_IN', $3, 34.0522, -118.2437, '123 Main St, Los Angeles, CA')`,
        [empId, dateStr, clockIn]
      );

      // Lunch start (4-5 hours after clock in)
      const lunchStart = new Date(clockIn);
      lunchStart.setHours(lunchStart.getHours() + 4 + Math.floor(Math.random() * 1));
      lunchStart.setMinutes(Math.floor(Math.random() * 30));

      await pool.query(
        `INSERT INTO time_entries (employee_id, work_date, action_type, recorded_at, gps_latitude, gps_longitude, resolved_address)
         VALUES ($1, $2, 'LUNCH_START', $3, 34.0522, -118.2437, '123 Main St, Los Angeles, CA')`,
        [empId, dateStr, lunchStart]
      );

      // Lunch end (30-45 minutes after lunch start)
      const lunchEnd = new Date(lunchStart);
      lunchEnd.setMinutes(lunchEnd.getMinutes() + 30 + Math.floor(Math.random() * 15));

      await pool.query(
        `INSERT INTO time_entries (employee_id, work_date, action_type, recorded_at, gps_latitude, gps_longitude, resolved_address)
         VALUES ($1, $2, 'LUNCH_END', $3, 34.0522, -118.2437, '123 Main St, Los Angeles, CA')`,
        [empId, dateStr, lunchEnd]
      );

      // Clock out (8-10 hours after clock in)
      const clockOut = new Date(clockIn);
      clockOut.setHours(clockOut.getHours() + 8 + Math.floor(Math.random() * 2));
      clockOut.setMinutes(Math.floor(Math.random() * 60));

      // Only clock out if not today (leave today's entries open for some employees)
      if (dayOffset > 0 || i < 3) {
        await pool.query(
          `INSERT INTO time_entries (employee_id, work_date, action_type, recorded_at, gps_latitude, gps_longitude, resolved_address)
           VALUES ($1, $2, 'CLOCK_OUT', $3, 34.0522, -118.2437, '123 Main St, Los Angeles, CA')`,
          [empId, dateStr, clockOut]
        );
      }

      // Create daily summary
      const workedMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000) -
                           Math.floor((lunchEnd.getTime() - lunchStart.getTime()) / 60000);
      const overtimeMinutes = Math.max(0, workedMinutes - 480);

      await pool.query(
        `INSERT INTO daily_summaries (employee_id, work_date, clock_in_at, clock_out_at, lunch_start_at, lunch_end_at,
         lunch_duration_minutes, lunch_compliant, worked_minutes, overtime_minutes, is_certified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10)
         ON CONFLICT (employee_id, work_date) DO NOTHING`,
        [empId, dateStr, clockIn, dayOffset > 0 || i < 3 ? clockOut : null, lunchStart, lunchEnd,
         Math.floor((lunchEnd.getTime() - lunchStart.getTime()) / 60000), workedMinutes, overtimeMinutes,
         dayOffset > 1]
      );
    }

    console.log(`Created time entries for ${dateStr}`);
  }

  console.log('\nTest data seeded successfully!');
  console.log('\nEmployee credentials (initials / PIN):');
  employees.forEach(emp => {
    console.log(`  ${emp.initials} / ${emp.pin} - ${emp.fullName}`);
  });
}

seedTestData()
  .catch((error) => {
    console.error('Error seeding test data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
