import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/adminAuth';
import { timeEntryService } from '../../services/timeEntry.service';
import { correctionService } from '../../services/correction.service';
import { auditService } from '../../services/audit.service';

const router = Router();

const listSchema = z.object({
  limit: z.coerce.number().min(1).max(500).optional()
});

const correctionRequestSchema = z.object({
  newRecordedAt: z.string().datetime(),
  newActionType: z.string().optional(),
  reason: z.string().min(3).max(1000)
});

const correctionDecisionSchema = z.object({
  notifyEmployee: z.boolean().optional()
});

const correctionsListSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'APPLIED']).optional(),
  limit: z.coerce.number().min(1).max(500).optional()
});

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid query' });
    return;
  }

  const entries = await timeEntryService.listEntries(parsed.data.limit ?? 200);
  res.json({ status: 'success', data: entries });
});

router.get('/daily/:date', async (req, res) => {
  const date = req.params.date;
  const entries = await timeEntryService.getEntriesForDate(date);
  res.json({ status: 'success', data: entries });
});

router.get('/employee/:id', async (req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined;
  const entries = await timeEntryService.getEntriesForEmployee(req.params.id, date);
  res.json({ status: 'success', data: entries });
});

router.get('/corrections', async (req, res) => {
  const parsed = correctionsListSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid query' });
    return;
  }

  const corrections = await correctionService.list(parsed.data);
  res.json({ status: 'success', data: corrections });
});

router.post('/:id/corrections', async (req, res) => {
  const parsed = correctionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  try {
    const correction = await correctionService.requestCorrection({
      timeEntryId: req.params.id,
      requestedBy: req.user?.id ?? '',
      requestReason: parsed.data.reason,
      newRecordedAt: new Date(parsed.data.newRecordedAt),
      newActionType: parsed.data.newActionType
    });

    await auditService.log({
      actorType: 'ADMIN',
      actorId: req.user?.id,
      actorIdentifier: req.user?.id,
      action: 'TIME_ENTRY_CORRECTION_REQUESTED',
      targetType: 'TIME_ENTRY_CORRECTION',
      targetId: correction.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.status(201).json({ status: 'success', data: correction });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
});

router.post('/corrections/:id/approve', async (req, res) => {
  const parsed = correctionDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  try {
    const correction = await correctionService.approveCorrection({
      correctionId: req.params.id,
      approvedBy: req.user?.id ?? ''
    });

    await auditService.log({
      actorType: 'ADMIN',
      actorId: req.user?.id,
      actorIdentifier: req.user?.id,
      action: 'TIME_ENTRY_CORRECTION_APPROVED',
      targetType: 'TIME_ENTRY_CORRECTION',
      targetId: correction.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.json({ status: 'success', data: correction });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
});

router.post('/corrections/:id/reject', async (req, res) => {
  const parsed = correctionDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  try {
    const correction = await correctionService.rejectCorrection({
      correctionId: req.params.id,
      approvedBy: req.user?.id ?? ''
    });

    await auditService.log({
      actorType: 'ADMIN',
      actorId: req.user?.id,
      actorIdentifier: req.user?.id,
      action: 'TIME_ENTRY_CORRECTION_REJECTED',
      targetType: 'TIME_ENTRY_CORRECTION',
      targetId: correction.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.json({ status: 'success', data: correction });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
});

router.post('/corrections/:id/apply', async (req, res) => {
  const parsed = correctionDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  try {
    const correction = await correctionService.applyCorrection({
      correctionId: req.params.id,
      appliedBy: req.user?.id ?? '',
      notifyEmployee: parsed.data.notifyEmployee
    });

    await auditService.log({
      actorType: 'ADMIN',
      actorId: req.user?.id,
      actorIdentifier: req.user?.id,
      action: 'TIME_ENTRY_CORRECTION_APPLIED',
      targetType: 'TIME_ENTRY_CORRECTION',
      targetId: correction.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.json({ status: 'success', data: correction });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
});

router.put('/:id', (_req, res) => {
  res.status(501).json({ status: 'error', message: 'Not implemented' });
});

router.post('/', (_req, res) => {
  res.status(501).json({ status: 'error', message: 'Not implemented' });
});

router.post('/override-certification', (_req, res) => {
  res.status(501).json({ status: 'error', message: 'Not implemented' });
});

export default router;
