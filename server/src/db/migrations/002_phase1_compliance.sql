-- =============================================================
-- PHASE 1 COMPLIANCE UPDATES
-- =============================================================

-- 1.5 Add server-side timestamp validation columns
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS is_offline_sync BOOLEAN DEFAULT FALSE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2.7 Add GPS suspicious flag for plausibility validation
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS gps_suspicious BOOLEAN DEFAULT FALSE;

-- 1.6 Add second meal period tracking columns
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS second_lunch_start_at TIMESTAMP;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS second_lunch_end_at TIMESTAMP;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS second_lunch_duration_minutes INTEGER;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS second_lunch_compliant BOOLEAN;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS second_lunch_violation_type TEXT;

-- 2.1 Add waiver invalidation tracking
ALTER TABLE waivers ADD COLUMN IF NOT EXISTS is_invalid BOOLEAN DEFAULT FALSE;
ALTER TABLE waivers ADD COLUMN IF NOT EXISTS invalid_reason TEXT;

-- 2.3 Add premium pay amount tracking
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS premium_pay_amount DECIMAL(10,2);

-- Add indexes for performance (Phase 3.3)
CREATE INDEX IF NOT EXISTS idx_waivers_employee_date ON waivers(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attestations_employee_date ON attestations(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_recorded ON time_entries(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(work_date);

-- Unique constraint to prevent double attestations (Phase 2.9)
CREATE UNIQUE INDEX IF NOT EXISTS idx_attestations_unique
ON attestations(employee_id, work_date, attestation_type);
