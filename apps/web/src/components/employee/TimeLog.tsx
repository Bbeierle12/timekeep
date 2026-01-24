import { format } from 'date-fns';
import type { TimeEntry, ActionType } from '../../services/timeEntries';

type TimeLogProps = {
  entries: TimeEntry[];
};

const ACTION_LABELS: Record<ActionType, string> = {
  CLOCK_IN: 'Clock In',
  CLOCK_OUT: 'Clock Out',
  LUNCH_START: 'Lunch Start',
  LUNCH_END: 'Lunch End',
  SECOND_LUNCH_START: 'Second Lunch Start',
  SECOND_LUNCH_END: 'Second Lunch End',
  THIRD_LUNCH_START: 'Third Lunch Start',
  THIRD_LUNCH_END: 'Third Lunch End',
  BREAK_ACK_1: 'Break 1',
  BREAK_ACK_2: 'Break 2',
  BREAK_ACK_3: 'Break 3',
  BREAK_SKIP_1: 'Break 1 (Skipped)',
  BREAK_SKIP_2: 'Break 2 (Skipped)',
  BREAK_SKIP_3: 'Break 3 (Skipped)'
};

export default function TimeLog({ entries }: TimeLogProps) {
  if (entries.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        No entries yet today. Clock in to start your day.
      </div>
    );
  }

  // Sort entries by recorded time (oldest first)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  return (
    <div className="divide-y divide-slate-800">
      {sortedEntries.map((entry) => (
        <div key={entry.id} className="px-4 py-3 flex items-start gap-4">
          {/* Time */}
          <div className="w-20 flex-shrink-0">
            <span className="text-slate-100 font-medium">
              {format(new Date(entry.recorded_at), 'h:mm a')}
            </span>
          </div>

          {/* Action */}
          <div className="flex-shrink-0 w-28">
            <span className="text-sky-400 text-sm font-medium">
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
  );
}
