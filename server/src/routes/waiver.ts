import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requireEmployee } from '../middleware/employeeAuth';
import { waiverService } from '../services/waiver.service';
import { auditService } from '../services/audit.service';

const router = Router();

const waiverSchema = z.object({
  workDate: z.string().optional(),
  waiverType: z.enum(['FIRST_MEAL_WAIVER', 'SECOND_MEAL_WAIVER']),
  checkboxChecked: z.boolean(),
  signatureImage: z.string().min(1),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  resolvedAddress: z.string().optional()
});

router.post('/', requireAuth, requireEmployee, async (req, res) => {
  const parsed = waiverSchema.safeParse(req.body);
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
  const signature = parsed.data.signatureImage
    ? Buffer.from(parsed.data.signatureImage, 'base64')
    : null;

  try {
    const waiver = await waiverService.sign({
      employeeId,
      workDate,
      waiverType: parsed.data.waiverType,
      checkboxChecked: parsed.data.checkboxChecked,
      signatureImage: signature,
      gpsLatitude: parsed.data.gpsLatitude,
      gpsLongitude: parsed.data.gpsLongitude,
      resolvedAddress: parsed.data.resolvedAddress
    });

    await auditService.log({
      actorType: 'EMPLOYEE',
      actorId: employeeId,
      actorIdentifier: req.user?.id,
      action: 'WAIVER_SIGNED',
      targetType: 'WAIVER',
      targetId: waiver.id,
      details: { waiverType: waiver.waiver_type },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.status(201).json({ status: 'success', data: waiver });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
});

export default router;
