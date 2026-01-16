import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth';
import { requireEmployee } from '../middleware/employeeAuth';
import { employeeService } from '../services/employee.service';

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

  res.json({ status: 'success', data: result });
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

  res.json({ status: 'success', data: result });
});

router.post('/logout', requireAuth, async (req, res) => {
  if (!req.token) {
    res.status(400).json({ status: 'error', message: 'Missing token' });
    return;
  }

  await authService.logout({ token: req.token });
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

  res.json({ status: 'success', data: result });
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

router.post('/admin/forgot-password', (_req, res) => {
  res.status(501).json({ status: 'error', message: 'Not implemented' });
});

router.post('/admin/reset-password', (_req, res) => {
  res.status(501).json({ status: 'error', message: 'Not implemented' });
});

export default router;
