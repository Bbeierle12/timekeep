-- Migration: Add ON DELETE constraints to foreign keys
-- This prevents orphaned records and ensures referential integrity

-- time_entries: CASCADE delete when employee is deleted, SET NULL when admin is deleted
ALTER TABLE time_entries
  DROP CONSTRAINT IF EXISTS time_entries_employee_id_fkey;
ALTER TABLE time_entries
  ADD CONSTRAINT time_entries_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE time_entries
  DROP CONSTRAINT IF EXISTS time_entries_corrected_by_fkey;
ALTER TABLE time_entries
  ADD CONSTRAINT time_entries_corrected_by_fkey
    FOREIGN KEY (corrected_by) REFERENCES admins(id) ON DELETE SET NULL;

-- daily_summaries: CASCADE delete when employee is deleted
ALTER TABLE daily_summaries
  DROP CONSTRAINT IF EXISTS daily_summaries_employee_id_fkey;
ALTER TABLE daily_summaries
  ADD CONSTRAINT daily_summaries_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE daily_summaries
  DROP CONSTRAINT IF EXISTS daily_summaries_correction_resolved_by_fkey;
ALTER TABLE daily_summaries
  ADD CONSTRAINT daily_summaries_correction_resolved_by_fkey
    FOREIGN KEY (correction_resolved_by) REFERENCES admins(id) ON DELETE SET NULL;

-- weekly_summaries: CASCADE delete when employee is deleted
ALTER TABLE weekly_summaries
  DROP CONSTRAINT IF EXISTS weekly_summaries_employee_id_fkey;
ALTER TABLE weekly_summaries
  ADD CONSTRAINT weekly_summaries_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- waivers: CASCADE delete when employee is deleted
ALTER TABLE waivers
  DROP CONSTRAINT IF EXISTS waivers_employee_id_fkey;
ALTER TABLE waivers
  ADD CONSTRAINT waivers_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- attestations: CASCADE delete when employee is deleted
ALTER TABLE attestations
  DROP CONSTRAINT IF EXISTS attestations_employee_id_fkey;
ALTER TABLE attestations
  ADD CONSTRAINT attestations_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- reminders: CASCADE delete when employee is deleted
ALTER TABLE reminders
  DROP CONSTRAINT IF EXISTS reminders_employee_id_fkey;
ALTER TABLE reminders
  ADD CONSTRAINT reminders_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- employee_consents: CASCADE delete when employee is deleted
ALTER TABLE employee_consents
  DROP CONSTRAINT IF EXISTS employee_consents_employee_id_fkey;
ALTER TABLE employee_consents
  ADD CONSTRAINT employee_consents_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- push_tokens: CASCADE delete when employee is deleted
ALTER TABLE push_tokens
  DROP CONSTRAINT IF EXISTS push_tokens_employee_id_fkey;
ALTER TABLE push_tokens
  ADD CONSTRAINT push_tokens_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- admin_trusted_devices: CASCADE delete when admin is deleted
ALTER TABLE admin_trusted_devices
  DROP CONSTRAINT IF EXISTS admin_trusted_devices_admin_id_fkey;
ALTER TABLE admin_trusted_devices
  ADD CONSTRAINT admin_trusted_devices_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;

-- time_entry_corrections: CASCADE delete when time entry is deleted
ALTER TABLE time_entry_corrections
  DROP CONSTRAINT IF EXISTS time_entry_corrections_time_entry_id_fkey;
ALTER TABLE time_entry_corrections
  ADD CONSTRAINT time_entry_corrections_time_entry_id_fkey
    FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE;

ALTER TABLE time_entry_corrections
  DROP CONSTRAINT IF EXISTS time_entry_corrections_requested_by_fkey;
ALTER TABLE time_entry_corrections
  ADD CONSTRAINT time_entry_corrections_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES admins(id) ON DELETE SET NULL;

ALTER TABLE time_entry_corrections
  DROP CONSTRAINT IF EXISTS time_entry_corrections_approved_by_fkey;
ALTER TABLE time_entry_corrections
  ADD CONSTRAINT time_entry_corrections_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES admins(id) ON DELETE SET NULL;

-- employees: SET NULL when location or admin references are deleted
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_site_id_fkey;
ALTER TABLE employees
  ADD CONSTRAINT employees_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_deactivated_by_fkey;
ALTER TABLE employees
  ADD CONSTRAINT employees_deactivated_by_fkey
    FOREIGN KEY (deactivated_by) REFERENCES admins(id) ON DELETE SET NULL;

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_access_decided_by_fkey;
ALTER TABLE employees
  ADD CONSTRAINT employees_access_decided_by_fkey
    FOREIGN KEY (access_decided_by) REFERENCES admins(id) ON DELETE SET NULL;

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_created_by_fkey;
ALTER TABLE employees
  ADD CONSTRAINT employees_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL;

-- scheduled_reports: SET NULL when admin is deleted
ALTER TABLE scheduled_reports
  DROP CONSTRAINT IF EXISTS scheduled_reports_created_by_fkey;
ALTER TABLE scheduled_reports
  ADD CONSTRAINT scheduled_reports_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL;
