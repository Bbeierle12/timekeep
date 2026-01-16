import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchPendingCertification, type PendingCertification } from '../../services/certification';
import CertificationForm from '../../components/employee/CertificationForm';
import { routes } from '../../routes';

export default function PendingCertificationPage() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [certification, setCertification] = useState<PendingCertification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPendingCertification() {
      if (!token) return;

      try {
        const pending = await fetchPendingCertification(token);
        if (!pending) {
          // No pending certification, redirect to dashboard
          navigate(routes.employee.dashboard, { replace: true });
          return;
        }
        setCertification(pending);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load certification');
      } finally {
        setIsLoading(false);
      }
    }

    loadPendingCertification();
  }, [token, navigate]);

  const handleSuccess = () => {
    // After successful certification, go to dashboard
    navigate(routes.employee.dashboard, { replace: true });
  };

  const handleLogout = async () => {
    await logout();
    navigate(routes.employee.login);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6">
            <p className="text-red-200">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm text-slate-400 hover:text-slate-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!certification) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">TIMEKEEP</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Blocking Notice */}
        <div className="bg-amber-900/30 border border-amber-500/50 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-amber-200">Certification Required</p>
              <p className="text-amber-300 text-sm mt-1">
                You must certify your previous work day before continuing.
              </p>
            </div>
          </div>
        </div>

        {/* Certification Form */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <CertificationForm
            certification={certification}
            onSuccess={handleSuccess}
          />
        </div>
      </main>
    </div>
  );
}
