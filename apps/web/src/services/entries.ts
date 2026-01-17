import { apiRequest } from './api';

export type TimeEntry = {
  id: string;
  employee_id: string;
  employee_name?: string;
  work_date: string;
  entry_type: 'CLOCK_IN' | 'CLOCK_OUT' | 'LUNCH_START' | 'LUNCH_END' | 'BREAK_START' | 'BREAK_END';
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  comment: string | null;
  created_at: string;
  is_corrected: boolean;
  corrected_from: string | null;
};

export type DailySummary = {
  date: string;
  totalEntries: number;
  clockedIn: number;
  onLunch: number;
  onBreak: number;
  clockedOut: number;
  entries: TimeEntry[];
};

export type Correction = {
  id: string;
  entry_id: string;
  requested_by_employee_id: string | null;
  requested_by_admin_id: string | null;
  requester_name?: string;
  original_timestamp: string;
  requested_timestamp: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  approved_by: string | null;
  approved_at: string | null;
  applied_by: string | null;
  applied_at: string | null;
  created_at: string;
  entry?: TimeEntry;
};

export type ListEntriesParams = {
  date?: string;
  start?: string;
  end?: string;
  employeeId?: string;
  limit?: number;
  offset?: number;
};

export async function fetchEntries(
  params: ListEntriesParams,
  token: string
): Promise<TimeEntry[]> {
  const searchParams = new URLSearchParams();
  if (params.date) searchParams.set('date', params.date);
  if (params.start) searchParams.set('start', params.start);
  if (params.end) searchParams.set('end', params.end);
  if (params.employeeId) searchParams.set('employeeId', params.employeeId);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  const url = `/api/admin/entries${query ? `?${query}` : ''}`;

  return apiRequest<TimeEntry[]>(url, { token });
}

export async function fetchDailyEntries(
  date: string,
  token: string
): Promise<DailySummary> {
  return apiRequest<DailySummary>(`/api/admin/entries/daily/${date}`, { token });
}

export async function fetchEmployeeEntries(
  employeeId: string,
  token: string
): Promise<TimeEntry[]> {
  return apiRequest<TimeEntry[]>(`/api/admin/entries/employee/${employeeId}`, { token });
}

export async function fetchCorrections(
  params: { status?: string; limit?: number },
  token: string
): Promise<Correction[]> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const url = `/api/admin/entries/corrections${query ? `?${query}` : ''}`;

  return apiRequest<Correction[]>(url, { token });
}

export type RequestCorrectionPayload = {
  requestedTimestamp: string;
  reason: string;
};

export async function requestCorrection(
  entryId: string,
  payload: RequestCorrectionPayload,
  token: string
): Promise<Correction> {
  return apiRequest<Correction>(`/api/admin/entries/${entryId}/corrections`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token
  });
}

export async function approveCorrection(
  correctionId: string,
  token: string
): Promise<Correction> {
  return apiRequest<Correction>(`/api/admin/entries/corrections/${correctionId}/approve`, {
    method: 'POST',
    token
  });
}

export async function rejectCorrection(
  correctionId: string,
  reason: string,
  token: string
): Promise<Correction> {
  return apiRequest<Correction>(`/api/admin/entries/corrections/${correctionId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
    token
  });
}

export async function applyCorrection(
  correctionId: string,
  token: string
): Promise<Correction> {
  return apiRequest<Correction>(`/api/admin/entries/corrections/${correctionId}/apply`, {
    method: 'POST',
    token
  });
}

// Direct entry edit functions
export type UpdateEntryPayload = {
  recordedAt?: string;
  comment?: string | null;
  reason: string;
};

export type CreateEntryPayload = {
  employeeId: string;
  workDate: string;
  actionType: string;
  recordedAt: string;
  comment?: string;
  reason: string;
};

export async function updateEntry(
  entryId: string,
  payload: UpdateEntryPayload,
  token: string
): Promise<TimeEntry> {
  return apiRequest<TimeEntry>(`/api/admin/entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token
  });
}

export async function createEntry(
  payload: CreateEntryPayload,
  token: string
): Promise<TimeEntry> {
  return apiRequest<TimeEntry>('/api/admin/entries', {
    method: 'POST',
    body: JSON.stringify(payload),
    token
  });
}
