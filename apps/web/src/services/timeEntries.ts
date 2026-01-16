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
