import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireEmployee } from '../../middleware/employeeAuth';
import { consentService } from '../../services/consent.service';
import { CCPA_CONSENT_VERSION } from '../../config/consent';

const router = Router();

const consentSchema = z.object({
  accepted: z.boolean()
});

router.get('/location', requireAuth, requireEmployee, async (req, res) => {
  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const latest = await consentService.getLatest(employeeId);
  const hasConsented = Boolean(latest?.accepted);
  const consentedAt = hasConsented ? latest?.consented_at ?? null : null;
  const consentVersion = latest?.consent_version ?? null;
  const requiresReconsent = !latest || consentVersion !== CCPA_CONSENT_VERSION;

  res.json({
    status: 'success',
    data: {
      hasConsented,
      consentedAt,
      consentVersion,
      requiresReconsent
    }
  });
});

router.post('/location', requireAuth, requireEmployee, async (req, res) => {
  const parsed = consentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const record = await consentService.record({
    employeeId,
    accepted: parsed.data.accepted,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    status: 'success',
    data: {
      success: true,
      consentedAt: record.consented_at
    }
  });
});

export default router;
