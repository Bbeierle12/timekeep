-- Add columns for weekly overtime, rest break violations, and seventh day tracking

-- Weekly overtime: stores the weekly OT minutes calculated when a day is recalculated
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS weekly_overtime_minutes INTEGER DEFAULT 0;

-- Rest break violations: track whether missing breaks constitute a violation
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS rest_break_violation BOOLEAN DEFAULT FALSE;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS rest_break_premium_count INTEGER DEFAULT 0;

-- Seventh day: flag when this day is a 7th consecutive day worked in the workweek
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS is_seventh_day BOOLEAN DEFAULT FALSE;

-- Composite violation_types: change from single TEXT to support multiple violations
-- We'll store as comma-separated for backward compat, or use a JSONB array
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS violation_types TEXT[] DEFAULT '{}';

-- Add overtime_weekly_threshold and seventh_day to company_settings if not already present
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS overtime_weekly_threshold INTEGER DEFAULT 40;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS doubletime_daily_threshold INTEGER DEFAULT 12;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS rest_break_minimum_minutes INTEGER DEFAULT 10;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS rest_break_interval_hours DECIMAL(3,1) DEFAULT 4.0;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS seventh_day_rule_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS week_start_day INTEGER DEFAULT 0;
