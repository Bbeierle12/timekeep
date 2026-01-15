import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requireEmployee } from '../middleware/employeeAuth';
import { pushTokenService } from '../services/pushToken.service';
import { auditService } from '../services/audit.service';

const router = Router();

const registerSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(['ios', 'android', 'web']),
  deviceInfo: z.string().optional()
});

const revokeSchema = z.object({
  token: z.string().min(10)
});

router.use(requireAuth, requireEmployee);

router.post('/', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const tokenRecord = await pushTokenService.register({
    employeeId,
    token: parsed.data.token,
    platform: parsed.data.platform,
    deviceInfo: parsed.data.deviceInfo
  });

  await auditService.log({
    actorType: 'EMPLOYEE',
    actorId: employeeId,
    actorIdentifier: req.user?.id,
    action: 'PUSH_TOKEN_REGISTERED',
    targetType: 'PUSH_TOKEN',
    targetId: tokenRecord.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.status(201).json({ status: 'success', data: tokenRecord });
});

router.post('/revoke', async (req, res) => {
  const parsed = revokeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const result = await pushTokenService.revoke(employeeId, parsed.data.token);
  if (!result) {
    res.status(404).json({ status: 'error', message: 'Token not found' });
    return;
  }

  await auditService.log({
    actorType: 'EMPLOYEE',
    actorId: employeeId,
    actorIdentifier: req.user?.id,
    action: 'PUSH_TOKEN_REVOKED',
    targetType: 'PUSH_TOKEN',
    targetId: result.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success' });
});

export default router;
