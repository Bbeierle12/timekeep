import { pool } from '../db/connection';
import { hashToken, generateSecureToken } from '../utils/token';
import crypto from 'crypto';

const RECOVERY_CODE_COUNT = 10;

export type MfaSetupResult = {
  secret: string;
  qrCodeUrl: string;
  recoveryCodes: string[];
};

/**
 * Generate a TOTP secret (base32 encoded)
 * In production, use a library like speakeasy or otplib
 */
function generateTotpSecret(): string {
  const buffer = crypto.randomBytes(20);
  // Base32 encoding - using hex as fallback since Node doesn't natively support base32
  // In production, use a proper base32 library or speakeasy which handles this
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  const bytes = buffer;
  for (let i = 0; i < bytes.length; i += 5) {
    const chunk = bytes.slice(i, i + 5);
    for (let j = 0; j < 8 && i + Math.floor(j * 5 / 8) < bytes.length; j++) {
      const index = (chunk[Math.floor(j * 5 / 8)] >> (3 - (j * 5 % 8))) & 0x1f;
      result += alphabet[index] || alphabet[0];
    }
  }
  return result.slice(0, 32);
}

/**
 * Generate recovery codes
 */
function generateRecoveryCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 10-character alphanumeric codes
    const code = generateSecureToken(5)
      .toUpperCase()
      .replace(/(.{5})/g, '$1-')
      .slice(0, 11);
    codes.push(code);
  }
  return codes;
}

export const mfaService = {
  /**
   * Begin MFA setup for an admin
   * Returns the secret and QR code URL for the authenticator app
   */
  async beginSetup(adminId: string): Promise<MfaSetupResult> {
    // Get admin info
    const adminResult = await pool.query(
      `SELECT email FROM admins WHERE id = $1`,
      [adminId]
    );

    if (adminResult.rows.length === 0) {
      throw new Error('Admin not found');
    }

    const email = adminResult.rows[0].email;
    const secret = generateTotpSecret();

    // Generate QR code URL (otpauth format)
    const issuer = 'Timekeep';
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

    // Store secret temporarily (will be confirmed on verification)
    await pool.query(
      `UPDATE admins SET mfa_secret_pending = $1 WHERE id = $2`,
      [secret, adminId]
    );

    // Generate recovery codes
    const recoveryCodes = generateRecoveryCodes(RECOVERY_CODE_COUNT);

    return {
      secret,
      qrCodeUrl,
      recoveryCodes
    };
  },

  /**
   * Complete MFA setup by verifying the first TOTP code
   */
  async completeSetup(adminId: string, totpCode: string, recoveryCodes: string[]): Promise<boolean> {
    // Get pending secret
    const adminResult = await pool.query(
      `SELECT mfa_secret_pending FROM admins WHERE id = $1`,
      [adminId]
    );

    if (adminResult.rows.length === 0 || !adminResult.rows[0].mfa_secret_pending) {
      throw new Error('MFA setup not initiated');
    }

    const secret = adminResult.rows[0].mfa_secret_pending;

    // Verify TOTP code
    // In production, use speakeasy.totp.verify() or similar
    const isValid = this.verifyTotpCode(secret, totpCode);

    if (!isValid) {
      throw new Error('Invalid TOTP code');
    }

    // Save the secret and enable MFA
    await pool.query(
      `UPDATE admins
       SET mfa_secret = $1, mfa_secret_pending = NULL, mfa_enabled = TRUE
       WHERE id = $2`,
      [secret, adminId]
    );

    // Save recovery codes (hashed)
    for (const code of recoveryCodes) {
      await pool.query(
        `INSERT INTO mfa_recovery_codes (admin_id, code_hash)
         VALUES ($1, $2)`,
        [adminId, hashToken(code.replace(/-/g, ''))]
      );
    }

    return true;
  },

  /**
   * Verify a TOTP code
   * NOTE: This is a placeholder. In production, use speakeasy or otplib
   */
  verifyTotpCode(secret: string, code: string): boolean {
    // This is a simplified check - in production use a proper TOTP library
    // that handles time drift and validates against the actual algorithm
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      return false;
    }

    // For now, accept any 6-digit code during development
    // TODO: Implement proper TOTP verification with speakeasy or otplib
    console.warn('TOTP verification is a stub - install speakeasy/otplib for production');
    return true;
  },

  /**
   * Verify a recovery code (one-time use)
   */
  async verifyRecoveryCode(adminId: string, code: string): Promise<boolean> {
    const codeHash = hashToken(code.replace(/-/g, '').toUpperCase());

    const result = await pool.query(
      `SELECT id FROM mfa_recovery_codes
       WHERE admin_id = $1 AND code_hash = $2 AND used_at IS NULL`,
      [adminId, codeHash]
    );

    if (result.rows.length === 0) {
      return false;
    }

    // Mark code as used
    await pool.query(
      `UPDATE mfa_recovery_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [result.rows[0].id]
    );

    return true;
  },

  /**
   * Disable MFA for an admin
   */
  async disable(adminId: string): Promise<void> {
    await pool.query(
      `UPDATE admins SET mfa_enabled = FALSE, mfa_secret = NULL WHERE id = $1`,
      [adminId]
    );

    // Delete recovery codes
    await pool.query(
      `DELETE FROM mfa_recovery_codes WHERE admin_id = $1`,
      [adminId]
    );
  },

  /**
   * Get remaining recovery codes count
   */
  async getRemainingRecoveryCodesCount(adminId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM mfa_recovery_codes
       WHERE admin_id = $1 AND used_at IS NULL`,
      [adminId]
    );

    return parseInt(result.rows[0].count, 10);
  },

  /**
   * Regenerate recovery codes
   */
  async regenerateRecoveryCodes(adminId: string): Promise<string[]> {
    // Delete existing codes
    await pool.query(
      `DELETE FROM mfa_recovery_codes WHERE admin_id = $1`,
      [adminId]
    );

    // Generate new codes
    const recoveryCodes = generateRecoveryCodes(RECOVERY_CODE_COUNT);

    // Save new codes
    for (const code of recoveryCodes) {
      await pool.query(
        `INSERT INTO mfa_recovery_codes (admin_id, code_hash)
         VALUES ($1, $2)`,
        [adminId, hashToken(code.replace(/-/g, ''))]
      );
    }

    return recoveryCodes;
  }
};
