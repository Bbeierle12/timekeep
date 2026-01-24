import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { fetchComplianceDashboard, ComplianceAlert } from '../../services/compliance';
import { routes } from '../../routes';

function StatCard({
  label,
  value,
  icon,
  color = 'blue'
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-600/20 text-blue-400',
    green: 'bg-green-600/20 text-green-400',
    amber: 'bg-amber-600/20 text-amber-400',
    red: 'bg-red-600/20 text-red-400',
    purple: 'bg-purple-600/20 text-purple-400'
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-slate-400">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function AlertCard({ alert }: { alert: ComplianceAlert }) {
  const severityColors = {
    low: 'border-blue-500 bg-blue-500/10',
    medium: 'border-amber-500 bg-amber-500/10',
    high: 'border-red-500 bg-red-500/10'
  };

  const severityTextColors = {
    low: 'text-blue-400',
    medium: 'text-amber-400',
    high: 'text-red-400'
  };

  return (
    <div className={`p-3 rounded-lg border-l-4 ${severityColors[alert.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{alert.employeeName}</p>
          <p className="text-sm text-slate-300">{alert.message}</p>
        </div>
        <span className={`text-xs font-medium uppercase ${severityTextColors[alert.severity]}`}>
          {alert.severity}
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { isAuthenticated } = useAuth();

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['compliance-dashboard'],
    queryFn: () => fetchComplianceDashboard(undefined),
    enabled: isAuthenticated,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <AdminLayout title="Dashboard" subtitle={today}>
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      ) : error ? (
        <Card className="p-6">
          <p className="text-red-400">Failed to load dashboard data. Please try again.</p>
        </Card>
      ) : dashboard ? (
        <div className="space-y-6">
          {/* Employee Status */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Employee Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Employees"
                value={dashboard.totalEmployees}
                color="blue"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Clocked In"
                value={dashboard.clockedInCount}
                color="green"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                }
              />
              <StatCard
                label="On Lunch"
                value={dashboard.onLunchCount}
                color="amber"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Clocked Out"
                value={dashboard.clockedOutCount}
                color="purple"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                }
              />
            </div>
          </section>

          {/* Compliance Metrics */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Today's Compliance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Pending Certifications"
                value={dashboard.pendingCertifications}
                color={dashboard.pendingCertifications > 0 ? 'amber' : 'green'}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Violations"
                value={dashboard.violationsToday}
                color={dashboard.violationsToday > 0 ? 'red' : 'green'}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              />
              <StatCard
                label="Waivers Signed"
                value={dashboard.waiversToday}
                color="blue"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <StatCard
                label="Attestations"
                value={dashboard.attestationsToday}
                color="purple"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                }
              />
            </div>
          </section>

          {/* Active Alerts */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Active Alerts</h2>
              <Link
                to={routes.admin.compliance}
                className="text-sm text-sky-400 hover:text-sky-300"
              >
                View All
              </Link>
            </div>
            {dashboard.activeAlerts.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-slate-400">No active alerts. All employees are in compliance.</p>
              </Card>
            ) : (
              <Card className="p-4">
                <div className="space-y-3">
                  {dashboard.activeAlerts.slice(0, 5).map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                  {dashboard.activeAlerts.length > 5 && (
                    <Link
                      to={routes.admin.compliance}
                      className="block text-center text-sm text-sky-400 hover:text-sky-300 pt-2"
                    >
                      +{dashboard.activeAlerts.length - 5} more alerts
                    </Link>
                  )}
                </div>
              </Card>
            )}
          </section>

          {/* Quick Actions */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to={routes.admin.employees}>
                <Card className="p-4 hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <span className="text-white font-medium">Manage Employees</span>
                  </div>
                </Card>
              </Link>
              <Link to={routes.admin.reports}>
                <Card className="p-4 hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600/20 rounded-lg text-green-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-white font-medium">Export Reports</span>
                  </div>
                </Card>
              </Link>
              <Link to={routes.admin.settings}>
                <Card className="p-4 hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600/20 rounded-lg text-purple-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-white font-medium">System Settings</span>
                  </div>
                </Card>
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </AdminLayout>
  );
}
