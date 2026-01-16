import { useEffect } from 'react';
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

const settingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  auth_method: z.enum(['pin', 'password', 'phone_sms', 'initials_pin']),
  pin_length: z.number().min(4).max(8),
  session_duration_employee: z.number().min(1),
  session_duration_admin: z.number().min(1),
  require_reauth_each_punch: z.boolean(),
  failed_login_lockout_count: z.number().min(1),
  failed_login_lockout_minutes: z.number().min(1),
  mfa_required_admin: z.boolean(),
  feature_clock_enabled: z.boolean(),
  feature_lunch_enabled: z.boolean(),
  feature_breaks_enabled: z.boolean(),
  feature_comments_enabled: z.boolean(),
  feature_gps_enabled: z.boolean(),
  feature_certification_required: z.boolean(),
  lunch_reminder_1_hours: z.number().min(0),
  lunch_reminder_2_hours: z.number().min(0),
  lunch_reminder_urgent_hours: z.number().min(0),
  lunch_minimum_minutes: z.number().min(0),
  lunch_maximum_minutes: z.number().nullable(),
  allow_first_meal_waiver: z.boolean(),
  allow_second_meal_waiver: z.boolean(),
  auto_flag_short_lunch: z.boolean(),
  require_comment_early_out: z.boolean()
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function AdminSettings() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetchSettings(token!),
    enabled: !!token
  });

  const {
    register,
    handleSubmit,
    reset,
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
        {/* General Settings */}
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

        {/* Authentication Settings */}
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

        {/* Features */}
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

        {/* Meal/Break Settings */}
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
