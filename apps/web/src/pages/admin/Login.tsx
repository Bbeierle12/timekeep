import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { loginAdmin, verifyMfa, isMfaChallenge, toUser } from '../../services/auth';
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
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

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

      if (isMfaChallenge(response)) {
        setMfaChallengeToken(response.mfaChallengeToken);
        setIsSubmitting(false);
        return;
      }

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
          case 'MFA_SETUP_REQUIRED':
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

  const onMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaChallengeToken || !mfaCode.trim()) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await verifyMfa({
        challengeToken: mfaChallengeToken,
        ...(useRecoveryCode
          ? { recoveryCode: mfaCode.trim() }
          : { totpCode: mfaCode.trim() })
      });

      const user = toUser(response.user);
      login(user);
      navigate(routes.admin.dashboard);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'INVALID_MFA_CODE':
            setError('Invalid code. Please try again.');
            break;
          case 'CHALLENGE_EXPIRED':
            setError('MFA challenge expired. Please log in again.');
            setMfaChallengeToken(null);
            setMfaCode('');
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

  // MFA verification screen
  if (mfaChallengeToken) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-100 tracking-tight">TIMEKEEP</h1>
            <p className="mt-2 text-slate-400">Two-Factor Authentication</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-8 shadow-xl border border-slate-800">
            <form onSubmit={onMfaSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <p className="text-slate-300 text-sm">
                {useRecoveryCode
                  ? 'Enter one of your recovery codes.'
                  : 'Enter the 6-digit code from your authenticator app.'}
              </p>

              <div>
                <Input
                  label={useRecoveryCode ? 'Recovery Code' : 'Authentication Code'}
                  type="text"
                  placeholder={useRecoveryCode ? 'XXXXX-XXXXX' : '000000'}
                  autoComplete="one-time-code"
                  autoFocus
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  inputMode={useRecoveryCode ? 'text' : 'numeric'}
                  maxLength={useRecoveryCode ? 11 : 6}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isSubmitting || !mfaCode.trim()}
              >
                {isSubmitting ? 'Verifying...' : 'Verify'}
              </Button>

              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode);
                    setMfaCode('');
                    setError(null);
                  }}
                  className="text-slate-500 hover:text-slate-400 transition-colors"
                >
                  {useRecoveryCode ? 'Use authenticator app' : 'Use recovery code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMfaChallengeToken(null);
                    setMfaCode('');
                    setError(null);
                  }}
                  className="text-slate-500 hover:text-slate-400 transition-colors"
                >
                  Back to login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

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
