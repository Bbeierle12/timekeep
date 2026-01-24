CREATE TABLE IF NOT EXISTS employee_consents (
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

CREATE INDEX IF NOT EXISTS idx_employee_consents_employee_type
    ON employee_consents (employee_id, consent_type);
