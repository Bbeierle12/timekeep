import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requireEmployee } from '../middleware/employeeAuth';
import { attestationService } from '../services/attestation.service';
import { auditService } from '../services/audit.service';

const router = Router();

const attestationSchema = z.object({
  workDate: z.string().optional(),
  selectedOption: z.enum(['OPTION_A', 'OPTION_B']),
  optionASuboption: z.enum(['NOT_TAKEN', 'SHORTER', 'LATE']).optional(),
  comment: z.string().optional(),
  signatureImage: z.string().min(1),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  resolvedAddress: z.string().optional()
});

router.post('/', requireAuth, requireEmployee, async (req, res) => {
  const parsed = attestationSchema.safeParse(req.body);
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
    const attestation = await attestationService.sign({
      employeeId,
      workDate,
      selectedOption: parsed.data.selectedOption,
      optionASuboption: parsed.data.optionASuboption,
      comment: parsed.data.comment,
      signatureImage: signature,
      gpsLatitude: parsed.data.gpsLatitude,
      gpsLongitude: parsed.data.gpsLongitude,
      resolvedAddress: parsed.data.resolvedAddress
    });

    await auditService.log({
      actorType: 'EMPLOYEE',
      actorId: employeeId,
      actorIdentifier: req.user?.id,
      action: 'ATTESTATION_SIGNED',
      targetType: 'ATTESTATION',
      targetId: attestation.id,
      details: { attestationType: attestation.attestation_type },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.status(201).json({ status: 'success', data: attestation });
  } catch (error) {
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
});

export default router;
