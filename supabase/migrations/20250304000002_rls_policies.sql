-- =============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================
-- TimeKeep uses a custom auth system (not Supabase Auth), so RLS
-- policies here protect data at the database level. The Express
-- API server connects with the service_role key which bypasses RLS.
--
-- These policies are designed for the anon key (frontend direct access)
-- and protect against unauthorized data exposure if the anon key
-- is ever used to query the database directly.
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entry_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rest_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- DEFAULT DENY: By enabling RLS with no policies for the anon role,
-- all direct access via the anon key is denied by default.
-- The service_role key (used by our Express server) bypasses RLS.
-- =============================================================

-- Allow the service_role full access (our Express API server)
-- Note: service_role bypasses RLS by default in Supabase, so these
-- policies are mainly for documentation and to be explicit.

-- Public read-only tables (safe for anon key)
CREATE POLICY "Allow anon to read company settings"
    ON company_settings FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anon to read locations"
    ON locations FOR SELECT
    TO anon
    USING (is_active = true);

CREATE POLICY "Allow anon to read state compliance rules"
    ON state_compliance_rules FOR SELECT
    TO anon
    USING (true);

-- All other tables: deny anon access (no SELECT/INSERT/UPDATE/DELETE policies)
-- The Express API server uses service_role which bypasses RLS entirely.
-- If you later add Supabase Auth or frontend direct-DB access, add
-- granular policies here per-table.

-- =============================================================
-- HELPER FUNCTION: updated_at trigger
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_company_settings
    BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_locations
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_admins
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_employees
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_daily_summaries
    BEFORE UPDATE ON daily_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_scheduled_reports
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
