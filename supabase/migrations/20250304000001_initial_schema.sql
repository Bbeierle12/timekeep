-- =============================================================
-- TIMEKEEP — Full Supabase Schema
-- Consolidated from database/schema.sql + server migrations
-- =============================================================

-- Extensions (pgcrypto is pre-installed on Supabase, but be explicit)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- TABLES
-- =============================================================

-- -------------------------------------------------------------
-- COMPANY SETTINGS (Single Row)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_settings (
    id                          INTEGER PRIMARY KEY DEFAULT 1,
    company_name                TEXT NOT NULL,
    timezone                    TEXT NOT NULL DEFAULT 'America/Los_Angeles',

    -- Authentication
    auth_method                 TEXT NOT NULL DEFAULT 'initials_pin',
    pin_length                  INTEGER DEFAULT 4,
    session_duration_employee   INTEGER DEFAULT 43200,
    session_duration_admin      INTEGER DEFAULT 28800,
    require_reauth_each_punch   BOOLEAN DEFAULT FALSE,
    failed_login_lockout_count  INTEGER DEFAULT 5,
    failed_login_lockout_minutes INTEGER DEFAULT 15,

    -- Admin security
    mfa_required_admin          BOOLEAN DEFAULT TRUE,
    trusted_devices_enabled     BOOLEAN DEFAULT FALSE,
    trusted_device_duration_days INTEGER DEFAULT 30,
    ip_allowlist_enabled        BOOLEAN DEFAULT FALSE,
    ip_allowlist                JSONB,

    -- Feature toggles
    feature_clock_enabled       BOOLEAN DEFAULT TRUE,
    feature_lunch_enabled       BOOLEAN DEFAULT TRUE,
    feature_breaks_enabled      BOOLEAN DEFAULT TRUE,
    feature_comments_enabled    BOOLEAN DEFAULT TRUE,
    feature_gps_enabled         BOOLEAN DEFAULT TRUE,
    feature_certification_required BOOLEAN DEFAULT TRUE,

    -- Compliance timing (in hours)
    lunch_reminder_1_hours      DECIMAL(4,2) DEFAULT 3.5,
    lunch_reminder_2_hours      DECIMAL(4,2) DEFAULT 4.5,
    lunch_reminder_urgent_hours DECIMAL(4,2) DEFAULT 4.83,
    lunch_minimum_minutes       INTEGER DEFAULT 30,
    lunch_maximum_minutes       INTEGER DEFAULT 60,

    -- Business rules
    allow_first_meal_waiver     BOOLEAN DEFAULT TRUE,
    allow_second_meal_waiver    BOOLEAN DEFAULT TRUE,
    auto_flag_short_lunch       BOOLEAN DEFAULT TRUE,
    require_comment_early_out   BOOLEAN DEFAULT FALSE,

    -- Payroll and overtime (California)
    pay_period_type             TEXT NOT NULL DEFAULT 'biweekly',
    week_start_day              INTEGER DEFAULT 0,
    rounding_minutes            INTEGER DEFAULT 5,
    overtime_daily_minutes      INTEGER DEFAULT 480,
    doubletime_daily_minutes    INTEGER DEFAULT 720,
    seventh_day_rule_enabled    BOOLEAN DEFAULT TRUE,

    -- Data governance
    retention_time_entries_days INTEGER DEFAULT 3650,
    retention_audit_log_days    INTEGER DEFAULT 3650,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN company_settings.rounding_minutes IS
  'DEPRECATED/UNUSED: Time rounding is prohibited in California (Donohue v. AMN Services, 2021). Retained for potential multi-state support.';

-- -------------------------------------------------------------
-- LOCATIONS / SITES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    address             TEXT,
    timezone            TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    geofence_radius_meters INTEGER,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- ADMIN ACCOUNTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL,
    name                TEXT NOT NULL,
    role                TEXT NOT NULL DEFAULT 'admin',
    is_active           BOOLEAN DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    failed_login_count  INTEGER DEFAULT 0,
    locked_until        TIMESTAMPTZ,

    -- MFA
    mfa_enabled         BOOLEAN DEFAULT FALSE,
    mfa_secret          TEXT,
    mfa_secret_pending  TEXT,
    mfa_recovery_codes  JSONB,
    mfa_enrolled_at     TIMESTAMPTZ,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- ADMIN TRUSTED DEVICES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_trusted_devices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id            UUID NOT NULL REFERENCES admins(id),
    device_fingerprint  TEXT NOT NULL,
    trusted_until       TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- EMPLOYEES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initials            VARCHAR(6) UNIQUE NOT NULL,
    employee_code       VARCHAR(20) UNIQUE,
    full_name           TEXT NOT NULL,

    -- Authentication
    pin_hash            TEXT,
    password_hash       TEXT,
    phone_number        TEXT,

    -- Classification
    is_exempt           BOOLEAN DEFAULT FALSE,
    state_code          VARCHAR(2) DEFAULT 'CA',

    -- Optional fields
    email               TEXT,
    hourly_rate         DECIMAL(10,2),
    hire_date           DATE,
    notes               TEXT,

    -- Location
    site_id             UUID REFERENCES locations(id),

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,
    deactivated_at      TIMESTAMPTZ,
    deactivated_by      UUID REFERENCES admins(id),

    -- Access gating
    access_status       TEXT NOT NULL DEFAULT 'PENDING',
    access_decided_by   UUID REFERENCES admins(id),
    access_decided_at   TIMESTAMPTZ,
    access_decision_note TEXT,

    -- Security
    failed_login_count  INTEGER DEFAULT 0,
    locked_until        TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID REFERENCES admins(id)
);

-- -------------------------------------------------------------
-- EMPLOYEE CONSENTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_consents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    consent_type        TEXT NOT NULL,
    consent_version     TEXT NOT NULL,
    accepted            BOOLEAN NOT NULL DEFAULT TRUE,
    consented_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address          TEXT,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_consents_employee_type
    ON employee_consents (employee_id, consent_type);

-- -------------------------------------------------------------
-- TIME ENTRIES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    work_date           DATE NOT NULL,
    action_type         TEXT NOT NULL,
    recorded_at         TIMESTAMPTZ NOT NULL,

    -- Location
    gps_latitude        DECIMAL(10,8),
    gps_longitude       DECIMAL(11,8),
    gps_accuracy_meters DECIMAL(8,2),
    resolved_address    TEXT,
    gps_unavailable     BOOLEAN DEFAULT FALSE,
    gps_suspicious      BOOLEAN DEFAULT FALSE,

    -- Comment
    comment             VARCHAR(500),

    -- Correction tracking
    is_original         BOOLEAN DEFAULT TRUE,
    original_recorded_at TIMESTAMPTZ,
    original_value      TIMESTAMPTZ,
    original_comment    TEXT,
    corrected_by        UUID REFERENCES admins(id),
    correction_reason   TEXT,
    corrected_at        TIMESTAMPTZ,

    -- Offline sync
    is_offline_sync     BOOLEAN DEFAULT FALSE,
    server_received_at  TIMESTAMPTZ DEFAULT NOW(),

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON time_entries(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_work_date ON time_entries(work_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_recorded ON time_entries(recorded_at DESC);

-- -------------------------------------------------------------
-- TIME ENTRY CORRECTIONS (Dual Approval)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_entry_corrections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_entry_id       UUID NOT NULL REFERENCES time_entries(id),
    requested_by        UUID NOT NULL REFERENCES admins(id),
    requested_at        TIMESTAMPTZ DEFAULT NOW(),
    request_reason      TEXT NOT NULL,
    new_recorded_at     TIMESTAMPTZ NOT NULL,
    new_action_type     TEXT,
    status              TEXT NOT NULL DEFAULT 'PENDING',
    approved_by         UUID REFERENCES admins(id),
    approved_at         TIMESTAMPTZ,
    applied_at          TIMESTAMPTZ,
    employee_notified   BOOLEAN DEFAULT FALSE
);

-- -------------------------------------------------------------
-- DAILY SUMMARIES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_summaries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees(id),
    work_date               DATE NOT NULL,

    -- Clock times
    clock_in_at             TIMESTAMPTZ,
    clock_out_at            TIMESTAMPTZ,

    -- Lunch
    lunch_start_at          TIMESTAMPTZ,
    lunch_end_at            TIMESTAMPTZ,
    lunch_duration_minutes  INTEGER,
    lunch_compliant         BOOLEAN,

    -- Second lunch
    second_lunch_start_at   TIMESTAMPTZ,
    second_lunch_end_at     TIMESTAMPTZ,
    second_lunch_duration_minutes INTEGER,
    second_lunch_compliant  BOOLEAN,
    second_lunch_violation_type TEXT,

    -- Third lunch (15+ hour shifts)
    third_lunch_start_at    TIMESTAMPTZ,
    third_lunch_end_at      TIMESTAMPTZ,
    third_lunch_duration_minutes INTEGER,
    third_lunch_compliant   BOOLEAN,
    third_lunch_violation_type TEXT,

    -- Breaks
    breaks_required         INTEGER DEFAULT 0,
    breaks_taken            INTEGER DEFAULT 0,

    -- Calculated hours
    total_shift_minutes     INTEGER,
    worked_minutes          INTEGER,
    overtime_minutes        INTEGER DEFAULT 0,
    doubletime_minutes      INTEGER DEFAULT 0,

    -- Compliance flags
    has_violation           BOOLEAN DEFAULT FALSE,
    violation_type          TEXT,
    premium_pay_owed        BOOLEAN DEFAULT FALSE,
    premium_pay_amount      DECIMAL(10,2),

    -- Split shift
    has_split_shift         BOOLEAN DEFAULT FALSE,
    split_shift_gap_minutes INTEGER,
    split_shift_premium_owed BOOLEAN DEFAULT FALSE,

    -- Overnight
    shift_crosses_midnight  BOOLEAN DEFAULT FALSE,

    -- Certification
    is_certified            BOOLEAN DEFAULT FALSE,
    certified_at            TIMESTAMPTZ,
    certification_comment   VARCHAR(500),

    -- Correction request
    correction_requested    BOOLEAN DEFAULT FALSE,
    correction_request_note VARCHAR(1000),
    correction_resolved     BOOLEAN,
    correction_resolved_by  UUID REFERENCES admins(id),
    correction_resolved_at  TIMESTAMPTZ,

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(work_date);

-- -------------------------------------------------------------
-- REST BREAKS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rest_breaks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    work_date       DATE NOT NULL,
    break_number    INTEGER NOT NULL CHECK (break_number BETWEEN 1 AND 3),
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ,
    duration_minutes INTEGER,
    acknowledged_only BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, work_date, break_number)
);

CREATE INDEX IF NOT EXISTS idx_rest_breaks_employee_date ON rest_breaks(employee_id, work_date);

-- -------------------------------------------------------------
-- WAIVERS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waivers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    work_date           DATE NOT NULL,
    waiver_type         TEXT NOT NULL,
    waiver_text_version TEXT NOT NULL,
    checkbox_checked    BOOLEAN NOT NULL DEFAULT TRUE,
    signature_image     BYTEA,
    signed_at           TIMESTAMPTZ NOT NULL,
    gps_latitude        DECIMAL(10,8),
    gps_longitude       DECIMAL(11,8),
    resolved_address    TEXT,
    is_revoked          BOOLEAN DEFAULT FALSE,
    revoked_at          TIMESTAMPTZ,
    is_invalid          BOOLEAN DEFAULT FALSE,
    invalid_reason      TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waivers_employee_date ON waivers(employee_id, work_date);

-- -------------------------------------------------------------
-- ATTESTATIONS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attestations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees(id),
    work_date               DATE NOT NULL,
    attestation_type        TEXT NOT NULL,
    selected_option         TEXT NOT NULL,
    option_a_suboption      TEXT,
    attestation_text_version TEXT NOT NULL,
    comment                 VARCHAR(1000),
    signature_image         BYTEA,
    signed_at               TIMESTAMPTZ NOT NULL,
    gps_latitude            DECIMAL(10,8),
    gps_longitude           DECIMAL(11,8),
    resolved_address        TEXT,
    triggers_premium        BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attestations_employee_date ON attestations(employee_id, work_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attestations_unique
    ON attestations(employee_id, work_date, attestation_type);

-- -------------------------------------------------------------
-- REMINDERS LOG
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    work_date           DATE NOT NULL,
    reminder_type       TEXT NOT NULL,
    shown_at            TIMESTAMPTZ NOT NULL,
    dismissed_at        TIMESTAMPTZ,
    action_taken        TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_employee_date ON reminders(employee_id, work_date);

-- -------------------------------------------------------------
-- AUDIT LOG
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type          TEXT NOT NULL,
    actor_id            UUID,
    actor_identifier    TEXT,
    action              TEXT NOT NULL,
    target_type         TEXT,
    target_id           UUID,
    details             JSONB,
    gps_latitude        DECIMAL(10,8),
    gps_longitude       DECIMAL(11,8),
    ip_address          INET,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- -------------------------------------------------------------
-- SESSIONS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type           TEXT NOT NULL,
    user_id             UUID NOT NULL,
    token_hash          TEXT NOT NULL UNIQUE,
    expires_at          TIMESTAMPTZ NOT NULL,
    ip_address          INET,
    user_agent          TEXT,
    device_info         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_type, user_id);

-- -------------------------------------------------------------
-- PASSWORD RESET TOKENS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type           VARCHAR(10) NOT NULL,
    user_id             UUID NOT NULL,
    token_hash          VARCHAR(128) UNIQUE NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    used_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

-- -------------------------------------------------------------
-- PUSH TOKENS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    token               TEXT NOT NULL UNIQUE,
    platform            TEXT NOT NULL,
    device_info         TEXT,
    last_seen           TIMESTAMPTZ,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_employee ON push_tokens(employee_id);

-- -------------------------------------------------------------
-- PUSH SUBSCRIPTIONS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type           VARCHAR(10) NOT NULL,
    user_id             UUID NOT NULL,
    platform            VARCHAR(20) NOT NULL,
    token               TEXT NOT NULL,
    device_info         JSONB,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_type, user_id);

-- -------------------------------------------------------------
-- SCHEDULED REPORTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    report_type         TEXT NOT NULL,
    format              TEXT NOT NULL DEFAULT 'CSV',
    schedule_cron       TEXT NOT NULL,
    recipients          JSONB NOT NULL,
    params              JSONB,
    is_active           BOOLEAN DEFAULT TRUE,
    last_run_at         TIMESTAMPTZ,
    next_run_at         TIMESTAMPTZ,
    created_by          UUID REFERENCES admins(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active);

-- -------------------------------------------------------------
-- STATE COMPLIANCE RULES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS state_compliance_rules (
    id                  SERIAL PRIMARY KEY,
    state_code          VARCHAR(2) UNIQUE NOT NULL,
    state_name          VARCHAR(100) NOT NULL,
    meal_period_required_minutes INTEGER DEFAULT 30,
    meal_period_by_hour DECIMAL(4,2) DEFAULT 5.0,
    second_meal_by_hour DECIMAL(4,2) DEFAULT 10.0,
    rest_break_minutes  INTEGER DEFAULT 10,
    rest_break_per_hours DECIMAL(4,2) DEFAULT 4.0,
    overtime_daily_threshold INTEGER DEFAULT 8,
    overtime_weekly_threshold INTEGER DEFAULT 40,
    allow_meal_waiver   BOOLEAN DEFAULT TRUE,
    time_rounding_allowed BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Seed California rules
INSERT INTO state_compliance_rules (
    state_code, state_name, meal_period_required_minutes, meal_period_by_hour,
    second_meal_by_hour, rest_break_minutes, rest_break_per_hours,
    overtime_daily_threshold, overtime_weekly_threshold,
    allow_meal_waiver, time_rounding_allowed
) VALUES (
    'CA', 'California', 30, 5.0, 10.0, 10, 4.0, 8, 40, TRUE, FALSE
) ON CONFLICT (state_code) DO NOTHING;

-- -------------------------------------------------------------
-- EMPLOYEE IMPORTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_imports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES admins(id),
    filename        VARCHAR(255) NOT NULL,
    total_rows      INTEGER NOT NULL,
    successful_rows INTEGER DEFAULT 0,
    failed_rows     INTEGER DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'PENDING',
    error_details   JSONB,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- -------------------------------------------------------------
-- MFA RECOVERY CODES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id    UUID NOT NULL REFERENCES admins(id),
    code_hash   VARCHAR(128) NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_admin ON mfa_recovery_codes(admin_id);
