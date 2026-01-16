import { useState } from 'react';
import { format } from 'date-fns';
import { useTimeEntry } from '../../hooks/useTimeEntry';
import { useGeolocation } from '../../hooks/useGeolocation';
import type { ActionType } from '../../services/timeEntries';

type PunchButtonProps = {
  actionType: ActionType;
  label: string;
  disabled?: boolean;
  completed?: boolean;
  completedTime?: string;
};

export default function PunchButton({
  actionType,
  label,
  disabled = false,
  completed = false,
  completedTime
}: PunchButtonProps) {
  const { punchAsync, isPunching } = useTimeEntry();
  const { requestLocation } = useGeolocation();
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (disabled || completed || isPunching) return;

    setError(null);

    try {
      // Try to get location
      const locationResult = await requestLocation();

      await punchAsync({
        actionType,
        recordedAt: new Date().toISOString(),
        gpsLatitude: locationResult.coords?.latitude,
        gpsLongitude: locationResult.coords?.longitude,
        gpsAccuracyMeters: locationResult.coords?.accuracy,
        gpsUnavailable: locationResult.status !== 'success'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record punch');
    }
  };

  const isActive = !disabled && !completed;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || completed || isPunching}
        className={`
          w-full rounded-xl p-6 text-center transition-all
          ${completed
            ? 'bg-green-900/30 border-2 border-green-500/50 cursor-default'
            : isActive
              ? 'bg-slate-800 border-2 border-sky-500 hover:bg-slate-700 cursor-pointer'
              : 'bg-slate-800/50 border-2 border-slate-700 cursor-not-allowed opacity-50'
          }
        `}
      >
        <div className="text-lg font-semibold text-slate-100">
          {label}
        </div>

        {completed && completedTime && (
          <div className="mt-2 text-green-400 text-sm flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {format(new Date(completedTime), 'h:mm a')}
          </div>
        )}

        {isActive && !completed && (
          <div className="mt-2 text-sky-400 text-sm">
            {isPunching ? 'Recording...' : 'Tap to record'}
          </div>
        )}

        {!isActive && !completed && (
          <div className="mt-2 text-slate-500 text-sm">
            Waiting...
          </div>
        )}
      </button>

      {error && (
        <div className="absolute -bottom-6 left-0 right-0 text-center text-red-400 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
