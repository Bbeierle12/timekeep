import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/adminAuth';
import { reportService } from '../../services/report.service';
import { scheduledReportService } from '../../services/scheduledReport.service';
import { auditService } from '../../services/audit.service';

const router = Router();

const rangeSchema = z.object({
  start: z.string(),
  end: z.string()
});

const scheduledCreateSchema = z.object({
  name: z.string().min(2),
  reportType: z.string().min(2),
  format: z.enum(['CSV', 'PDF', 'EXCEL']).default('CSV'),
  scheduleCron: z.string().min(5),
  recipients: z.array(z.string().email()).min(1),
  params: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional()
});

const scheduledUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  reportType: z.string().min(2).optional(),
  format: z.enum(['CSV', 'PDF', 'EXCEL']).optional(),
  scheduleCron: z.string().min(5).optional(),
  recipients: z.array(z.string().email()).min(1).optional(),
  params: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional()
});

router.use(requireAuth, requireAdmin);

router.get('/payroll', async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Missing date range' });
    return;
  }

  const csv = await reportService.payrollReport(parsed.data);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

router.get('/timesheet', async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Missing date range' });
    return;
  }

  const csv = await reportService.timesheetReport(parsed.data);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

router.get('/violations', async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Missing date range' });
    return;
  }

  const csv = await reportService.violationsReport(parsed.data);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

router.get('/waivers', async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Missing date range' });
    return;
  }

  const csv = await reportService.waiversReport(parsed.data);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

router.post('/custom', async (req, res) => {
  const parsed = rangeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Missing date range' });
    return;
  }

  const csv = await reportService.customReport(parsed.data);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

router.get('/scheduled', async (_req, res) => {
  const scheduled = await scheduledReportService.list();
  res.json({ status: 'success', data: scheduled });
});

router.post('/scheduled', async (req, res) => {
  const parsed = scheduledCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const scheduled = await scheduledReportService.create({
    ...parsed.data,
    createdBy: req.user?.id ?? null
  });

  await auditService.log({
    actorType: 'ADMIN',
    actorId: req.user?.id,
    actorIdentifier: req.user?.id,
    action: 'SCHEDULED_REPORT_CREATED',
    targetType: 'SCHEDULED_REPORT',
    targetId: scheduled.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.status(201).json({ status: 'success', data: scheduled });
});

router.put('/scheduled/:id', async (req, res) => {
  const parsed = scheduledUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const scheduled = await scheduledReportService.update(req.params.id, parsed.data);
  if (!scheduled) {
    res.status(404).json({ status: 'error', message: 'Scheduled report not found' });
    return;
  }

  await auditService.log({
    actorType: 'ADMIN',
    actorId: req.user?.id,
    actorIdentifier: req.user?.id,
    action: 'SCHEDULED_REPORT_UPDATED',
    targetType: 'SCHEDULED_REPORT',
    targetId: scheduled.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success', data: scheduled });
});

router.delete('/scheduled/:id', async (req, res) => {
  const scheduled = await scheduledReportService.remove(req.params.id);
  if (!scheduled) {
    res.status(404).json({ status: 'error', message: 'Scheduled report not found' });
    return;
  }

  await auditService.log({
    actorType: 'ADMIN',
    actorId: req.user?.id,
    actorIdentifier: req.user?.id,
    action: 'SCHEDULED_REPORT_DELETED',
    targetType: 'SCHEDULED_REPORT',
    targetId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success' });
});

export default router;
