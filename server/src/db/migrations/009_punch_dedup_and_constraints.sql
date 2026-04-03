-- Prevent duplicate punches: same employee, same day, same action type, within the same minute.
-- Uses DATE_TRUNC('minute', recorded_at) so two punches at 14:32:15 and 14:32:45 are treated as duplicates,
-- but punches a minute apart are allowed (handles legitimate break ack sequences).
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_dedup
ON time_entries (employee_id, work_date, action_type, DATE_TRUNC('minute', recorded_at));

-- Prevent duplicate active waivers of the same type on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_waivers_active_unique
ON waivers (employee_id, work_date, waiver_type)
WHERE is_revoked = FALSE AND is_invalid = FALSE;

-- Add index on sessions.expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
