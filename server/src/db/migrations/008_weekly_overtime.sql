-- Migration: Weekly Overtime Support
-- Adds weekly_summaries table and 7th consecutive day tracking

-- Weekly summaries for overtime calculation
CREATE TABLE IF NOT EXISTS weekly_summaries (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id                 UUID NOT NULL REFERENCES employees(id),
    week_start_date             DATE NOT NULL,
    week_end_date               DATE NOT NULL,

    -- Aggregated hours
    total_worked_minutes        INTEGER DEFAULT 0,
    total_daily_overtime_minutes INTEGER DEFAULT 0,
    total_daily_doubletime_minutes INTEGER DEFAULT 0,

    -- Weekly overtime (hours over 40 not already counted as daily OT)
    weekly_overtime_minutes     INTEGER DEFAULT 0,

    -- 7th consecutive day tracking
    consecutive_days_worked     INTEGER DEFAULT 0,
    is_seventh_day_week         BOOLEAN DEFAULT FALSE,
    seventh_day_date            DATE,
    seventh_day_overtime_minutes INTEGER DEFAULT 0,
    seventh_day_doubletime_minutes INTEGER DEFAULT 0,

    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(employee_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_summaries_employee
    ON weekly_summaries(employee_id);

CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week
    ON weekly_summaries(week_start_date, week_end_date);

-- Add weekly overtime tracking to daily_summaries
ALTER TABLE daily_summaries
    ADD COLUMN IF NOT EXISTS is_seventh_consecutive_day BOOLEAN DEFAULT FALSE;

ALTER TABLE daily_summaries
    ADD COLUMN IF NOT EXISTS weekly_overtime_minutes INTEGER DEFAULT 0;

-- Add index for efficient weekly queries
CREATE INDEX IF NOT EXISTS idx_daily_summaries_employee_date
    ON daily_summaries(employee_id, work_date);
