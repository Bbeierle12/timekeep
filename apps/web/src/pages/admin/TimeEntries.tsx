import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchEntries,
  fetchCorrections,
  approveCorrection,
  rejectCorrection,
  applyCorrection,
  TimeEntry,
  Correction
} from '../../services/entries';
import { listEmployees, Employee } from '../../services/employees';

const entryTypeLabels: Record<string, string> = {
  CLOCK_IN: 'Clock In',
  CLOCK_OUT: 'Clock Out',
  LUNCH_START: 'Lunch Start',
  LUNCH_END: 'Lunch End',
  BREAK_START: 'Break Start',
  BREAK_END: 'Break End'
};

const entryTypeColors: Record<string, string> = {
  CLOCK_IN: 'bg-green-500/20 text-green-400',
  CLOCK_OUT: 'bg-red-500/20 text-red-400',
  LUNCH_START: 'bg-amber-500/20 text-amber-400',
  LUNCH_END: 'bg-amber-500/20 text-amber-400',
  BREAK_START: 'bg-blue-500/20 text-blue-400',
  BREAK_END: 'bg-blue-500/20 text-blue-400'
};

export default function AdminTimeEntries() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'entries' | 'corrections'>('entries');
  const [selectedCorrection, setSelectedCorrection] = useState<Correction | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Filters
  const [dateFilter, setDateFilter] = useState(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  );
  const [employeeFilter, setEmployeeFilter] = useState(searchParams.get('employee') || '');

  // Fetch employees for the filter dropdown
  const { data: employees } = useQuery({
    queryKey: ['employees', { status: 'active' }],
    queryFn: () => listEmployees({ status: 'active' }, token!),
    enabled: !!token
  });

  // Fetch entries
  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ['entries', { date: dateFilter, employeeId: employeeFilter }],
    queryFn: () => fetchEntries({ date: dateFilter, employeeId: employeeFilter || undefined }, token!),
    enabled: !!token
  });

  // Fetch pending corrections
  const { data: corrections, isLoading: correctionsLoading } = useQuery({
    queryKey: ['corrections', { status: 'PENDING' }],
    queryFn: () => fetchCorrections({ status: 'PENDING' }, token!),
    enabled: !!token && activeTab === 'corrections'
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveCorrection(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] });
      setSelectedCorrection(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectCorrection(id, reason, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] });
      setSelectedCorrection(null);
      setRejectReason('');
    }
  });

  const applyMutation = useMutation({
    mutationFn: (id: string) => applyCorrection(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      setSelectedCorrection(null);
    }
  });

  // Group entries by employee
  const groupedEntries = useMemo(() => {
    if (!entries) return {};
    return entries.reduce((acc, entry) => {
      const key = entry.employee_id;
      if (!acc[key]) {
        acc[key] = {
          name: entry.employee_name || 'Unknown',
          entries: []
        };
      }
      acc[key].entries.push(entry);
      return acc;
    }, {} as Record<string, { name: string; entries: TimeEntry[] }>);
  }, [entries]);

  const handleDateChange = (date: string) => {
    setDateFilter(date);
    const params = new URLSearchParams(searchParams);
    params.set('date', date);
    setSearchParams(params);
  };

  const handleEmployeeChange = (employeeId: string) => {
    setEmployeeFilter(employeeId);
    const params = new URLSearchParams(searchParams);
    if (employeeId) {
      params.set('employee', employeeId);
    } else {
      params.delete('employee');
    }
    setSearchParams(params);
  };

  return (
    <AdminLayout title="Time Entries" subtitle="View and manage employee time records">
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('entries')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'entries'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Time Entries
        </button>
        <button
          onClick={() => setActiveTab('corrections')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'corrections'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Pending Corrections
          {corrections && corrections.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
              {corrections.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'entries' ? (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="w-full sm:w-48">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-64">
              <select
                value={employeeFilter}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Employees</option>
                {employees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.initials})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
              >
                Today
              </Button>
            </div>
          </div>

          {/* Entries List */}
          {entriesLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
            </div>
          ) : !entries?.length ? (
            <Card className="p-8 text-center">
              <p className="text-slate-400">No time entries found for the selected date.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedEntries).map(([employeeId, { name, entries: empEntries }]) => (
                <Card key={employeeId} className="overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
                    <h3 className="font-medium text-white">{name}</h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      {empEntries
                        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                        .map((entry) => (
                          <EntryRow key={entry.id} entry={entry} />
                        ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Corrections List */}
          {correctionsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
            </div>
          ) : !corrections?.length ? (
            <Card className="p-8 text-center">
              <p className="text-slate-400">No pending corrections.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {corrections.map((correction) => (
                <CorrectionCard
                  key={correction.id}
                  correction={correction}
                  onReview={() => setSelectedCorrection(correction)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Review Correction Modal */}
      <Modal
        isOpen={!!selectedCorrection}
        onClose={() => {
          setSelectedCorrection(null);
          setRejectReason('');
        }}
        title="Review Correction Request"
      >
        {selectedCorrection && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-xs text-slate-400">Original Time</p>
                <p className="text-white">
                  {new Date(selectedCorrection.original_timestamp).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Requested Time</p>
                <p className="text-white">
                  {new Date(selectedCorrection.requested_timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Reason for Correction</p>
              <p className="text-white bg-slate-800/50 p-3 rounded-lg">
                {selectedCorrection.reason}
              </p>
            </div>

            {selectedCorrection.status === 'PENDING' && (
              <div className="space-y-4 pt-4">
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => approveMutation.mutate(selectedCorrection.id)}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-red-400 hover:text-red-300"
                    onClick={() => {
                      if (rejectReason.trim()) {
                        rejectMutation.mutate({
                          id: selectedCorrection.id,
                          reason: rejectReason
                        });
                      }
                    }}
                    disabled={!rejectReason.trim() || rejectMutation.isPending}
                  >
                    {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                  </Button>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Rejection reason (required to reject)
                  </label>
                  <Input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                  />
                </div>
              </div>
            )}

            {selectedCorrection.status === 'APPROVED' && (
              <div className="pt-4">
                <Button
                  className="w-full"
                  onClick={() => applyMutation.mutate(selectedCorrection.id)}
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? 'Applying...' : 'Apply Correction'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}

function EntryRow({ entry }: { entry: TimeEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-800/30">
      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${entryTypeColors[entry.entry_type]}`}>
          {entryTypeLabels[entry.entry_type]}
        </span>
        <span className="text-white font-mono">{time}</span>
        {entry.is_corrected && (
          <span className="text-xs text-amber-400">(corrected)</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {entry.comment && (
          <span className="text-sm text-slate-400 max-w-xs truncate" title={entry.comment}>
            "{entry.comment}"
          </span>
        )}
        {entry.latitude && entry.longitude && (
          <span className="text-xs text-slate-500" title={`${entry.latitude}, ${entry.longitude}`}>
            GPS
          </span>
        )}
      </div>
    </div>
  );
}

function CorrectionCard({
  correction,
  onReview
}: {
  correction: Correction;
  onReview: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-white font-medium">
            {correction.requester_name || 'Unknown requester'}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-slate-400">From: </span>
              <span className="text-white">
                {new Date(correction.original_timestamp).toLocaleString()}
              </span>
            </div>
            <span className="text-slate-600">&rarr;</span>
            <div>
              <span className="text-slate-400">To: </span>
              <span className="text-white">
                {new Date(correction.requested_timestamp).toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-400">"{correction.reason}"</p>
        </div>
        <Button variant="secondary" onClick={onReview}>
          Review
        </Button>
      </div>
    </Card>
  );
}
