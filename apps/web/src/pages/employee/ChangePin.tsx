import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, ApiError } from '../../services/api';
import { routes } from '../../routes';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const changePinSchema = z.object({
  currentPin: z.string().min(4, 'PIN must be at least 4 digits'),
  newPin: z.string().min(4, 'PIN must be at least 4 digits'),
  confirmPin: z.string().min(4, 'PIN must be at least 4 digits')
}).refine((data) => data.newPin === data.confirmPin, {
  message: "PINs don't match",
  path: ['confirmPin']
});

type ChangePinFormData = z.infer<typeof changePinSchema>;

async function changePin(currentPin: string, newPin: string): Promise<void> {
  await apiRequest<{ status: string }>('/api/v1/auth/employee/change-pin', {
    method: 'POST',
    body: JSON.stringify({ currentPin, newPin })
  });
}

export default function ChangePin() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ChangePinFormData>({
    resolver: zodResolver(changePinSchema)
  });

  const onSubmit = async (data: ChangePinFormData) => {
    if (!isAuthenticated) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await changePin(data.currentPin, data.newPin);
      setSuccess(true);
      reset();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message.includes('Invalid current PIN')) {
          setError('Current PIN is incorrect');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to change PIN. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(routes.employee.dashboard)}
            className="text-slate-400 hover:text-slate-200"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-slate-100">Change PIN</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-100 mb-2">PIN Changed</h2>
              <p className="text-slate-400 mb-6">
                Your PIN has been successfully updated.
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(routes.employee.dashboard)}
              >
                Back to Dashboard
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="text-center mb-6">
                <svg className="w-12 h-12 text-sky-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-slate-400 text-sm">
                  Enter your current PIN and choose a new PIN
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Current PIN"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter current PIN"
                autoComplete="current-password"
                {...register('currentPin')}
                error={errors.currentPin?.message}
              />

              <Input
                label="New PIN"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter new PIN"
                autoComplete="new-password"
                {...register('newPin')}
                error={errors.newPin?.message}
              />

              <Input
                label="Confirm New PIN"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Confirm new PIN"
                autoComplete="new-password"
                {...register('confirmPin')}
                error={errors.confirmPin?.message}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => navigate(routes.employee.dashboard)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Changing...' : 'Change PIN'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
