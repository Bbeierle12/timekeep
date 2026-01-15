import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireEmployee } from '../middleware/employeeAuth';
import { timeEntryService } from '../services/timeEntry.service';
import { employeeService } from '../services/employee.service';
import { dailySummaryService } from '../services/dailySummary.service';
import { reminderService } from '../services/reminder.service';
import { certificationService } from '../services/certification.service';
import { auditService } from '../services/audit.service';
import { z } from 'zod';

const router = Router();

router.get('/today', requireAuth, requireEmployee, async (req, res) => {
  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const entries = await timeEntryService.getEntriesForEmployee(employeeId, today);
  const summary = await dailySummaryService.getSummary(employeeId, today);
  const reminder = await reminderService.getLunchReminder(employeeId, today);
  res.json({ status: 'success', data: { date: today, entries, summary, reminder } });
});

router.get('/history', requireAuth, requireEmployee, async (req, res) => {
  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const limit = Number(req.query.limit ?? 50);
  const entries = await timeEntryService.listEntriesForEmployee(employeeId, limit);
  res.json({ status: 'success', data: { entries } });
});

router.get('/me', requireAuth, requireEmployee, async (req, res) => {
  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const employee = await employeeService.getById(employeeId);
  if (!employee) {
    res.status(404).json({ status: 'error', message: 'Employee not found' });
    return;
  }

  res.json({ status: 'success', data: employee });
});

const correctionSchema = z.object({
  workDate: z.string().optional(),
  note: z.string().min(3).max(1000)
});

router.post('/correction-request', requireAuth, requireEmployee, async (req, res) => {
  const parsed = correctionSchema.safeParse(req.body);
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
  const summary = await certificationService.requestCorrection({
    employeeId,
    workDate,
    note: parsed.data.note
  });

  await auditService.log({
    actorType: 'EMPLOYEE',
    actorId: employeeId,
    actorIdentifier: req.user?.id,
    action: 'CORRECTION_REQUESTED',
    targetType: 'DAILY_SUMMARY',
    details: { workDate },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success', data: summary });
});

export default router;
