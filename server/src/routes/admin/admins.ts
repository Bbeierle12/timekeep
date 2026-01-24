import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin, requireAdminRole } from '../../middleware/adminAuth';
import { adminService } from '../../services/admin.service';
import { auditService } from '../../services/audit.service';

const router = Router();

const createAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['owner', 'admin', 'read_only', 'payroll', 'compliance']),
  password: z.string().min(8)
});

const updateAdminSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['owner', 'admin', 'read_only', 'payroll', 'compliance']).optional(),
  isActive: z.boolean().optional(),
  mfaEnabled: z.boolean().optional()
});

router.use(requireAuth, requireAdmin);

router.get('/', async (_req, res) => {
  const admins = await adminService.list();
  res.json({ status: 'success', data: admins });
});

router.post('/', requireAdminRole(['owner']), async (req, res) => {
  const parsed = createAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  try {
    const admin = await adminService.create(parsed.data);
    await auditService.log({
      actorType: 'ADMIN',
      actorId: req.user?.id,
      actorIdentifier: req.user?.id,
      action: 'ADMIN_CREATED',
      targetType: 'ADMIN',
      targetId: admin.id,
      details: { email: admin.email, role: admin.role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.status(201).json({ status: 'success', data: admin });
  } catch (error) {
    console.error('Failed to create admin:', error);
    res.status(400).json({ status: 'error', message: 'Unable to create admin account' });
  }
});

router.put('/:id', requireAdminRole(['owner']), async (req, res) => {
  const parsed = updateAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const admin = await adminService.update(req.params.id, parsed.data);
  if (!admin) {
    res.status(404).json({ status: 'error', message: 'Admin not found' });
    return;
  }

  await auditService.log({
    actorType: 'ADMIN',
    actorId: req.user?.id,
    actorIdentifier: req.user?.id,
    action: 'ADMIN_UPDATED',
    targetType: 'ADMIN',
    targetId: admin.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success', data: admin });
});

router.delete('/:id', requireAdminRole(['owner']), async (req, res) => {
  try {
    const result = await adminService.delete(req.params.id);
    if (!result) {
      res.status(404).json({ status: 'error', message: 'Admin not found' });
      return;
    }

    await auditService.log({
      actorType: 'ADMIN',
      actorId: req.user?.id,
      actorIdentifier: req.user?.id,
      action: 'ADMIN_DELETED',
      targetType: 'ADMIN',
      targetId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('Failed to delete admin:', error);
    res.status(400).json({ status: 'error', message: 'Unable to delete admin account' });
  }
});

export default router;
