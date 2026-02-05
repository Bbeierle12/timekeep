-- Migration: Add performance indexes for common query patterns
-- Using CONCURRENTLY where possible to avoid locking tables

-- Sessions: Index for cleanup jobs and expiration checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at
  ON sessions(expires_at);

-- Time entries: Index for action type filtering in compliance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_action_type
  ON time_entries(action_type);

-- Daily summaries: Partial indexes for common compliance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_summaries_has_violation
  ON daily_summaries(employee_id, work_date)
  WHERE has_violation = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_summaries_uncertified
  ON daily_summaries(employee_id, work_date)
  WHERE is_certified = FALSE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_summaries_premium_owed
  ON daily_summaries(employee_id, work_date)
  WHERE premium_pay_owed = TRUE;

-- Employees: Index for active employee queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_active
  ON employees(is_active)
  WHERE is_active = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_access_status
  ON employees(access_status);

-- Waivers: Index for valid waivers lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waivers_valid
  ON waivers(employee_id, work_date)
  WHERE is_revoked = FALSE AND is_invalid = FALSE;

-- Audit log: Index for target lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_target
  ON audit_log(target_type, target_id);

-- Weekly summaries: Index for week boundary lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weekly_summaries_date_range
  ON weekly_summaries(week_start_date, week_end_date);

-- Password reset tokens: Index for expiration cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_password_reset_tokens_expires
  ON password_reset_tokens(expires_at);

-- Admins: Index for active admin queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admins_active
  ON admins(is_active)
  WHERE is_active = TRUE;
