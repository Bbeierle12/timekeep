-- MFA challenge tokens: short-lived tokens issued after password verification
-- but before MFA verification, to enforce two-factor authentication for admins.

CREATE TABLE IF NOT EXISTS mfa_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  challenge_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfa_challenges_token ON mfa_challenges(challenge_token_hash);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_admin ON mfa_challenges(admin_id);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_expires ON mfa_challenges(expires_at);
