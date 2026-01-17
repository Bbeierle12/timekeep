import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requireEmployee } from '../middleware/employeeAuth';
import { certificationService } from '../services/certification.service';
import { auditService } from '../services/audit.service';

const router = Router();

const certifySchema = z.object({
  workDate: z.string().optional(),
  comment: z.string().max(1000).optional(),
  requestCorrection: z.boolean().optional(),
  correctionNote: z.string().max(1000).optional()
});

router.get('/pending', requireAuth, requireEmployee, async (req, res) => {
  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const pending = await certificationService.getPendingCertification(employeeId);
  res.json({ status: 'success', data: pending });
});

router.get('/pending/all', requireAuth, requireEmployee, async (req, res) => {
  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const pendingDays = await certificationService.getAllPendingCertifications(employeeId);
  res.json({ status: 'success', data: pendingDays });
});

router.post('/', requireAuth, requireEmployee, async (req, res) => {
  const parsed = certifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const workDate = parsed.data.workDate ?? new Date().toISOString().slice(0, 10);

  const summary = await certificationService.certifyDay({
    employeeId,
    workDate,
    comment: parsed.data.comment,
    requestCorrection: parsed.data.requestCorrection,
    correctionNote: parsed.data.correctionNote
  });

  if (!summary) {
    res.status(404).json({ status: 'error', message: 'Summary not found' });
    return;
  }

  await auditService.log({
    actorType: 'EMPLOYEE',
    actorId: employeeId,
    actorIdentifier: req.user?.id,
    action: 'DAY_CERTIFIED',
    targetType: 'DAILY_SUMMARY',
    targetId: undefined,
    details: { workDate },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success', data: summary });
});

export default router;
