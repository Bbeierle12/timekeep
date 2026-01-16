import { apiRequest } from './api';

export type ComplianceDashboard = {
  date: string;
  totalEmployees: number;
  clockedInCount: number;
  onLunchCount: number;
  clockedOutCount: number;
  pendingCertifications: number;
  violationsToday: number;
  waiversToday: number;
  attestationsToday: number;
  activeAlerts: ComplianceAlert[];
};

export type ComplianceAlert = {
  id: string;
  type: 'APPROACHING_LUNCH_DEADLINE' | 'LONG_SHIFT' | 'MISSING_BREAK' | 'PENDING_CERTIFICATION';
  severity: 'low' | 'medium' | 'high';
  employeeId: string;
  employeeName: string;
  message: string;
  createdAt: string;
};

export type Violation = {
  id: string;
  employee_id: string;
  employee_name?: string;
  work_date: string;
  violation_type: string;
  description: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

export type WaiverRecord = {
  id: string;
  employee_id: string;
  employee_name?: string;
  work_date: string;
  waiver_type: string;
  checkbox_checked: boolean;
  signed_at: string;
  created_at: string;
};

export type AttestationRecord = {
  id: string;
  employee_id: string;
  employee_name?: string;
  work_date: string;
  attestation_type: string;
  selected_option: string;
  option_a_suboption: string | null;
  comment: string | null;
  signed_at: string;
  created_at: string;
};

export type ListParams = {
  start?: string;
  end?: string;
  limit?: number;
};

export async function fetchComplianceDashboard(
  date: string | undefined,
  token: string
): Promise<ComplianceDashboard> {
  const url = date
    ? `/api/admin/compliance/dashboard?date=${date}`
    : '/api/admin/compliance/dashboard';
  return apiRequest<ComplianceDashboard>(url, { token });
}

export async function fetchViolations(
  params: ListParams,
  token: string
): Promise<Violation[]> {
  const searchParams = new URLSearchParams();
  if (params.start) searchParams.set('start', params.start);
  if (params.end) searchParams.set('end', params.end);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const url = `/api/admin/compliance/violations${query ? `?${query}` : ''}`;

  return apiRequest<Violation[]>(url, { token });
}

export async function fetchWaivers(
  params: ListParams,
  token: string
): Promise<WaiverRecord[]> {
  const searchParams = new URLSearchParams();
  if (params.start) searchParams.set('start', params.start);
  if (params.end) searchParams.set('end', params.end);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const url = `/api/admin/compliance/waivers${query ? `?${query}` : ''}`;

  return apiRequest<WaiverRecord[]>(url, { token });
}

export async function fetchAttestations(
  params: ListParams,
  token: string
): Promise<AttestationRecord[]> {
  const searchParams = new URLSearchParams();
  if (params.start) searchParams.set('start', params.start);
  if (params.end) searchParams.set('end', params.end);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const url = `/api/admin/compliance/attestations${query ? `?${query}` : ''}`;

  return apiRequest<AttestationRecord[]>(url, { token });
}

export async function fetchAlerts(
  date: string | undefined,
  token: string
): Promise<ComplianceAlert[]> {
  const url = date
    ? `/api/admin/compliance/alerts?date=${date}`
    : '/api/admin/compliance/alerts';
  return apiRequest<ComplianceAlert[]>(url, { token });
}
