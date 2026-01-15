import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/adminAuth';
import { getSettingsRow, updateSettings } from '../../services/settings.service';
import { auditService } from '../../services/audit.service';

const router = Router();

const settingsSchema = z.object({
  company_name: z.string().min(2).optional(),
  timezone: z.string().optional(),
  auth_method: z.enum(['pin', 'password', 'phone_sms', 'initials_pin']).optional(),
  pin_length: z.number().min(4).max(6).optional(),
  session_duration_employee: z.number().min(3600).optional(),
  session_duration_admin: z.number().min(3600).optional(),
  require_reauth_each_punch: z.boolean().optional(),
  failed_login_lockout_count: z.number().min(1).max(10).optional(),
  failed_login_lockout_minutes: z.number().min(1).max(60).optional(),
  mfa_required_admin: z.boolean().optional(),
  feature_clock_enabled: z.boolean().optional(),
  feature_lunch_enabled: z.boolean().optional(),
  feature_breaks_enabled: z.boolean().optional(),
  feature_comments_enabled: z.boolean().optional(),
  feature_gps_enabled: z.boolean().optional(),
  feature_certification_required: z.boolean().optional(),
  lunch_reminder_1_hours: z.number().min(1).max(5).optional(),
  lunch_reminder_2_hours: z.number().min(1).max(5).optional(),
  lunch_reminder_urgent_hours: z.number().min(1).max(5).optional(),
  lunch_minimum_minutes: z.number().min(10).max(60).optional(),
  lunch_maximum_minutes: z.number().min(10).max(180).optional().nullable(),
  allow_first_meal_waiver: z.boolean().optional(),
  allow_second_meal_waiver: z.boolean().optional(),
  auto_flag_short_lunch: z.boolean().optional(),
  require_comment_early_out: z.boolean().optional()
});

router.use(requireAuth, requireAdmin);

router.get('/', async (_req, res) => {
  const settings = await getSettingsRow();
  res.json({ status: 'success', data: settings });
});

router.put('/', async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid payload' });
    return;
  }

  const settings = await updateSettings(parsed.data);

  await auditService.log({
    actorType: 'ADMIN',
    actorId: req.user?.id,
    actorIdentifier: req.user?.id,
    action: 'SETTINGS_CHANGED',
    targetType: 'SETTINGS',
    details: { fields: Object.keys(parsed.data) },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  });

  res.json({ status: 'success', data: settings });
});

export default router;
