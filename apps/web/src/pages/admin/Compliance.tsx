import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/admin/AdminLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchComplianceDashboard,
  fetchViolations,
  fetchWaivers,
  fetchAttestations,
  fetchAlerts,
  ComplianceAlert,
  Violation,
  WaiverRecord,
  AttestationRecord
} from '../../services/compliance';

type Tab = 'overview' | 'violations' | 'waivers' | 'attestations';

export default function AdminCompliance() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['compliance-dashboard'],
    queryFn: () => fetchComplianceDashboard(undefined),
    enabled: isAuthenticated && activeTab === 'overview'
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['compliance-alerts'],
    queryFn: () => fetchAlerts(undefined),
    enabled: isAuthenticated && activeTab === 'overview'
  });

  const { data: violations, isLoading: violationsLoading } = useQuery({
    queryKey: ['violations', dateRange],
    queryFn: () => fetchViolations({ start: dateRange.start, end: dateRange.end }),
    enabled: isAuthenticated && activeTab === 'violations'
  });

  const { data: waivers, isLoading: waiversLoading } = useQuery({
    queryKey: ['waivers', dateRange],
    queryFn: () => fetchWaivers({ start: dateRange.start, end: dateRange.end }),
    enabled: isAuthenticated && activeTab === 'waivers'
  });

  const { data: attestations, isLoading: attestationsLoading } = useQuery({
    queryKey: ['attestations', dateRange],
    queryFn: () => fetchAttestations({ start: dateRange.start, end: dateRange.end }),
    enabled: isAuthenticated && activeTab === 'attestations'
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'violations', label: 'Violations' },
    { id: 'waivers', label: 'Waivers' },
    { id: 'attestations', label: 'Attestations' }
  ];

  return (
    <AdminLayout title="Compliance" subtitle="Monitor compliance and labor law adherence">
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <OverviewTab
          dashboard={dashboard}
          alerts={alerts || []}
          isLoading={dashboardLoading || alertsLoading}
        />
      ) : (
        <>
          {/* Date Range Filter */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">From:</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">To:</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  setDateRange({ start: weekAgo, end: today });
                }}
              >
                Last 7 Days
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  setDateRange({ start: monthAgo, end: today });
                }}
              >
                Last 30 Days
              </Button>
            </div>
          </div>

          {activeTab === 'violations' && (
            <ViolationsTab violations={violations || []} isLoading={violationsLoading} />
          )}
          {activeTab === 'waivers' && (
            <WaiversTab waivers={waivers || []} isLoading={waiversLoading} />
          )}
          {activeTab === 'attestations' && (
            <AttestationsTab attestations={attestations || []} isLoading={attestationsLoading} />
          )}
        </>
      )}
    </AdminLayout>
  );
}

function OverviewTab({
  dashboard,
  alerts,
  isLoading
}: {
  dashboard: ReturnType<typeof fetchComplianceDashboard> extends Promise<infer T> ? T : never;
  alerts: ComplianceAlert[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <Card className="p-6">
        <p className="text-red-400">Failed to load compliance data.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Violations Today"
          value={dashboard.violationsToday}
          color={dashboard.violationsToday > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Waivers Signed"
          value={dashboard.waiversToday}
          color="blue"
        />
        <StatCard
          label="Attestations"
          value={dashboard.attestationsToday}
          color="purple"
        />
        <StatCard
          label="Pending Certifications"
          value={dashboard.pendingCertifications}
          color={dashboard.pendingCertifications > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* Active Alerts */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Active Alerts</h2>
        {alerts.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-slate-400">No active alerts. All employees are in compliance.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ViolationsTab({
  violations,
  isLoading
}: {
  violations: Violation[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (violations.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-400">No violations found in this date range.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-800/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {violations.map((violation) => (
            <tr key={violation.id} className="hover:bg-slate-800/30">
              <td className="px-4 py-3 text-sm text-white">
                {new Date(violation.work_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm text-white">
                {violation.employee_name || '-'}
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded">
                  {violation.violation_type.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-300">
                {violation.description}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                    violation.is_resolved
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {violation.is_resolved ? 'Resolved' : 'Open'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function WaiversTab({
  waivers,
  isLoading
}: {
  waivers: WaiverRecord[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (waivers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-400">No waivers found in this date range.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-800/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Signed At</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {waivers.map((waiver) => (
            <tr key={waiver.id} className="hover:bg-slate-800/30">
              <td className="px-4 py-3 text-sm text-white">
                {new Date(waiver.work_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm text-white">
                {waiver.employee_name || '-'}
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
                  {waiver.waiver_type.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-300">
                {new Date(waiver.signed_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function AttestationsTab({
  attestations,
  isLoading
}: {
  attestations: AttestationRecord[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (attestations.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-400">No attestations found in this date range.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-800/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Selection</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Comment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {attestations.map((att) => (
            <tr key={att.id} className="hover:bg-slate-800/30">
              <td className="px-4 py-3 text-sm text-white">
                {new Date(att.work_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm text-white">
                {att.employee_name || '-'}
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded">
                  {att.attestation_type.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-300">
                {att.selected_option}
                {att.option_a_suboption && ` - ${att.option_a_suboption}`}
              </td>
              <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">
                {att.comment || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function StatCard({
  label,
  value,
  color
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-600/20 text-green-400 border-green-500/30',
    amber: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
    red: 'bg-red-600/20 text-red-400 border-red-500/30',
    purple: 'bg-purple-600/20 text-purple-400 border-purple-500/30'
  };

  return (
    <Card className={`p-4 border ${colorClasses[color]}`}>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </Card>
  );
}

function AlertCard({ alert }: { alert: ComplianceAlert }) {
  const severityColors = {
    low: 'border-l-blue-500 bg-blue-500/10',
    medium: 'border-l-amber-500 bg-amber-500/10',
    high: 'border-l-red-500 bg-red-500/10'
  };

  const severityBadgeColors = {
    low: 'bg-blue-500/20 text-blue-400',
    medium: 'bg-amber-500/20 text-amber-400',
    high: 'bg-red-500/20 text-red-400'
  };

  return (
    <Card className={`p-4 border-l-4 ${severityColors[alert.severity]}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-white">{alert.employeeName}</p>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${severityBadgeColors[alert.severity]}`}>
              {alert.severity}
            </span>
          </div>
          <p className="text-sm text-slate-300">{alert.message}</p>
          <p className="text-xs text-slate-500 mt-1">
            {new Date(alert.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
}
