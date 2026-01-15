import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/adminAuth';
import { pool } from '../../db/connection';

const router = Router();

const auditQuerySchema = z.object({
  action: z.string().optional(),
  actorType: z.enum(['EMPLOYEE', 'ADMIN', 'SYSTEM']).optional(),
  actorId: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
  offset: z.coerce.number().min(0).optional()
});

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const parsed = auditQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Invalid query' });
    return;
  }

  const filters: string[] = [];
  const values: Array<string | number> = [];

  if (parsed.data.action) {
    values.push(parsed.data.action);
    filters.push(`action = $${values.length}`);
  }

  if (parsed.data.actorType) {
    values.push(parsed.data.actorType);
    filters.push(`actor_type = $${values.length}`);
  }

  if (parsed.data.actorId) {
    values.push(parsed.data.actorId);
    filters.push(`actor_id = $${values.length}`);
  }

  if (parsed.data.search) {
    values.push(`%${parsed.data.search}%`);
    filters.push(`(actor_identifier ILIKE $${values.length} OR action ILIKE $${values.length})`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limit = parsed.data.limit ?? 200;
  const offset = parsed.data.offset ?? 0;

  values.push(limit);
  values.push(offset);

  const result = await pool.query(
    `SELECT id, actor_type, actor_id, actor_identifier, action, target_type, target_id,
            details, ip_address, user_agent, created_at
     FROM audit_log
     ${where}
     ORDER BY created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  res.json({ status: 'success', data: result.rows });
});

export default router;
