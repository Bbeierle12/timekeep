import { apiRequest } from './api';

export type Settings = {
  id: string;
  company_name: string;
  timezone: string;
  auth_method: 'pin' | 'password' | 'phone_sms' | 'initials_pin';
  pin_length: number;
  session_duration_employee: number;
  session_duration_admin: number;
  require_reauth_each_punch: boolean;
  failed_login_lockout_count: number;
  failed_login_lockout_minutes: number;
  mfa_required_admin: boolean;
  feature_clock_enabled: boolean;
  feature_lunch_enabled: boolean;
  feature_breaks_enabled: boolean;
  feature_comments_enabled: boolean;
  feature_gps_enabled: boolean;
  feature_certification_required: boolean;
  lunch_reminder_1_hours: number;
  lunch_reminder_2_hours: number;
  lunch_reminder_urgent_hours: number;
  lunch_minimum_minutes: number;
  lunch_maximum_minutes: number | null;
  allow_first_meal_waiver: boolean;
  allow_second_meal_waiver: boolean;
  auto_flag_short_lunch: boolean;
  require_comment_early_out: boolean;
  // Geofencing settings
  geofence_enabled: boolean;
  geofence_latitude: number | null;
  geofence_longitude: number | null;
  geofence_radius_meters: number;
  geofence_enforcement: 'WARN' | 'BLOCK' | 'LOG';
  // Payroll settings
  pay_period_type: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  weekly_start_day: number;
  overtime_weekly_threshold: number;
  overtime_daily_threshold: number;
  doubletime_daily_threshold: number;
  // Rest break settings
  rest_break_minimum_minutes: number;
  rest_break_interval_hours: number;
  updated_at: string;
};

export type UpdateSettingsPayload = Partial<Omit<Settings, 'id' | 'updated_at'>>;

export async function fetchSettings(): Promise<Settings> {
  return apiRequest<Settings>('/api/v1/admin/settings');
}

export async function updateSettings(
  payload: UpdateSettingsPayload
): Promise<Settings> {
  return apiRequest<Settings>('/api/v1/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}
