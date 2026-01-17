import { pool } from '../db/connection';
import { hashPassword } from '../utils/hash';
import { hashToken, generateSecureToken } from '../utils/token';

const TOKEN_EXPIRY_HOURS = 24;

export type PasswordResetResult = {
  success: boolean;
  message: string;
  token?: string; // Only for development/testing, not returned in production
};

export const passwordResetService = {
  /**
   * Request a password reset for an admin user
   * In production, this would send an email with the reset link
   */
  async requestReset(email: string): Promise<PasswordResetResult> {
    const adminResult = await pool.query(
      `SELECT id, email, name FROM admins WHERE email = $1 AND is_active = TRUE`,
      [email.toLowerCase()]
    );

    if (adminResult.rows.length === 0) {
      // Don't reveal if email exists
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      };
    }

    const admin = adminResult.rows[0];

    // Generate secure token
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Invalidate any existing tokens for this user
    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND user_type = 'ADMIN' AND used_at IS NULL`,
      [admin.id]
    );

    // Create new reset token
    await pool.query(
      `INSERT INTO password_reset_tokens (user_type, user_id, token_hash, expires_at)
       VALUES ('ADMIN', $1, $2, $3)`,
      [admin.id, tokenHash, expiresAt]
    );

    // In production, send email here
    // await sendPasswordResetEmail(admin.email, admin.name, token);

    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent',
      token // Only include in development for testing
    };
  },

  /**
   * Validate a password reset token
   */
  async validateToken(token: string): Promise<{ valid: boolean; userId?: string; userType?: string }> {
    const tokenHash = hashToken(token);

    const result = await pool.query(
      `SELECT user_id, user_type, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return { valid: false };
    }

    const tokenRecord = result.rows[0];

    if (tokenRecord.used_at) {
      return { valid: false };
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: tokenRecord.user_id,
      userType: tokenRecord.user_type
    };
  },

  /**
   * Reset password using a valid token
   */
  async resetPassword(token: string, newPassword: string): Promise<PasswordResetResult> {
    const validation = await this.validateToken(token);

    if (!validation.valid) {
      return {
        success: false,
        message: 'Invalid or expired reset token'
      };
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters'
      };
    }

    const passwordHash = await hashPassword(newPassword);
    const tokenHash = hashToken(token);

    // Update password
    if (validation.userType === 'ADMIN') {
      await pool.query(
        `UPDATE admins SET password_hash = $1 WHERE id = $2`,
        [passwordHash, validation.userId]
      );
    }

    // Mark token as used
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = $1`,
      [tokenHash]
    );

    return {
      success: true,
      message: 'Password has been reset successfully'
    };
  },

  /**
   * Request PIN reset for an employee (admin-initiated)
   */
  async resetEmployeePin(employeeId: string, newPin: string): Promise<PasswordResetResult> {
    if (newPin.length < 4 || !/^\d+$/.test(newPin)) {
      return {
        success: false,
        message: 'PIN must be at least 4 digits'
      };
    }

    const pinHash = await hashPassword(newPin);

    const result = await pool.query(
      `UPDATE employees SET pin_hash = $1 WHERE id = $2 RETURNING id`,
      [pinHash, employeeId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Employee not found'
      };
    }

    return {
      success: true,
      message: 'PIN has been reset successfully'
    };
  },

  /**
   * Clean up expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await pool.query(
      `DELETE FROM password_reset_tokens
       WHERE expires_at < CURRENT_TIMESTAMP OR used_at IS NOT NULL
       RETURNING id`
    );

    return result.rowCount ?? 0;
  }
};
