import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

type GeofenceWarningProps = {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onCancel: () => void;
  distance: number;
  allowedRadius: number;
  nearestLocation?: string;
  mode: 'warn' | 'block';
};

export default function GeofenceWarning({
  isOpen,
  onClose,
  onProceed,
  onCancel,
  distance,
  allowedRadius,
  nearestLocation,
  mode,
}: GeofenceWarningProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const distanceText = distance >= 1000
    ? `${(distance / 1000).toFixed(1)} km`
    : `${Math.round(distance)} meters`;

  const radiusText = allowedRadius >= 1000
    ? `${(allowedRadius / 1000).toFixed(1)} km`
    : `${allowedRadius} meters`;

  const handleProceed = () => {
    if (mode === 'block') {
      onCancel();
      return;
    }
    if (acknowledged) {
      onProceed();
    }
  };

  const handleClose = () => {
    setAcknowledged(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'block' ? 'Location Required' : 'Location Warning'}
    >
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${mode === 'block' ? 'bg-red-500/10 border border-red-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
          <div className="flex items-start gap-3">
            <div className={`text-2xl ${mode === 'block' ? 'text-red-400' : 'text-yellow-400'}`}>
              {mode === 'block' ? '⛔' : '⚠️'}
            </div>
            <div>
              <h3 className={`font-semibold ${mode === 'block' ? 'text-red-400' : 'text-yellow-400'}`}>
                {mode === 'block' ? 'You must be at an approved location' : 'You are outside the approved area'}
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                {mode === 'block'
                  ? 'Clocking in/out is only allowed at approved work locations. Please move to an approved location and try again.'
                  : 'You appear to be outside the approved work area. Your current location will be recorded with this punch.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Distance from approved area:</span>
            <span className="text-slate-100 font-medium">{distanceText}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Allowed radius:</span>
            <span className="text-slate-100 font-medium">{radiusText}</span>
          </div>
          {nearestLocation && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Nearest location:</span>
              <span className="text-slate-100 font-medium">{nearestLocation}</span>
            </div>
          )}
        </div>

        {mode === 'warn' && (
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">
              I understand that I am outside the approved work area. I acknowledge that my current location will be recorded and may be reviewed by management.
            </span>
          </label>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
          >
            Cancel
          </Button>
          {mode === 'warn' ? (
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleProceed}
              disabled={!acknowledged}
            >
              Proceed Anyway
            </Button>
          ) : (
            <Button
              variant="primary"
              className="flex-1"
              onClick={onCancel}
            >
              OK
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
