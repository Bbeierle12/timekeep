import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/adminAuth';
import { employeeService } from '../../services/employee.service';
import { employeeImportService } from '../../services/employeeImport.service';
import { auditService } from '../../services/audit.service';

const router = Router();

const createEmployeeSchema = z.object({
  initials: z.string().min(2).max(3),
  fullName: z.string().min(2),
  isExempt: z.boolean().default(false),
  pin: z.string().min(4).optional(),
  email: z.string().email().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  hourlyRate: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  siteId: z.string().uuid().optional().nullable()
});

const updateEmployeeSchema = z.object({
  initials: z.string().min(2).max(3).optional(),
  fullName: z.string().min(2).optional(),
  isExempt: z.boolean().optional(),
  email: z.string().email().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  hourlyRate: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional()
});

const resetPinSchema = z.object({
  pin: z.string().min(4)
});

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const status = (req.query.status as 'active' | 'inactive' | 'all') ?? 'all';
  const search = req.query.search ? String(req.query.search) : undefined;
  const employees = await employeeService.list({ status, search });
  res.json({ status: 'success', data: employees });
});

router.post('/', async (req, res) => {
  const parsed = createEmployeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  try {
    const employee = await employeeService.create({
      ...parsed.data,
      createdBy: req.user?.id
    });

    await auditService.log({
      actorType: 'ADMIN',
      actorId: req.user?.id,
      actorIdentifier: req.user?.id,
      action: 'EMPLOYEE_CREATED',
      targetType: 'EMPLOYEE',
      targetId: employee.id,
      details: { initials: employee.initials, fullName: employee.full_name },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.status(201).json({ status: 'success', data: employee });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
});

router.get('/:id', async (req, res) => {
  const employee = await employeeService.getById(req.params.id);
  if (!employee) {
    res.status(404).json({ status: 'error', message: 'Employee not found' });
    return;
  }

  res.json({ status: 'success', data: employee });
});

router.put('/:id', async (req, res) => {
  const parsed = updateEmployeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const employee = await employeeService.update(req.params.id, parsed.data);
  if (!employee) {
    res.status(404).json({ status: 'error', message: 'Employee not found' });
    return;
  }

  await auditService.log({
    actorType: 'ADMIN',
    actorId: req.user?.id,
    actorIdentifier: req.user?.id,
    action: 'EMPLOYEE_UPDATED',
    targetType: 'EMPLOYEE',
    targetId: employee.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success', data: employee });
});

router.post('/:id/deactivate', async (req, res) => {
  const employee = await employeeService.deactivate(req.params.id, req.user?.id);
  if (!employee) {
    res.status(404).json({ status: 'error', message: 'Employee not found' });
    return;
  }

  await auditService.log({
    actorType: 'ADMIN',
    actorId: req.user?.id,
    actorIdentifier: req.user?.id,
    action: 'EMPLOYEE_DEACTIVATED',
    targetType: 'EMPLOYEE',
    targetId: employee.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success', data: employee });
});

router.post('/:id/reactivate', async (req, res) => {
  const employee = await employeeService.reactivate(req.params.id);
  if (!employee) {
    res.status(404).json({ status: 'error', message: 'Employee not found' });
    return;
  }

  await auditService.log({
    actorType: 'ADMIN',
    actorId: req.user?.id,
    actorIdentifier: req.user?.id,
    action: 'EMPLOYEE_REACTIVATED',
    targetType: 'EMPLOYEE',
    targetId: employee.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success', data: employee });
});

router.post('/:id/reset-pin', async (req, res) => {
  const parsed = resetPinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const employee = await employeeService.resetPin(req.params.id, parsed.data.pin);
  if (!employee) {
    res.status(404).json({ status: 'error', message: 'Employee not found' });
    return;
  }

  await auditService.log({
    actorType: 'ADMIN',
    actorId: req.user?.id,
    actorIdentifier: req.user?.id,
    action: 'PIN_RESET',
    targetType: 'EMPLOYEE',
    targetId: employee.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success', data: employee });
});

// Employee Import Routes
const importSchema = z.object({
  filename: z.string().min(1),
  csvContent: z.string().min(1)
});

router.post('/import', async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Filename and CSV content are required' });
    return;
  }

  const adminId = req.user?.id;
  if (!adminId) {
    res.status(401).json({ status: 'error', message: 'Unauthorized' });
    return;
  }

  try {
    // Parse CSV
    const rows = employeeImportService.parseCSV(parsed.data.csvContent);

    if (rows.length === 0) {
      res.status(400).json({ status: 'error', message: 'No valid data rows found in CSV' });
      return;
    }

    // Import employees
    const result = await employeeImportService.importEmployees(
      adminId,
      parsed.data.filename,
      rows
    );

    await auditService.log({
      actorType: 'ADMIN',
      actorId: adminId,
      actorIdentifier: adminId,
      action: 'EMPLOYEE_IMPORT',
      targetType: 'IMPORT',
      targetId: result.importId,
      details: {
        filename: parsed.data.filename,
        totalRows: result.totalRows,
        successfulRows: result.successfulRows,
        failedRows: result.failedRows
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.json({ status: 'success', data: result });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
});

router.get('/import/history', async (req, res) => {
  const adminId = req.user?.id;
  if (!adminId) {
    res.status(401).json({ status: 'error', message: 'Unauthorized' });
    return;
  }

  const limit = parseInt(req.query.limit as string) || 20;
  const history = await employeeImportService.getImportHistory(adminId, limit);

  res.json({ status: 'success', data: history });
});

router.get('/import/:importId', async (req, res) => {
  const details = await employeeImportService.getImportDetails(req.params.importId);

  if (!details) {
    res.status(404).json({ status: 'error', message: 'Import not found' });
    return;
  }

  res.json({ status: 'success', data: details });
});

export default router;
