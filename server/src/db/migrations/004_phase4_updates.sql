-- =============================================================
-- PHASE 4 UPDATES
-- =============================================================

-- 4.1 Increase initials length and add employee_id for alternative login
ALTER TABLE employees ALTER COLUMN initials TYPE VARCHAR(6);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code VARCHAR(20) UNIQUE;

-- 4.3 Add split shift premium tracking
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS has_split_shift BOOLEAN DEFAULT FALSE;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS split_shift_gap_minutes INTEGER;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS split_shift_premium_owed BOOLEAN DEFAULT FALSE;

-- 4.4 Add third meal period tracking for 15+ hour shifts
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS third_lunch_start_at TIMESTAMP;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS third_lunch_end_at TIMESTAMP;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS third_lunch_duration_minutes INTEGER;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS third_lunch_compliant BOOLEAN;
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS third_lunch_violation_type TEXT;

-- 4.5 Multi-state support
ALTER TABLE employees ADD COLUMN IF NOT EXISTS state_code VARCHAR(2) DEFAULT 'CA';
CREATE TABLE IF NOT EXISTS state_compliance_rules (
  id SERIAL PRIMARY KEY,
  state_code VARCHAR(2) UNIQUE NOT NULL,
  state_name VARCHAR(100) NOT NULL,
  meal_period_required_minutes INTEGER DEFAULT 30,
  meal_period_by_hour DECIMAL(4,2) DEFAULT 5.0,
  second_meal_by_hour DECIMAL(4,2) DEFAULT 10.0,
  rest_break_minutes INTEGER DEFAULT 10,
  rest_break_per_hours DECIMAL(4,2) DEFAULT 4.0,
  overtime_daily_threshold INTEGER DEFAULT 8,
  overtime_weekly_threshold INTEGER DEFAULT 40,
  allow_meal_waiver BOOLEAN DEFAULT TRUE,
  time_rounding_allowed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert California rules as default
INSERT INTO state_compliance_rules (state_code, state_name, meal_period_required_minutes, meal_period_by_hour,
  second_meal_by_hour, rest_break_minutes, rest_break_per_hours, overtime_daily_threshold,
  overtime_weekly_threshold, allow_meal_waiver, time_rounding_allowed)
VALUES ('CA', 'California', 30, 5.0, 10.0, 10, 4.0, 8, 40, TRUE, FALSE)
ON CONFLICT (state_code) DO NOTHING;

-- 4.6 Bulk employee import tracking
CREATE TABLE IF NOT EXISTS employee_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id),
  filename VARCHAR(255) NOT NULL,
  total_rows INTEGER NOT NULL,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'PENDING',
  error_details JSONB,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- 4.7 Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type VARCHAR(10) NOT NULL,
  user_id UUID NOT NULL,
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

-- 4.8 MFA enrollment support
ALTER TABLE admins ADD COLUMN IF NOT EXISTS mfa_secret_pending TEXT;

-- 4.8 MFA recovery codes
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id),
  code_hash VARCHAR(128) NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_admin ON mfa_recovery_codes(admin_id);

-- 4.9 Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type VARCHAR(10) NOT NULL,
  user_id UUID NOT NULL,
  platform VARCHAR(20) NOT NULL,
  token TEXT NOT NULL,
  device_info JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_type, user_id);

-- 4.10 Geofence configuration
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS geofence_latitude DECIMAL(10,7);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS geofence_longitude DECIMAL(10,7);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 100;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS geofence_enforcement VARCHAR(20) DEFAULT 'WARN';

-- Track geofence violations
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS outside_geofence BOOLEAN DEFAULT FALSE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS distance_from_geofence_meters INTEGER;
