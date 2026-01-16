import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, startOfDay, isSameDay } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { fetchHistory, type TimeEntry, type ActionType } from '../../services/timeEntries';
import { routes } from '../../routes';
import Button from '../../components/ui/Button';

const ACTION_LABELS: Record<ActionType, string> = {
  CLOCK_IN: 'Clock In',
  CLOCK_OUT: 'Clock Out',
  LUNCH_START: 'Lunch Start',
  LUNCH_END: 'Lunch End',
  BREAK_ACK_1: 'Break 1',
  BREAK_ACK_2: 'Break 2',
  BREAK_ACK_3: 'Break 3',
  BREAK_SKIP_1: 'Break 1 (Skipped)',
  BREAK_SKIP_2: 'Break 2 (Skipped)',
  BREAK_SKIP_3: 'Break 3 (Skipped)'
};

type GroupedEntries = {
  date: Date;
  dateString: string;
  entries: TimeEntry[];
};

function groupEntriesByDate(entries: TimeEntry[]): GroupedEntries[] {
  const groups: Map<string, GroupedEntries> = new Map();

  for (const entry of entries) {
    const date = startOfDay(parseISO(entry.recorded_at));
    const dateString = format(date, 'yyyy-MM-dd');

    if (!groups.has(dateString)) {
      groups.set(dateString, {
        date,
        dateString,
        entries: []
      });
    }

    groups.get(dateString)!.entries.push(entry);
  }

  // Sort groups by date (newest first)
  const sorted = Array.from(groups.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  // Sort entries within each group by time (oldest first)
  for (const group of sorted) {
    group.entries.sort(
      (a, b) => parseISO(a.recorded_at).getTime() - parseISO(b.recorded_at).getTime()
    );
  }

  return sorted;
}

export default function EmployeeHistory() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      if (!token) return;

      try {
        const history = await fetchHistory(token, 200);
        setEntries(history);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [token]);

  const groupedEntries = groupEntriesByDate(entries);
  const today = new Date();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(routes.employee.dashboard)}
              className="text-slate-400 hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-slate-100">Time History</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {groupedEntries.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-400">No time entries found</p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => navigate(routes.employee.dashboard)}
            >
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedEntries.map((group) => (
              <div key={group.dateString} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                {/* Date Header */}
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-100">
                      {isSameDay(group.date, today)
                        ? 'Today'
                        : format(group.date, 'EEEE, MMMM d, yyyy')}
                    </h2>
                    <span className="text-sm text-slate-400">
                      {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                </div>

                {/* Entries */}
                <div className="divide-y divide-slate-800">
                  {group.entries.map((entry) => (
                    <div key={entry.id} className="px-4 py-3 flex items-start gap-4">
                      {/* Time */}
                      <div className="w-20 flex-shrink-0">
                        <span className="text-slate-100 font-medium">
                          {format(parseISO(entry.recorded_at), 'h:mm a')}
                        </span>
                      </div>

                      {/* Action */}
                      <div className="flex-shrink-0 w-32">
                        <span className={`text-sm font-medium ${
                          entry.action_type.includes('SKIP') ? 'text-amber-400' : 'text-sky-400'
                        }`}>
                          {ACTION_LABELS[entry.action_type] || entry.action_type}
                        </span>
                      </div>

                      {/* Location & Comment */}
                      <div className="flex-1 min-w-0">
                        {entry.resolved_address && (
                          <p className="text-slate-400 text-sm truncate">
                            {entry.resolved_address}
                          </p>
                        )}
                        {entry.comment && (
                          <p className="text-slate-300 text-sm mt-1 italic">
                            "{entry.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
