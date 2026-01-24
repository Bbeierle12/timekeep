import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireEmployee } from '../../middleware/employeeAuth';
import { timeEntryService } from '../../services/timeEntry.service';
import { employeeService } from '../../services/employee.service';
import { dailySummaryService } from '../../services/dailySummary.service';
import { reminderService } from '../../services/reminder.service';
import { certificationService } from '../../services/certification.service';
import { auditService } from '../../services/audit.service';
import { getSettingsRow } from '../../services/settings.service';

const router = Router();

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const correctionSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().min(3).max(1000)
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

router.get('/me/today', requireAuth, requireEmployee, async (req, res) => {
  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const [entries, summary, reminder, settings] = await Promise.all([
    timeEntryService.getEntriesForEmployee(employeeId, today),
    dailySummaryService.getSummary(employeeId, today),
    reminderService.getLunchReminder(employeeId, today),
    getSettingsRow()
  ]);

  const reminderMessages: Record<string, string> = {
    LUNCH_PLAN: 'Plan your lunch break',
    LUNCH_ESCALATE: 'Lunch break due soon',
    LUNCH_URGENT: 'Urgent: take your lunch break'
  };

  const reminders = reminder
    ? [{
        type: reminder.type,
        message: reminderMessages[reminder.type] ?? 'Lunch reminder',
        urgent: reminder.type === 'LUNCH_URGENT'
      }]
    : [];

  res.json({
    status: 'success',
    data: {
      date: today,
      entries,
      summary,
      reminders,
      settings: {
        feature_clock_enabled: settings.feature_clock_enabled,
        feature_lunch_enabled: settings.feature_lunch_enabled,
        feature_breaks_enabled: settings.feature_breaks_enabled,
        feature_comments_enabled: settings.feature_comments_enabled,
        feature_gps_enabled: settings.feature_gps_enabled,
        lunch_minimum_minutes: settings.lunch_minimum_minutes
      }
    }
  });
});

router.get('/me/history', requireAuth, requireEmployee, async (req, res) => {
  const parsed = historyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid query' });
    return;
  }

  const employeeId = req.user?.id;
  if (!employeeId) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  const limit = parsed.data.limit ?? 50;
  const offset = parsed.data.offset ?? 0;
  const { items, total } = await timeEntryService.listEntriesForEmployeePaged(employeeId, {
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

router.post('/me/corrections', requireAuth, requireEmployee, async (req, res) => {
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
