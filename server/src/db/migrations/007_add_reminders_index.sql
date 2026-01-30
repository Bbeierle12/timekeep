-- =============================================================
-- ADD REMINDERS INDEX
-- =============================================================

-- Add index for efficient reminder lookups by employee and date
CREATE INDEX IF NOT EXISTS idx_reminders_employee_date ON reminders(employee_id, work_date);
