-- =============================================================
-- SEED DATA for local Supabase development
-- =============================================================

-- Default company settings
INSERT INTO company_settings (id, company_name, timezone) 
VALUES (1, 'TimeKeep Demo', 'America/Los_Angeles')
ON CONFLICT (id) DO NOTHING;

-- California compliance rules (also in migration, but ensure it exists)
INSERT INTO state_compliance_rules (
    state_code, state_name, meal_period_required_minutes, meal_period_by_hour,
    second_meal_by_hour, rest_break_minutes, rest_break_per_hours,
    overtime_daily_threshold, overtime_weekly_threshold,
    allow_meal_waiver, time_rounding_allowed
) VALUES (
    'CA', 'California', 30, 5.0, 10.0, 10, 4.0, 8, 40, TRUE, FALSE
) ON CONFLICT (state_code) DO NOTHING;
