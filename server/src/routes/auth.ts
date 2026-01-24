import { Router, type Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth';
import { requireEmployee } from '../middleware/employeeAuth';
import { employeeService } from '../services/employee.service';
import { passwordResetService } from '../services/passwordReset.service';
import { config } from '../config';

const router = Router();

const employeeLoginSchema = z.object({
  initials: z.string().min(2).max(3),
  pin: z.string().min(4)
});

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const changePinSchema = z.object({
  currentPin: z.string().min(4),
  newPin: z.string().min(4)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8)
});

const validateTokenSchema = z.object({
  token: z.string().min(1)
});

const authCookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  path: '/'
};

function setAuthCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(config.authCookieName, token, { ...authCookieOptions, expires: expiresAt });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(config.authCookieName, authCookieOptions);
}

router.post('/employee/login', async (req, res) => {
  const parsed = employeeLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const result = await authService.loginEmployee({
    initials: parsed.data.initials,
    pin: parsed.data.pin,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  if (!result.ok) {
    res.status(result.status).json({ status: 'error', message: result.message, code: result.code });
    return;
  }

  setAuthCookie(res, result.token, result.expiresAt);
  const { token, ...safeResult } = result;
  res.json({ status: 'success', data: safeResult });
});

router.post('/admin/login', async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const result = await authService.loginAdmin({
    email: parsed.data.email,
    password: parsed.data.password,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  if (!result.ok) {
    res.status(result.status).json({ status: 'error', message: result.message, code: result.code });
    return;
  }

  setAuthCookie(res, result.token, result.expiresAt);
  const { token, ...safeResult } = result;
  res.json({ status: 'success', data: safeResult });
});

router.post('/logout', requireAuth, async (req, res) => {
  if (!req.token) {
    res.status(400).json({ status: 'error', message: 'Missing token' });
    return;
  }

  await authService.logout({ token: req.token });
  clearAuthCookie(res);
  res.json({ status: 'success' });
});

router.post('/refresh', requireAuth, async (req, res) => {
  if (!req.token || !req.user) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const result = await authService.refreshToken({
    currentToken: req.token,
    userId: req.user.id,
    userType: req.user.type,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  if (!result.ok) {
    res.status(result.status).json({ status: 'error', message: result.message, code: result.code });
    return;
  }

  setAuthCookie(res, result.token, result.expiresAt);
  const { token, ...safeResult } = result;
  res.json({ status: 'success', data: safeResult });
});

router.get('/session', requireAuth, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const user = await authService.getSessionUser({
    userId: req.user.id,
    userType: req.user.type
  });

  if (!user) {
    res.status(403).json({ status: 'error', message: 'User not active' });
    return;
  }

  res.json({ status: 'success', data: { user } });
});

router.post('/employee/change-pin', requireAuth, requireEmployee, async (req, res) => {
  const parsed = changePinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const isValid = await employeeService.verifyPin(employeeId, parsed.data.currentPin);
  if (!isValid) {
    res.status(401).json({ status: 'error', message: 'Invalid current PIN' });
    return;
  }

  await employeeService.updatePin(employeeId, parsed.data.newPin);
  res.json({ status: 'success' });
});

router.post('/admin/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Valid email is required' });
    return;
  }

  try {
    const result = await passwordResetService.requestReset(parsed.data.email);

    // Always return success to prevent email enumeration
    res.json({
      status: 'success',
      message: result.message,
      // Include token only in development for testing
      ...(process.env.NODE_ENV === 'development' && result.token ? { token: result.token } : {})
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred processing your request' });
  }
});

router.post('/admin/validate-reset-token', async (req, res) => {
  const parsed = validateTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Token is required' });
    return;
  }

  try {
    const result = await passwordResetService.validateToken(parsed.data.token);
    res.json({
      status: 'success',
      data: { valid: result.valid }
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred validating the token' });
  }
});

router.post('/admin/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: 'error',
      message: 'Token and password (min 8 characters) are required'
    });
    return;
  }

  try {
    const result = await passwordResetService.resetPassword(
      parsed.data.token,
      parsed.data.newPassword
    );

    if (!result.success) {
      res.status(400).json({ status: 'error', message: result.message });
      return;
    }

    res.json({ status: 'success', message: result.message });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred resetting your password' });
  }
});

export default router;
