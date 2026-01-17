import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { requestPasswordReset } from '../../services/auth';
import { routes } from '../../routes';
import { ApiError } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email')
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset(data.email);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
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
          <p className="mt-2 text-slate-400">Password Reset</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 rounded-xl p-8 shadow-xl border border-slate-800">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-100 mb-2">Check Your Email</h2>
              <p className="text-slate-400 mb-6">
                If an account exists with that email address, we've sent instructions to reset your password.
              </p>
              <Link
                to={routes.admin.login}
                className="text-sky-400 hover:text-sky-300 transition-colors"
              >
                Return to login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-slate-400 text-sm mb-6">
                Enter your email address and we'll send you instructions to reset your password.
              </p>

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

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Back to login link */}
        {!success && (
          <div className="mt-6 text-center">
            <Link
              to={routes.admin.login}
              className="text-slate-500 text-sm hover:text-slate-400 transition-colors"
            >
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
