-- =============================================================
-- PHASE 3 UPDATES
-- =============================================================

-- 3.6 Document unused rounding_minutes setting
-- NOTE: The rounding_minutes column in company_settings is intentionally NOT USED.
-- Per Donohue v. AMN Services (2021), California employers can no longer use
-- time rounding policies. All time must be recorded to the minute.
-- The column is retained for potential future multi-state support where rounding
-- may be legal, but it is not read by any application code.
COMMENT ON COLUMN company_settings.rounding_minutes IS
  'DEPRECATED/UNUSED: Time rounding is prohibited in California (Donohue v. AMN Services, 2021). Retained for potential multi-state support.';

-- 3.1 Add overnight shift tracking
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS shift_crosses_midnight BOOLEAN DEFAULT FALSE;

-- 3.5 Add input length limits (using VARCHAR instead of TEXT for explicit limits)
-- Note: PostgreSQL TEXT and VARCHAR have the same performance, this is for documentation
ALTER TABLE time_entries ALTER COLUMN comment TYPE VARCHAR(500);
ALTER TABLE daily_summaries ALTER COLUMN certification_comment TYPE VARCHAR(500);
ALTER TABLE daily_summaries ALTER COLUMN correction_request_note TYPE VARCHAR(1000);
ALTER TABLE attestations ALTER COLUMN comment TYPE VARCHAR(1000);
-- Note: waivers table doesn't have a comment column in the initial schema

-- 3.8 Add REST break duration tracking table
CREATE TABLE IF NOT EXISTS rest_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  work_date DATE NOT NULL,
  break_number INTEGER NOT NULL CHECK (break_number BETWEEN 1 AND 3),
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP,
  duration_minutes INTEGER,
  acknowledged_only BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, work_date, break_number)
);

CREATE INDEX IF NOT EXISTS idx_rest_breaks_employee_date ON rest_breaks(employee_id, work_date);
