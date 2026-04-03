import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/adminAuth';
import { complianceService } from '../../services/compliance.service';

const router = Router();

const listSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).optional()
});

router.use(requireAuth, requireAdmin);

router.get('/dashboard', async (req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined;
  const dashboard = await complianceService.getDashboard(date);
  res.json({ status: 'success', data: dashboard });
});

router.get('/violations', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid query' });
    return;
  }

  const violations = await complianceService.listViolations(parsed.data);
  res.json({ status: 'success', data: violations });
});

router.get('/waivers', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid query' });
    return;
  }

  const waivers = await complianceService.listWaivers(parsed.data);
  res.json({ status: 'success', data: waivers });
});

router.get('/attestations', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid query' });
    return;
  }

  const attestations = await complianceService.listAttestations(parsed.data);
  res.json({ status: 'success', data: attestations });
});

router.get('/alerts', async (req, res) => {
  // When no date provided, let getDashboard compute it using company timezone
  const date = req.query.date ? String(req.query.date) : undefined;
  const settings = await complianceService.getDashboard(date);
  res.json({ status: 'success', data: settings.activeAlerts });
});

export default router;
