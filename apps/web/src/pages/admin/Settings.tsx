import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AdminLayout from '../../components/admin/AdminLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { fetchSettings, updateSettings, Settings } from '../../services/settings';

type SettingsTab = 'general' | 'auth' | 'features' | 'meals' | 'geofence' | 'payroll';

const settingsSchema = z.object({
  // General
  company_name: z.string().min(1, 'Company name is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  // Auth
  auth_method: z.enum(['pin', 'password', 'phone_sms', 'initials_pin']),
  pin_length: z.number().min(4).max(8),
  session_duration_employee: z.number().min(1),
  session_duration_admin: z.number().min(1),
  require_reauth_each_punch: z.boolean(),
  failed_login_lockout_count: z.number().min(1),
  failed_login_lockout_minutes: z.number().min(1),
  mfa_required_admin: z.boolean(),
  // Features
  feature_clock_enabled: z.boolean(),
  feature_lunch_enabled: z.boolean(),
  feature_breaks_enabled: z.boolean(),
  feature_comments_enabled: z.boolean(),
  feature_gps_enabled: z.boolean(),
  feature_certification_required: z.boolean(),
  // Meals
  lunch_reminder_1_hours: z.number().min(0),
  lunch_reminder_2_hours: z.number().min(0),
  lunch_reminder_urgent_hours: z.number().min(0),
  lunch_minimum_minutes: z.number().min(0),
  lunch_maximum_minutes: z.number().nullable(),
  allow_first_meal_waiver: z.boolean(),
  allow_second_meal_waiver: z.boolean(),
  auto_flag_short_lunch: z.boolean(),
  require_comment_early_out: z.boolean(),
  rest_break_minimum_minutes: z.number().min(0),
  rest_break_interval_hours: z.number().min(0),
  // Geofence
  geofence_enabled: z.boolean(),
  geofence_latitude: z.number().nullable(),
  geofence_longitude: z.number().nullable(),
  geofence_radius_meters: z.number().min(10),
  geofence_enforcement: z.enum(['WARN', 'BLOCK', 'LOG']),
  // Payroll
  pay_period_type: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']),
  weekly_start_day: z.number().min(0).max(6),
  overtime_weekly_threshold: z.number().min(0),
  overtime_daily_threshold: z.number().min(0),
  doubletime_daily_threshold: z.number().min(0)
});

type SettingsForm = z.infer<typeof settingsSchema>;

const tabs: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'auth', label: 'Authentication' },
  { id: 'features', label: 'Features' },
  { id: 'meals', label: 'Meals & Breaks' },
  { id: 'geofence', label: 'Geofencing' },
  { id: 'payroll', label: 'Payroll' }
];

export default function AdminSettings() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetchSettings(token!),
    enabled: !!token
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema)
  });

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SettingsForm>) => updateSettings(data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });

  const onSubmit = (data: SettingsForm) => {
    updateMutation.mutate(data);
  };

  const geofenceEnabled = watch('geofence_enabled');

  if (isLoading) {
    return (
      <AdminLayout title="Settings" subtitle="Configure system settings">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings" subtitle="Configure system settings">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-slate-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* General Settings */}
        {activeTab === 'general' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">General Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Company Name
                </label>
                <Input {...register('company_name')} />
                {errors.company_name && (
                  <p className="text-red-400 text-xs mt-1">{errors.company_name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Timezone
                </label>
                <select
                  {...register('timezone')}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* Authentication Settings */}
        {activeTab === 'auth' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Authentication</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Authentication Method
                </label>
                <select
                  {...register('auth_method')}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="initials_pin">Initials + PIN</option>
                  <option value="pin">PIN Only</option>
                  <option value="password">Password</option>
                  <option value="phone_sms">Phone SMS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  PIN Length
                </label>
                <Input
                  {...register('pin_length', { valueAsNumber: true })}
                  type="number"
                  min={4}
                  max={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Employee Session Duration (hours)
                </label>
                <Input
                  {...register('session_duration_employee', { valueAsNumber: true })}
                  type="number"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Admin Session Duration (hours)
                </label>
                <Input
                  {...register('session_duration_admin', { valueAsNumber: true })}
                  type="number"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Failed Login Lockout Count
                </label>
                <Input
                  {...register('failed_login_lockout_count', { valueAsNumber: true })}
                  type="number"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Lockout Duration (minutes)
                </label>
                <Input
                  {...register('failed_login_lockout_minutes', { valueAsNumber: true })}
                  type="number"
                  min={1}
                />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('require_reauth_each_punch')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Require re-authentication for each punch</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('mfa_required_admin')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Require MFA for admin accounts</span>
              </label>
            </div>
          </Card>
        )}

        {/* Features */}
        {activeTab === 'features' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('feature_clock_enabled')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Clock In/Out</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('feature_lunch_enabled')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Lunch Tracking</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('feature_breaks_enabled')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Break Tracking</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('feature_comments_enabled')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Entry Comments</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('feature_gps_enabled')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">GPS Location Tracking</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('feature_certification_required')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Daily Certification Required</span>
              </label>
            </div>
          </Card>
        )}

        {/* Meal/Break Settings */}
        {activeTab === 'meals' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Meal & Break Rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  First Reminder (hours)
                </label>
                <Input
                  {...register('lunch_reminder_1_hours', { valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Second Reminder (hours)
                </label>
                <Input
                  {...register('lunch_reminder_2_hours', { valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Urgent Reminder (hours)
                </label>
                <Input
                  {...register('lunch_reminder_urgent_hours', { valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Minimum Lunch (minutes)
                </label>
                <Input
                  {...register('lunch_minimum_minutes', { valueAsNumber: true })}
                  type="number"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Maximum Lunch (minutes)
                </label>
                <Input
                  {...register('lunch_maximum_minutes', { valueAsNumber: true })}
                  type="number"
                  min={0}
                  placeholder="No limit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Rest Break Minimum (minutes)
                </label>
                <Input
                  {...register('rest_break_minimum_minutes', { valueAsNumber: true })}
                  type="number"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Rest Break Interval (hours)
                </label>
                <Input
                  {...register('rest_break_interval_hours', { valueAsNumber: true })}
                  type="number"
                  min={0}
                />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('allow_first_meal_waiver')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Allow first meal waiver (shifts 6+ hours)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('allow_second_meal_waiver')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Allow second meal waiver (shifts 10+ hours)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('auto_flag_short_lunch')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Auto-flag short lunches as violations</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('require_comment_early_out')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Require comment for early clock out</span>
              </label>
            </div>
          </Card>
        )}

        {/* Geofencing Settings */}
        {activeTab === 'geofence' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Geofencing</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                <div>
                  <h3 className="font-medium text-slate-100">Enable Geofencing</h3>
                  <p className="text-sm text-slate-400">
                    Require employees to be at approved location when clocking in/out
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('geofence_enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              {geofenceEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Latitude
                      </label>
                      <Input
                        {...register('geofence_latitude', { valueAsNumber: true })}
                        type="number"
                        step="any"
                        placeholder="37.7749"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Longitude
                      </label>
                      <Input
                        {...register('geofence_longitude', { valueAsNumber: true })}
                        type="number"
                        step="any"
                        placeholder="-122.4194"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Radius (meters)
                      </label>
                      <Input
                        {...register('geofence_radius_meters', { valueAsNumber: true })}
                        type="number"
                        min={10}
                        max={10000}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Enforcement Mode
                      </label>
                      <select
                        {...register('geofence_enforcement')}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="LOG">Log Only - Record but allow all punches</option>
                        <option value="WARN">Warn - Show warning but allow punches</option>
                        <option value="BLOCK">Block - Prevent punches outside area</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Tip: You can find coordinates by right-clicking on Google Maps and selecting the coordinates.
                  </p>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Payroll Settings */}
        {activeTab === 'payroll' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Payroll Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Pay Period Type
                </label>
                <select
                  {...register('pay_period_type')}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="semimonthly">Semi-monthly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Week Start Day
                </label>
                <select
                  {...register('weekly_start_day', { valueAsNumber: true })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Weekly Overtime Threshold (hours)
                </label>
                <Input
                  {...register('overtime_weekly_threshold', { valueAsNumber: true })}
                  type="number"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Daily Overtime Threshold (hours)
                </label>
                <Input
                  {...register('overtime_daily_threshold', { valueAsNumber: true })}
                  type="number"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Daily Double-time Threshold (hours)
                </label>
                <Input
                  {...register('doubletime_daily_threshold', { valueAsNumber: true })}
                  type="number"
                  min={0}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          {updateMutation.isError && (
            <p className="text-red-400 text-sm self-center">Failed to save settings.</p>
          )}
          {updateMutation.isSuccess && (
            <p className="text-green-400 text-sm self-center">Settings saved successfully.</p>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => reset(settings)}
            disabled={!isDirty}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}
