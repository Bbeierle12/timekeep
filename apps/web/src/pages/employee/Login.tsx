import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { loginEmployee, toUser } from '../../services/auth';
import { routes } from '../../routes';
import { ApiError } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const loginSchema = z.object({
  initials: z.string().min(2, 'Initials must be 2-3 characters').max(3, 'Initials must be 2-3 characters'),
  pin: z.string().min(4, 'PIN must be at least 4 digits')
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await loginEmployee(data.initials.toUpperCase(), data.pin);
      const user = toUser(response.user);
      login(response.token, user, new Date(response.expiresAt));

      // Check if there's a pending certification
      if (response.pendingCertification) {
        navigate(routes.employee.pendingCertification, {
          state: { certification: response.pendingCertification }
        });
      } else {
        navigate(routes.employee.dashboard);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'INVALID_CREDENTIALS':
            setError('Invalid initials or PIN');
            break;
          case 'LOCKED':
            setError('Account is locked. Please try again later or contact your administrator.');
            break;
          case 'ACCESS_PENDING':
            setError('Your account is pending approval. Please contact your administrator.');
            break;
          case 'ACCESS_DENIED':
            setError('Your account access has been denied. Please contact your administrator.');
            break;
          case 'EMPLOYEE_INACTIVE':
            setError('Your account is inactive. Please contact your administrator.');
            break;
          default:
            setError(err.message);
        }
      } else {
        setError('Unable to connect to server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-100 tracking-tight">TIMEKEEP</h1>
          <p className="mt-2 text-slate-400">Employee Time Clock</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 rounded-xl p-8 shadow-xl border border-slate-800">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <Input
                label="Initials"
                placeholder="JD"
                maxLength={3}
                autoCapitalize="characters"
                autoComplete="off"
                autoFocus
                {...register('initials', {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }
                })}
                error={errors.initials?.message}
              />
            </div>

            <div>
              <Input
                label="PIN"
                type="password"
                placeholder="****"
                inputMode="numeric"
                autoComplete="current-password"
                {...register('pin')}
                error={errors.pin?.message}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              Forgot PIN?{' '}
              <span className="text-sky-500">Contact your administrator</span>
            </p>
          </div>
        </div>

        {/* Admin login link */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate(routes.admin.login)}
            className="text-slate-500 text-sm hover:text-slate-400 transition-colors"
          >
            Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}
