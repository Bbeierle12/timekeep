import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import { routes } from './routes';

// Lazy load pages for code splitting
const EmployeeLogin = lazy(() => import('./pages/employee/Login'));
const EmployeeDashboard = lazy(() => import('./pages/employee/Dashboard'));
const PendingCertification = lazy(() => import('./pages/employee/PendingCertification'));
const EmployeeHistory = lazy(() => import('./pages/employee/History'));
const ChangePin = lazy(() => import('./pages/employee/ChangePin'));

const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminForgotPassword = lazy(() => import('./pages/admin/ForgotPassword'));
const AdminResetPassword = lazy(() => import('./pages/admin/ResetPassword'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminEmployees = lazy(() => import('./pages/admin/Employees'));
const AdminEmployeeDetail = lazy(() => import('./pages/admin/EmployeeDetail'));
const AdminTimeEntries = lazy(() => import('./pages/admin/TimeEntries'));
const AdminCompliance = lazy(() => import('./pages/admin/Compliance'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminAuditLog = lazy(() => import('./pages/admin/AuditLog'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminAccounts = lazy(() => import('./pages/admin/AdminAccounts'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
    </div>
  );
}

function ProtectedRoute({ children, requiredType }: { children: React.ReactNode; requiredType: 'EMPLOYEE' | 'ADMIN' }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to={requiredType === 'ADMIN' ? routes.admin.login : routes.employee.login} replace />;
  }

  if (user.type !== requiredType) {
    return <Navigate to={user.type === 'ADMIN' ? routes.admin.dashboard : routes.employee.dashboard} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to={routes.employee.login} replace />} />

        {/* Employee routes */}
        <Route path={routes.employee.login} element={<EmployeeLogin />} />
        <Route
          path={routes.employee.dashboard}
          element={
            <ProtectedRoute requiredType="EMPLOYEE">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.employee.pendingCertification}
          element={
            <ProtectedRoute requiredType="EMPLOYEE">
              <PendingCertification />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.employee.history}
          element={
            <ProtectedRoute requiredType="EMPLOYEE">
              <EmployeeHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.employee.changePin}
          element={
            <ProtectedRoute requiredType="EMPLOYEE">
              <ChangePin />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route path={routes.admin.login} element={<AdminLogin />} />
        <Route path={routes.admin.forgotPassword} element={<AdminForgotPassword />} />
        <Route path={routes.admin.resetPassword} element={<AdminResetPassword />} />
        <Route
          path={routes.admin.dashboard}
          element={
            <ProtectedRoute requiredType="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.admin.employees}
          element={
            <ProtectedRoute requiredType="ADMIN">
              <AdminEmployees />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.admin.employeeDetail}
          element={
            <ProtectedRoute requiredType="ADMIN">
              <AdminEmployeeDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.admin.timeEntries}
          element={
            <ProtectedRoute requiredType="ADMIN">
              <AdminTimeEntries />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.admin.compliance}
          element={
            <ProtectedRoute requiredType="ADMIN">
              <AdminCompliance />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.admin.reports}
          element={
            <ProtectedRoute requiredType="ADMIN">
              <AdminReports />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.admin.auditLog}
          element={
            <ProtectedRoute requiredType="ADMIN">
              <AdminAuditLog />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.admin.settings}
          element={
            <ProtectedRoute requiredType="ADMIN">
              <AdminSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.admin.admins}
          element={
            <ProtectedRoute requiredType="ADMIN">
              <AdminAccounts />
            </ProtectedRoute>
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to={routes.employee.login} replace />} />
      </Routes>
    </Suspense>
  );
}
