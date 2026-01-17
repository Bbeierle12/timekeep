import { apiRequest } from './api';

export type ActionType =
  | 'CLOCK_IN'
  | 'CLOCK_OUT'
  | 'LUNCH_START'
  | 'LUNCH_END'
  | 'BREAK_ACK_1'
  | 'BREAK_ACK_2'
  | 'BREAK_ACK_3'
  | 'BREAK_SKIP_1'
  | 'BREAK_SKIP_2'
  | 'BREAK_SKIP_3';

export type TimeEntry = {
  id: string;
  work_date: string;
  action_type: ActionType;
  recorded_at: string;
  comment: string | null;
  resolved_address: string | null;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
};

export type DailySummary = {
  id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  lunch_start_at: string | null;
  lunch_end_at: string | null;
  lunch_duration_minutes: number | null;
  lunch_compliant: boolean | null;
  breaks_required: number;
  breaks_taken: number;
  total_shift_minutes: number | null;
  worked_minutes: number | null;
  overtime_minutes: number;
  is_certified: boolean;
  has_violation: boolean;
  violation_type: string | null;
};

export type TodayResponse = {
  entries: TimeEntry[];
  summary: DailySummary | null;
  reminders: {
    type: string;
    message: string;
    urgent: boolean;
  }[];
  settings: {
    feature_clock_enabled: boolean;
    feature_lunch_enabled: boolean;
    feature_breaks_enabled: boolean;
    feature_comments_enabled: boolean;
    feature_gps_enabled: boolean;
    lunch_minimum_minutes: number;
  };
};

export type PunchInput = {
  actionType: ActionType;
  recordedAt?: string;
  comment?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracyMeters?: number;
  resolvedAddress?: string;
  gpsUnavailable?: boolean;
};

export async function fetchToday(token: string): Promise<TodayResponse> {
  return apiRequest<TodayResponse>('/api/today', { token });
}

export async function recordPunch(punch: PunchInput, token: string): Promise<TimeEntry> {
  return apiRequest<TimeEntry>('/api/punch', {
    method: 'POST',
    body: JSON.stringify(punch),
    token
  });
}

export async function fetchHistory(token: string, limit = 100): Promise<TimeEntry[]> {
  return apiRequest<TimeEntry[]>(`/api/history?limit=${limit}`, { token });
}

// Admin time entry functions
export type AdminTimeEntry = TimeEntry & {
  employee_id: string;
  initials: string;
  full_name: string;
  original_recorded_at?: string | null;
  original_comment?: string | null;
  corrected_at?: string | null;
  corrected_by?: string | null;
  correction_reason?: string | null;
  is_manual_entry?: boolean;
};

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

export async function fetchAdminEntries(token: string, limit = 200): Promise<AdminTimeEntry[]> {
  return apiRequest<AdminTimeEntry[]>(`/api/admin/entries?limit=${limit}`, { token });
}

export async function fetchEntriesForDate(date: string, token: string): Promise<AdminTimeEntry[]> {
  return apiRequest<AdminTimeEntry[]>(`/api/admin/entries/daily/${date}`, { token });
}

export async function fetchEntriesForEmployee(
  employeeId: string,
  token: string,
  date?: string
): Promise<AdminTimeEntry[]> {
  const query = date ? `?date=${date}` : '';
  return apiRequest<AdminTimeEntry[]>(`/api/admin/entries/employee/${employeeId}${query}`, {
    token
  });
}

export async function updateTimeEntry(
  id: string,
  payload: UpdateEntryPayload,
  token: string
): Promise<AdminTimeEntry> {
  return apiRequest<AdminTimeEntry>(`/api/admin/entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token
  });
}

export async function createTimeEntry(
  payload: CreateEntryPayload,
  token: string
): Promise<AdminTimeEntry> {
  return apiRequest<AdminTimeEntry>('/api/admin/entries', {
    method: 'POST',
    body: JSON.stringify(payload),
    token
  });
}
