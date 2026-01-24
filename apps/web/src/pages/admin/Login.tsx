import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { loginAdmin, toUser } from '../../services/auth';
import { routes } from '../../routes';
import { ApiError } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required')
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLogin() {
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
      const response = await loginAdmin(data.email, data.password);
      const user = toUser(response.user);
      login(user);
      navigate(routes.admin.dashboard);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'INVALID_CREDENTIALS':
            setError('Invalid email or password');
            break;
          case 'LOCKED':
            setError('Account is locked. Please try again later.');
            break;
          case 'MFA_REQUIRED':
            setError('MFA enrollment required. Please contact your administrator.');
            break;
          case 'ADMIN_INACTIVE':
            setError('Your account is inactive.');
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
          <p className="mt-2 text-slate-400">Admin Portal</p>
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
                label="Email"
                type="email"
                placeholder="admin@company.com"
                autoComplete="email"
                autoFocus
                {...register('email')}
                error={errors.email?.message}
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="********"
                autoComplete="current-password"
                {...register('password')}
                error={errors.password?.message}
              />
              <div className="mt-2 text-right">
                <Link
                  to={routes.admin.forgotPassword}
                  className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
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
        </div>

        {/* Employee login link */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate(routes.employee.login)}
            className="text-slate-500 text-sm hover:text-slate-400 transition-colors"
          >
            Employee Login
          </button>
        </div>
      </div>
    </div>
  );
}
