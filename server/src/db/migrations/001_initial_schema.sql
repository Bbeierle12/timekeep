-- =============================================================
-- TIMEKEEP DATABASE SCHEMA
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------
-- COMPANY SETTINGS (Single Row)
-- -------------------------------------------------------------
CREATE TABLE company_settings (
    id                          INTEGER PRIMARY KEY DEFAULT 1,
    company_name                TEXT NOT NULL,
    timezone                    TEXT NOT NULL DEFAULT 'America/Los_Angeles',

    -- Authentication
    auth_method                 TEXT NOT NULL DEFAULT 'initials_pin',
        -- Options: 'pin', 'password', 'phone_sms', 'initials_pin'
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
        -- Options: 'weekly', 'biweekly'
    week_start_day              INTEGER DEFAULT 0,
    rounding_minutes            INTEGER DEFAULT 5,
    overtime_daily_minutes      INTEGER DEFAULT 480,
    doubletime_daily_minutes    INTEGER DEFAULT 720,
    seventh_day_rule_enabled    BOOLEAN DEFAULT TRUE,

    -- Data governance
    retention_time_entries_days INTEGER DEFAULT 3650,
    retention_audit_log_days    INTEGER DEFAULT 3650,

    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- LOCATIONS / SITES
-- -------------------------------------------------------------
CREATE TABLE locations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    address             TEXT,
    timezone            TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    geofence_radius_meters INTEGER,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- ADMIN ACCOUNTS
-- -------------------------------------------------------------
CREATE TABLE admins (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL,
    name                TEXT NOT NULL,
    role                TEXT NOT NULL DEFAULT 'admin',
        -- Options: 'owner', 'admin', 'read_only', 'payroll', 'compliance'
    is_active           BOOLEAN DEFAULT TRUE,
    last_login_at       TIMESTAMP,
    failed_login_count  INTEGER DEFAULT 0,
    locked_until        TIMESTAMP,

    -- MFA
    mfa_enabled         BOOLEAN DEFAULT FALSE,
    mfa_secret          TEXT,
    mfa_recovery_codes  JSONB,
    mfa_enrolled_at     TIMESTAMP,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- ADMIN TRUSTED DEVICES
-- -------------------------------------------------------------
CREATE TABLE admin_trusted_devices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id            UUID NOT NULL REFERENCES admins(id),
    device_fingerprint  TEXT NOT NULL,
    trusted_until       TIMESTAMP NOT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- EMPLOYEES
-- -------------------------------------------------------------
CREATE TABLE employees (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initials            VARCHAR(3) UNIQUE NOT NULL,
    employee_code       VARCHAR(20) UNIQUE,
    full_name           TEXT NOT NULL,

    -- Authentication (based on company auth_method)
    pin_hash            TEXT,
    password_hash       TEXT,
    phone_number        TEXT,

    -- Classification
    is_exempt           BOOLEAN DEFAULT FALSE,

    -- Optional fields
    email               TEXT,
    hourly_rate         DECIMAL(10,2),
    hire_date           DATE,
    notes               TEXT,

    -- Location
    site_id             UUID REFERENCES locations(id),

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,
    deactivated_at      TIMESTAMP,
    deactivated_by      UUID REFERENCES admins(id),

    -- Access gating
    access_status       TEXT NOT NULL DEFAULT 'PENDING',
        -- Options: 'PENDING', 'APPROVED', 'DENIED'
    access_decided_by   UUID REFERENCES admins(id),
    access_decided_at   TIMESTAMP,
    access_decision_note TEXT,

    -- Security
    failed_login_count  INTEGER DEFAULT 0,
    locked_until        TIMESTAMP,
    last_login_at       TIMESTAMP,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          UUID REFERENCES admins(id)
);

-- -------------------------------------------------------------
-- EMPLOYEE CONSENTS
-- -------------------------------------------------------------
CREATE TABLE employee_consents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    consent_type        TEXT NOT NULL,
    consent_version     TEXT NOT NULL,
    accepted            BOOLEAN NOT NULL DEFAULT TRUE,
    consented_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address          TEXT,
    user_agent          TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_consents_employee_type
    ON employee_consents (employee_id, consent_type);

-- -------------------------------------------------------------
-- TIME ENTRIES (One row per action)
-- -------------------------------------------------------------
CREATE TABLE time_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    work_date           DATE NOT NULL,

    -- Action
    action_type         TEXT NOT NULL,
        -- Options: 'CLOCK_IN', 'CLOCK_OUT',
        --          'LUNCH_START', 'LUNCH_END',
        --          'SECOND_LUNCH_START', 'SECOND_LUNCH_END',
        --          'THIRD_LUNCH_START', 'THIRD_LUNCH_END',
        --          'BREAK_ACK_1', 'BREAK_ACK_2', 'BREAK_ACK_3',
        --          'BREAK_SKIP_1', 'BREAK_SKIP_2', 'BREAK_SKIP_3'

    -- Timestamp
    recorded_at         TIMESTAMP NOT NULL,

    -- Location
    gps_latitude        DECIMAL(10,8),
    gps_longitude       DECIMAL(11,8),
    gps_accuracy_meters DECIMAL(8,2),
    resolved_address    TEXT,
    gps_unavailable     BOOLEAN DEFAULT FALSE,

    -- Comment
    comment             TEXT,

    -- Correction tracking
    is_original         BOOLEAN DEFAULT TRUE,
    original_recorded_at TIMESTAMP,
    original_value      TIMESTAMP,
    original_comment    TEXT,
    corrected_by        UUID REFERENCES admins(id),
    correction_reason   TEXT,
    corrected_at        TIMESTAMP,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_time_entries_employee_date ON time_entries(employee_id, work_date);
CREATE INDEX idx_time_entries_work_date ON time_entries(work_date);

-- -------------------------------------------------------------
-- TIME ENTRY CORRECTIONS (Dual Approval)
-- -------------------------------------------------------------
CREATE TABLE time_entry_corrections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_entry_id       UUID NOT NULL REFERENCES time_entries(id),
    requested_by        UUID NOT NULL REFERENCES admins(id),
    requested_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    request_reason      TEXT NOT NULL,
    new_recorded_at     TIMESTAMP NOT NULL,
    new_action_type     TEXT,
    status              TEXT NOT NULL DEFAULT 'PENDING',
        -- Options: 'PENDING', 'APPROVED', 'REJECTED', 'APPLIED'
    approved_by         UUID REFERENCES admins(id),
    approved_at         TIMESTAMP,
    applied_at          TIMESTAMP,
    employee_notified   BOOLEAN DEFAULT FALSE
);

-- -------------------------------------------------------------
-- DAILY SUMMARIES (Calculated, one row per employee per day)
-- -------------------------------------------------------------
CREATE TABLE daily_summaries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees(id),
    work_date               DATE NOT NULL,

    -- Clock times
    clock_in_at             TIMESTAMP,
    clock_out_at            TIMESTAMP,

    -- Lunch
    lunch_start_at          TIMESTAMP,
    lunch_end_at            TIMESTAMP,
    lunch_duration_minutes  INTEGER,
    lunch_compliant         BOOLEAN,

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

    -- Certification
    is_certified            BOOLEAN DEFAULT FALSE,
    certified_at            TIMESTAMP,
    certification_comment   TEXT,

    -- Correction request
    correction_requested    BOOLEAN DEFAULT FALSE,
    correction_request_note TEXT,
    correction_resolved     BOOLEAN,
    correction_resolved_by  UUID REFERENCES admins(id),
    correction_resolved_at  TIMESTAMP,

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(employee_id, work_date)
);

-- -------------------------------------------------------------
-- WAIVERS
-- -------------------------------------------------------------
CREATE TABLE waivers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    work_date           DATE NOT NULL,

    waiver_type         TEXT NOT NULL,
        -- Options: 'FIRST_MEAL_WAIVER', 'SECOND_MEAL_WAIVER'

    waiver_text_version TEXT NOT NULL,

    -- Agreement
    checkbox_checked    BOOLEAN NOT NULL DEFAULT TRUE,
    signature_image     BYTEA,

    -- Context
    signed_at           TIMESTAMP NOT NULL,
    gps_latitude        DECIMAL(10,8),
    gps_longitude       DECIMAL(11,8),
    resolved_address    TEXT,

    -- Revocation
    is_revoked          BOOLEAN DEFAULT FALSE,
    revoked_at          TIMESTAMP,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- ATTESTATIONS
-- -------------------------------------------------------------
CREATE TABLE attestations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    work_date           DATE NOT NULL,

    attestation_type    TEXT NOT NULL,
        -- Options: 'LATE_MEAL', 'SHORT_MEAL', 'MISSED_MEAL'

    -- Selection
    selected_option     TEXT NOT NULL,
    option_a_suboption  TEXT,

    attestation_text_version TEXT NOT NULL,
    comment             TEXT,
    signature_image     BYTEA,

    -- Context
    signed_at           TIMESTAMP NOT NULL,
    gps_latitude        DECIMAL(10,8),
    gps_longitude       DECIMAL(11,8),
    resolved_address    TEXT,

    -- Premium pay trigger
    triggers_premium    BOOLEAN DEFAULT FALSE,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- REMINDERS LOG
-- -------------------------------------------------------------
CREATE TABLE reminders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    work_date           DATE NOT NULL,

    reminder_type       TEXT NOT NULL,
        -- Options: 'LUNCH_PLAN', 'LUNCH_ESCALATE', 'LUNCH_URGENT',
        --          'BREAK_1', 'BREAK_2', 'BREAK_3'

    shown_at            TIMESTAMP NOT NULL,
    dismissed_at        TIMESTAMP,
    action_taken        TEXT,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- AUDIT LOG
-- -------------------------------------------------------------
CREATE TABLE audit_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who
    actor_type          TEXT NOT NULL,
    actor_id            UUID,
    actor_identifier    TEXT,

    -- What
    action              TEXT NOT NULL,

    -- Context
    target_type         TEXT,
    target_id           UUID,

    -- Details
    details             JSONB,

    -- Location
    gps_latitude        DECIMAL(10,8),
    gps_longitude       DECIMAL(11,8),

    -- Metadata
    ip_address          INET,
    user_agent          TEXT,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_type, actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- -------------------------------------------------------------
-- SESSIONS
-- -------------------------------------------------------------
CREATE TABLE sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_type           TEXT NOT NULL,
    user_id             UUID NOT NULL,

    token_hash          TEXT NOT NULL UNIQUE,

    expires_at          TIMESTAMP NOT NULL,

    -- Context
    ip_address          INET,
    user_agent          TEXT,
    device_info         TEXT,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_user ON sessions(user_type, user_id);

-- -------------------------------------------------------------
-- PASSWORD RESET TOKENS
-- -------------------------------------------------------------
CREATE TABLE password_reset_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type           VARCHAR(10) NOT NULL,
    user_id             UUID NOT NULL,
    token_hash          VARCHAR(128) UNIQUE NOT NULL,
    expires_at          TIMESTAMP NOT NULL,
    used_at             TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

-- -------------------------------------------------------------
-- PUSH TOKENS
-- -------------------------------------------------------------
CREATE TABLE push_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    token               TEXT NOT NULL UNIQUE,
    platform            TEXT NOT NULL,
    device_info         TEXT,
    last_seen           TIMESTAMP,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_push_tokens_employee ON push_tokens(employee_id);

-- -------------------------------------------------------------
-- SCHEDULED REPORTS
-- -------------------------------------------------------------
CREATE TABLE scheduled_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    report_type         TEXT NOT NULL,
    format              TEXT NOT NULL DEFAULT 'CSV',
    schedule_cron       TEXT NOT NULL,
    recipients          JSONB NOT NULL,
    params              JSONB,
    is_active           BOOLEAN DEFAULT TRUE,
    last_run_at         TIMESTAMP,
    next_run_at         TIMESTAMP,
    created_by          UUID REFERENCES admins(id),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_reports_active ON scheduled_reports(is_active);
