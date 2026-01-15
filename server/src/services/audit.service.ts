import { pool } from '../db/connection';

type AuditParams = {
  actorType: 'EMPLOYEE' | 'ADMIN' | 'SYSTEM';
  actorId?: string;
  actorIdentifier?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export const auditService = {
  async log(params: AuditParams) {
    await pool.query(
      `INSERT INTO audit_log
       (actor_type, actor_id, actor_identifier, action, target_type, target_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.actorType,
        params.actorId ?? null,
        params.actorIdentifier ?? null,
        params.action,
        params.targetType ?? null,
        params.targetId ?? null,
        params.details ? JSON.stringify(params.details) : null,
        params.ipAddress ?? null,
        params.userAgent ?? null
      ]
    );
  }
};
