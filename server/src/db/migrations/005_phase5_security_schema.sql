-- =============================================================
-- PHASE 5 UPDATES
-- =============================================================

-- Add missing correction history fields for time entries
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS original_recorded_at TIMESTAMP;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS original_comment TEXT;
