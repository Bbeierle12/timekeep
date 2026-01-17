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

async function getEmployeeInitials(employeeId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT initials FROM employees WHERE id = $1',
    [employeeId]
  );
  return result.rows[0]?.initials ?? null;
}

async function getAdminEmail(adminId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT email FROM admins WHERE id = $1',
    [adminId]
  );
  return result.rows[0]?.email ?? null;
}

export const auditService = {
  async log(params: AuditParams) {
    // Resolve actor identifier to human-readable value if not provided
    let actorIdentifier = params.actorIdentifier;

    if (!actorIdentifier && params.actorId) {
      if (params.actorType === 'EMPLOYEE') {
        actorIdentifier = await getEmployeeInitials(params.actorId) ?? params.actorId;
      } else if (params.actorType === 'ADMIN') {
        actorIdentifier = await getAdminEmail(params.actorId) ?? params.actorId;
      }
    }

    await pool.query(
      `INSERT INTO audit_log
       (actor_type, actor_id, actor_identifier, action, target_type, target_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.actorType,
        params.actorId ?? null,
        actorIdentifier ?? null,
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
