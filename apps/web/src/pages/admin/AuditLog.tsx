import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/admin/AdminLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { fetchAuditLog, AuditEntry, AuditQueryParams } from '../../services/audit';

const actionCategories: Record<string, string[]> = {
  'Authentication': ['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'SESSION_EXPIRED'],
  'Time Entries': ['CLOCK_IN', 'CLOCK_OUT', 'LUNCH_START', 'LUNCH_END', 'BREAK_START', 'BREAK_END'],
  'Employees': ['EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'EMPLOYEE_DEACTIVATED', 'EMPLOYEE_REACTIVATED', 'PIN_RESET'],
  'Compliance': ['WAIVER_SIGNED', 'ATTESTATION_SIGNED', 'CERTIFICATION_COMPLETED', 'VIOLATION_CREATED'],
  'Corrections': ['CORRECTION_REQUESTED', 'CORRECTION_APPROVED', 'CORRECTION_REJECTED', 'CORRECTION_APPLIED'],
  'Settings': ['SETTINGS_UPDATED']
};

const actorTypeColors: Record<string, string> = {
  EMPLOYEE: 'bg-blue-500/20 text-blue-400',
  ADMIN: 'bg-purple-500/20 text-purple-400',
  SYSTEM: 'bg-slate-500/20 text-slate-400'
};

export default function AdminAuditLog() {
  const { token } = useAuth();
  const [filters, setFilters] = useState<AuditQueryParams>({
    limit: 50
  });
  const [searchTerm, setSearchTerm] = useState('');

  const { data: auditEntries, isLoading, error } = useQuery({
    queryKey: ['audit-log', filters],
    queryFn: () => fetchAuditLog(filters, token!),
    enabled: !!token
  });

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm || undefined });
  };

  const handleFilterChange = (key: keyof AuditQueryParams, value: string | undefined) => {
    setFilters({ ...filters, [key]: value || undefined });
  };

  return (
    <AdminLayout title="Audit Log" subtitle="Track all system activity and changes">
      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>Search</Button>
            </div>
          </div>
          <div>
            <select
              value={filters.actorType || ''}
              onChange={(e) => handleFilterChange('actorType', e.target.value as AuditQueryParams['actorType'])}
              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Actors</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>
          <div>
            <select
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Actions</option>
              {Object.entries(actionCategories).map(([category, actions]) => (
                <optgroup key={category} label={category}>
                  {actions.map((action) => (
                    <option key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {(filters.search || filters.actorType || filters.action) && (
            <Button
              variant="secondary"
              onClick={() => {
                setFilters({ limit: 50 });
                setSearchTerm('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Audit Log List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      ) : error ? (
        <Card className="p-6">
          <p className="text-red-400">Failed to load audit log. Please try again.</p>
        </Card>
      ) : !auditEntries?.length ? (
        <Card className="p-8 text-center">
          <p className="text-slate-400">No audit entries found.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {auditEntries.map((entry) => (
            <AuditEntryCard key={entry.id} entry={entry} />
          ))}
          {auditEntries.length >= (filters.limit || 50) && (
            <div className="text-center pt-4">
              <Button
                variant="secondary"
                onClick={() => setFilters({ ...filters, limit: (filters.limit || 50) + 50 })}
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

function AuditEntryCard({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${actorTypeColors[entry.actor_type]}`}>
              {entry.actor_type}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-300 rounded">
              {entry.action.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm text-white">
            {entry.actor_identifier || 'System'}
            {entry.target_type && (
              <span className="text-slate-400">
                {' '}on {entry.target_type}
                {entry.target_id && ` (${entry.target_id.slice(0, 8)}...)`}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {new Date(entry.created_at).toLocaleString()}
            {entry.ip_address && ` from ${entry.ip_address}`}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && entry.details && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs font-medium text-slate-400 mb-2">Details</p>
          <pre className="text-xs text-slate-300 bg-slate-800 p-3 rounded overflow-x-auto">
            {JSON.stringify(entry.details, null, 2)}
          </pre>
          {entry.user_agent && (
            <p className="text-xs text-slate-500 mt-2 truncate" title={entry.user_agent}>
              User Agent: {entry.user_agent}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
