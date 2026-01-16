import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import SignaturePad, { type SignaturePadRef } from '../ui/SignaturePad';
import { useAuth } from '../../hooks/useAuth';
import { useGeolocation } from '../../hooks/useGeolocation';
import { signWaiver, type WaiverType } from '../../services/waivers';

type WaiverModalProps = {
  isOpen: boolean;
  waiverType?: WaiverType;
  onClose: () => void;
  onSuccess: () => void;
};

const WAIVER_TEXT = `I voluntarily waive my right to a 30-minute meal period for the current work shift. I understand that:

1. I am entitled to a 30-minute uninterrupted meal period.
2. By signing this waiver, I am choosing to forgo my meal period for today only.
3. This waiver is voluntary and I may revoke it at any time by simply taking my meal break.
4. I will be paid for all time worked during the waived meal period.

I acknowledge that I have read and understand this waiver.`;

export default function WaiverModal({
  isOpen,
  waiverType = 'FIRST_MEAL_WAIVER',
  onClose,
  onSuccess
}: WaiverModalProps) {
  const { token } = useAuth();
  const { requestLocation } = useGeolocation();
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const [acknowledged, setAcknowledged] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignatureEnd = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      setHasSigned(true);
    }
  };

  const handleClearSignature = () => {
    signaturePadRef.current?.clear();
    setHasSigned(false);
  };

  const handleSubmit = async () => {
    if (!acknowledged || !hasSigned || !token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get signature as base64
      const signatureData = signaturePadRef.current?.toDataURL() ?? '';
      // Remove data:image/png;base64, prefix
      const signatureImage = signatureData.replace(/^data:image\/\w+;base64,/, '');

      // Try to get location
      const locationResult = await requestLocation();

      await signWaiver(
        {
          waiverType,
          checkboxChecked: acknowledged,
          signatureImage,
          gpsLatitude: locationResult.coords?.latitude,
          gpsLongitude: locationResult.coords?.longitude
        },
        token
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign waiver');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = acknowledged && hasSigned && !isSubmitting;

  return (
    <Modal
      title="Meal Period Waiver"
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={!isSubmitting}
      size="lg"
    >
      <div className="space-y-6">
        {/* Waiver text */}
        <div className="bg-slate-800 rounded-lg p-4 max-h-48 overflow-y-auto">
          <p className="text-sm text-slate-300 whitespace-pre-line">{WAIVER_TEXT}</p>
        </div>

        {/* Acknowledgment checkbox */}
        <div className="border-t border-slate-800 pt-4">
          <Checkbox
            label="I have read and understand the above waiver"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
        </div>

        {/* Signature section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">
              Your Signature
            </label>
            {hasSigned && (
              <button
                type="button"
                onClick={handleClearSignature}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
          <SignaturePad
            ref={signaturePadRef}
            width={380}
            height={120}
            onEnd={handleSignatureEnd}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-800 pt-4">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Signing...' : 'Sign Waiver'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
