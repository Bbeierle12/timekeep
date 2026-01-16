import { useState } from 'react';
import { format } from 'date-fns';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import { useAuth } from '../../hooks/useAuth';
import { certifyDay, type PendingCertification } from '../../services/certification';
import type { TimeEntry } from '../../services/timeEntries';

type CertificationFormProps = {
  certification: PendingCertification;
  onSuccess: () => void;
};

const ACTION_LABELS: Record<string, string> = {
  CLOCK_IN: 'Clock In',
  CLOCK_OUT: 'Clock Out',
  LUNCH_START: 'Lunch Start',
  LUNCH_END: 'Lunch End',
  BREAK_ACK_1: 'Break 1 Taken',
  BREAK_ACK_2: 'Break 2 Taken',
  BREAK_ACK_3: 'Break 3 Taken',
  BREAK_SKIP_1: 'Break 1 Skipped',
  BREAK_SKIP_2: 'Break 2 Skipped',
  BREAK_SKIP_3: 'Break 3 Skipped'
};

function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export default function CertificationForm({
  certification,
  onSuccess
}: CertificationFormProps) {
  const { token } = useAuth();
  const [acknowledged, setAcknowledged] = useState(false);
  const [requestCorrection, setRequestCorrection] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { summary, entries, workDate, hasViolation, violationType } = certification;

  const handleSubmit = async () => {
    if (!acknowledged || !token) return;
    if (requestCorrection && !correctionNote.trim()) {
      setError('Please provide details for your correction request');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await certifyDay(
        {
          workDate,
          comment: comment.trim() || undefined,
          requestCorrection,
          correctionNote: requestCorrection ? correctionNote.trim() : undefined
        },
        token
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to certify');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Date Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-100">
          {format(new Date(workDate), 'EEEE, MMMM d, yyyy')}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Please review and certify your time entries
        </p>
      </div>

      {/* Violation Warning */}
      {hasViolation && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-red-200">Compliance Issue Detected</p>
              <p className="text-red-300 text-sm mt-1">
                {violationType === 'LUNCH_VIOLATION'
                  ? 'A meal period violation was detected. Please review your entries.'
                  : violationType === 'BREAK_VIOLATION'
                  ? 'A rest break violation was detected. Please review your entries.'
                  : 'A compliance issue was detected. Please review your entries.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total Shift</p>
          <p className="text-xl font-semibold text-slate-100">
            {formatMinutes(summary.total_shift_minutes)}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Time Worked</p>
          <p className="text-xl font-semibold text-slate-100">
            {formatMinutes(summary.worked_minutes)}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Lunch Duration</p>
          <p className={`text-xl font-semibold ${
            summary.lunch_compliant === false ? 'text-amber-400' : 'text-slate-100'
          }`}>
            {formatMinutes(summary.lunch_duration_minutes)}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Overtime</p>
          <p className={`text-xl font-semibold ${
            summary.overtime_minutes > 0 ? 'text-sky-400' : 'text-slate-100'
          }`}>
            {formatMinutes(summary.overtime_minutes)}
          </p>
        </div>
      </div>

      {/* Time Entries */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h3 className="font-medium text-slate-100">Time Entries</h3>
        </div>
        <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
          {sortedEntries.map((entry: TimeEntry) => (
            <div key={entry.id} className="px-4 py-2 flex items-center justify-between">
              <span className="text-sm text-slate-300">
                {ACTION_LABELS[entry.action_type] || entry.action_type}
              </span>
              <span className="text-sm text-slate-100 font-medium">
                {format(new Date(entry.recorded_at), 'h:mm a')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Request Correction */}
      <div className="space-y-3">
        <Checkbox
          label="I need to request a correction to my time entries"
          checked={requestCorrection}
          onChange={(e) => setRequestCorrection(e.target.checked)}
        />

        {requestCorrection && (
          <textarea
            value={correctionNote}
            onChange={(e) => setCorrectionNote(e.target.value)}
            placeholder="Please describe what needs to be corrected..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 resize-none"
          />
        )}
      </div>

      {/* Optional Comment */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">
          Additional Comments (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Any notes about your day..."
          rows={2}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 resize-none"
        />
      </div>

      {/* Certification Acknowledgment */}
      <div className="border-t border-slate-800 pt-4">
        <Checkbox
          label="I certify that the time entries shown above are accurate and complete"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleSubmit}
        disabled={!acknowledged || isSubmitting}
      >
        {isSubmitting ? 'Certifying...' : 'Certify Time Entries'}
      </Button>
    </div>
  );
}
