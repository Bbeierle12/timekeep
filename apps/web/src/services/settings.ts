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
  updated_at: string;
};

export type UpdateSettingsPayload = Partial<Omit<Settings, 'id' | 'updated_at'>>;

export async function fetchSettings(token: string): Promise<Settings> {
  const response = await apiRequest<{ status: string; data: Settings }>(
    '/api/admin/settings',
    { token }
  );
  return response.data;
}

export async function updateSettings(
  payload: UpdateSettingsPayload,
  token: string
): Promise<Settings> {
  const response = await apiRequest<{ status: string; data: Settings }>(
    '/api/admin/settings',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
      token
    }
  );
  return response.data;
}
