import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useTimeEntry } from '../../hooks/useTimeEntry';
import { useGeolocation } from '../../hooks/useGeolocation';
import type { ActionType } from '../../services/timeEntries';

type BreakAckModalProps = {
  isOpen: boolean;
  breakNumber: 1 | 2 | 3;
  onClose: () => void;
  onSuccess: () => void;
};

export default function BreakAckModal({
  isOpen,
  breakNumber,
  onClose,
  onSuccess
}: BreakAckModalProps) {
  const { punchAsync, isPunching } = useTimeEntry();
  const { requestLocation } = useGeolocation();
  const [error, setError] = useState<string | null>(null);

  const handleAcknowledge = async (taken: boolean) => {
    setError(null);

    try {
      const locationResult = await requestLocation();
      const actionType: ActionType = taken
        ? (`BREAK_ACK_${breakNumber}` as ActionType)
        : (`BREAK_SKIP_${breakNumber}` as ActionType);

      await punchAsync({
        actionType,
        recordedAt: new Date().toISOString(),
        gpsLatitude: locationResult.coords?.latitude,
        gpsLongitude: locationResult.coords?.longitude,
        gpsAccuracyMeters: locationResult.coords?.accuracy,
        gpsUnavailable: locationResult.status !== 'success'
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record break');
    }
  };

  const ordinal = breakNumber === 1 ? '1st' : breakNumber === 2 ? '2nd' : '3rd';

  return (
    <Modal
      title={`${ordinal} Rest Break`}
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={!isPunching}
      size="md"
    >
      <div className="space-y-6">
        {/* Info */}
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-slate-300 text-sm">
            California labor law entitles you to a <span className="font-medium text-slate-100">10-minute paid rest break</span> for
            every 4 hours worked. Please indicate whether you are taking or skipping your {ordinal.toLowerCase()} rest break.
          </p>
        </div>

        {/* Time worked notice */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-900/30 border border-sky-500/30">
            <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sky-200 text-sm font-medium">
              Rest Break #{breakNumber} Available
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => handleAcknowledge(true)}
            disabled={isPunching}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isPunching ? 'Recording...' : 'I Am Taking My Break'}
            </span>
          </Button>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => handleAcknowledge(false)}
            disabled={isPunching}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {isPunching ? 'Recording...' : 'I Choose to Skip My Break'}
            </span>
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Skipping rest breaks is voluntary. You may take your break at any time.
          </p>
        </div>
      </div>
    </Modal>
  );
}
