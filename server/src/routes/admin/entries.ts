import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/adminAuth';
import { timeEntryService } from '../../services/timeEntry.service';
import { correctionService } from '../../services/correction.service';
import { auditService } from '../../services/audit.service';

const router = Router();

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const dateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const employeeIdParamSchema = z.string().uuid();

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
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const updateEntrySchema = z.object({
  recordedAt: z.string().datetime().optional(),
  comment: z.string().optional().nullable(),
  reason: z.string().min(3).max(1000)
});

const createEntrySchema = z.object({
  employeeId: z.string().uuid(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  actionType: z.enum([
    'CLOCK_IN', 'CLOCK_OUT',
    'LUNCH_START', 'LUNCH_END',
    'SECOND_LUNCH_START', 'SECOND_LUNCH_END',
    'THIRD_LUNCH_START', 'THIRD_LUNCH_END',
    'BREAK_ACK_1', 'BREAK_ACK_2', 'BREAK_ACK_3',
    'BREAK_SKIP_1', 'BREAK_SKIP_2', 'BREAK_SKIP_3'
  ]),
  recordedAt: z.string().datetime(),
  comment: z.string().optional(),
  reason: z.string().min(3).max(1000)
});

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid query' });
    return;
  }

  const limit = parsed.data.limit ?? 200;
  const offset = parsed.data.offset ?? 0;
  const { items, total } = await timeEntryService.listEntriesPaged({ limit, offset });

  res.json({
    status: 'success',
    data: {
      items,
      total,
      limit,
      offset,
      nextOffset: offset + limit < total ? offset + limit : null
    }
  });
});

router.get('/daily/:date', async (req, res) => {
  const parsed = dateParamSchema.safeParse(req.params.date);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid date format' });
    return;
  }

  const date = parsed.data;
  const entries = await timeEntryService.getEntriesForDate(date);
  res.json({ status: 'success', data: entries });
});

router.get('/employee/:id', async (req, res) => {
  const parsedId = employeeIdParamSchema.safeParse(req.params.id);
  if (!parsedId.success) {
    res.status(400).json({ status: 'error', message: 'Invalid employee id' });
    return;
  }

  const dateQuery = z.object({
    date: dateParamSchema.optional()
  }).safeParse(req.query);
  if (!dateQuery.success) {
    res.status(400).json({ status: 'error', message: 'Invalid query' });
    return;
  }

  const date = dateQuery.data.date;
  const entries = await timeEntryService.getEntriesForEmployee(parsedId.data, date);
  res.json({ status: 'success', data: entries });
});

router.get('/corrections', async (req, res) => {
  const parsed = correctionsListSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid query' });
    return;
  }

  const limit = parsed.data.limit ?? 200;
  const offset = parsed.data.offset ?? 0;
  const { items, total } = await correctionService.list({
    ...parsed.data,
    limit,
    offset
  });

  res.json({
    status: 'success',
    data: {
      items,
      total,
      limit,
      offset,
      nextOffset: offset + limit < total ? offset + limit : null
    }
  });
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

router.put('/:id', async (req, res) => {
  const parsed = updateEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload. Reason is required.' });
    return;
  }

  try {
    const updated = await timeEntryService.updateEntry(req.params.id, {
      recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : undefined,
      comment: parsed.data.comment,
      correctedBy: req.user?.id,
      correctionReason: parsed.data.reason
    });

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Time entry not found' });
      return;
    }

    await auditService.log({
      actorType: 'ADMIN',
      actorId: req.user?.id,
      actorIdentifier: req.user?.id,
      action: 'TIME_ENTRY_EDITED',
      targetType: 'TIME_ENTRY',
      targetId: updated.id,
      details: {
        reason: parsed.data.reason,
        changes: {
          recordedAt: parsed.data.recordedAt,
          comment: parsed.data.comment
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.json({ status: 'success', data: updated });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
});

router.post('/', async (req, res) => {
  const parsed = createEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload', errors: parsed.error.errors });
    return;
  }

  try {
    const entry = await timeEntryService.createManualEntry(req.user?.id ?? '', {
      employeeId: parsed.data.employeeId,
      workDate: parsed.data.workDate,
      actionType: parsed.data.actionType,
      recordedAt: new Date(parsed.data.recordedAt),
      comment: parsed.data.comment,
      reason: parsed.data.reason
    });

    await auditService.log({
      actorType: 'ADMIN',
      actorId: req.user?.id,
      actorIdentifier: req.user?.id,
      action: 'TIME_ENTRY_CREATED',
      targetType: 'TIME_ENTRY',
      targetId: entry.id,
      details: {
        employeeId: parsed.data.employeeId,
        workDate: parsed.data.workDate,
        actionType: parsed.data.actionType,
        reason: parsed.data.reason
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.status(201).json({ status: 'success', data: entry });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
});

router.post('/override-certification', (_req, res) => {
  res.status(501).json({ status: 'error', message: 'Not implemented' });
});

export default router;
