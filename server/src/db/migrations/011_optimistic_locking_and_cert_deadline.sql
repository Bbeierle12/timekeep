-- Optimistic locking: version counter on time_entries to prevent concurrent edit conflicts
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Certification deadline: configurable hours after clock-out by which certification must occur
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS certification_deadline_hours INTEGER DEFAULT 48;

-- Track overdue certifications
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS certification_overdue BOOLEAN DEFAULT FALSE;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS certification_deadline_at TIMESTAMPTZ;
