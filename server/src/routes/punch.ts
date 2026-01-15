import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requireEmployee } from '../middleware/employeeAuth';
import { timeEntryService } from '../services/timeEntry.service';
import { auditService } from '../services/audit.service';

const router = Router();

const punchSchema = z.object({
  actionType: z.enum([
    'CLOCK_IN',
    'CLOCK_OUT',
    'LUNCH_START',
    'LUNCH_END',
    'BREAK_ACK_1',
    'BREAK_ACK_2',
    'BREAK_ACK_3',
    'BREAK_SKIP_1',
    'BREAK_SKIP_2',
    'BREAK_SKIP_3'
  ]),
  recordedAt: z.string().datetime().optional(),
  comment: z.string().max(500).optional(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  gpsAccuracyMeters: z.number().optional(),
  resolvedAddress: z.string().optional(),
  gpsUnavailable: z.boolean().optional()
});

const batchSchema = z.object({
  punches: z.array(punchSchema).min(1).max(50)
});

router.post('/', requireAuth, requireEmployee, async (req, res) => {
  const parsed = punchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const recordedAt = parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date();

  let entry;
  try {
    entry = await timeEntryService.recordPunch({
      employeeId,
      actionType: parsed.data.actionType,
      recordedAt,
      comment: parsed.data.comment,
      gpsLatitude: parsed.data.gpsLatitude,
      gpsLongitude: parsed.data.gpsLongitude,
      gpsAccuracyMeters: parsed.data.gpsAccuracyMeters,
      resolvedAddress: parsed.data.resolvedAddress,
      gpsUnavailable: parsed.data.gpsUnavailable
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
    return;
  }

  await auditService.log({
    actorType: 'EMPLOYEE',
    actorId: employeeId,
    actorIdentifier: req.user?.id,
    action: parsed.data.actionType,
    targetType: 'TIME_ENTRY',
    targetId: entry.id,
    details: { recordedAt: entry.recorded_at },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success', data: entry });
});

router.post('/batch', requireAuth, requireEmployee, async (req, res) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const punches = parsed.data.punches.map((punch) => ({
    ...punch,
    recordedAt: punch.recordedAt ? new Date(punch.recordedAt) : new Date()
  }));

  try {
    const entries = await timeEntryService.recordBatch(employeeId, punches);

    for (const entry of entries) {
      await auditService.log({
        actorType: 'EMPLOYEE',
        actorId: employeeId,
        actorIdentifier: req.user?.id,
        action: entry.action_type,
        targetType: 'TIME_ENTRY',
        targetId: entry.id,
        details: { recordedAt: entry.recorded_at },
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? undefined
      });
    }

    res.json({ status: 'success', data: entries });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
});

export default router;
