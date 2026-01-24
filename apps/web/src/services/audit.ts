import { apiRequest } from './api';

export type AuditEntry = {
  id: string;
  actor_type: 'EMPLOYEE' | 'ADMIN' | 'SYSTEM';
  actor_id: string | null;
  actor_identifier: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type AuditQueryParams = {
  action?: string;
  actorType?: 'EMPLOYEE' | 'ADMIN' | 'SYSTEM';
  actorId?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function fetchAuditLog(
  params: AuditQueryParams
): Promise<AuditEntry[]> {
  const searchParams = new URLSearchParams();
  if (params.action) searchParams.set('action', params.action);
  if (params.actorType) searchParams.set('actorType', params.actorType);
  if (params.actorId) searchParams.set('actorId', params.actorId);
  if (params.search) searchParams.set('search', params.search);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  const url = `/api/v1/admin/audit-log${query ? `?${query}` : ''}`;

  return apiRequest<AuditEntry[]>(url);
}
