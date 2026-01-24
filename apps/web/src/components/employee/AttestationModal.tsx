import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import SignaturePad, { type SignaturePadRef } from '../ui/SignaturePad';
import { useAuth } from '../../hooks/useAuth';
import { useGeolocation } from '../../hooks/useGeolocation';
import { signAttestation, type AttestationOption, type OptionASuboption } from '../../services/waivers';

type AttestationModalProps = {
  isOpen: boolean;
  lunchDurationMinutes: number;
  requiredMinutes?: number;
  onClose: () => void;
  onSuccess: () => void;
};

const OPTION_A_SUBOPTIONS: { value: OptionASuboption; label: string }[] = [
  { value: 'NOT_TAKEN', label: 'I chose not to take my meal break' },
  { value: 'SHORTER', label: 'I chose to take a shorter meal break' },
  { value: 'LATE', label: 'I chose to take my meal break late' }
];

export default function AttestationModal({
  isOpen,
  lunchDurationMinutes,
  requiredMinutes = 30,
  onClose,
  onSuccess
}: AttestationModalProps) {
  const { isAuthenticated } = useAuth();
  const { requestLocation } = useGeolocation();
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const [selectedOption, setSelectedOption] = useState<AttestationOption | null>(null);
  const [optionASuboption, setOptionASuboption] = useState<OptionASuboption | null>(null);
  const [comment, setComment] = useState('');
  const [hasSigned, setHasSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shortByMinutes = Math.max(0, requiredMinutes - lunchDurationMinutes);

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
    if (!selectedOption || !hasSigned || !isAuthenticated) return;
    if (selectedOption === 'OPTION_A' && !optionASuboption) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get signature as base64
      const signatureData = signaturePadRef.current?.toDataURL() ?? '';
      const signatureImage = signatureData.replace(/^data:image\/\w+;base64,/, '');

      // Try to get location
      const locationResult = await requestLocation();

      await signAttestation(
        {
          selectedOption,
          optionASuboption: selectedOption === 'OPTION_A' ? optionASuboption ?? undefined : undefined,
          comment: comment.trim() || undefined,
          signatureImage,
          gpsLatitude: locationResult.coords?.latitude,
          gpsLongitude: locationResult.coords?.longitude
        }
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit attestation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    selectedOption &&
    (selectedOption === 'OPTION_B' || (selectedOption === 'OPTION_A' && optionASuboption)) &&
    hasSigned &&
    !isSubmitting;

  return (
    <Modal
      title="Meal Period Attestation"
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={!isSubmitting}
      size="lg"
    >
      <div className="space-y-6">
        {/* Notice */}
        <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4">
          <p className="text-amber-200 text-sm">
            Your meal period was <span className="font-semibold">{lunchDurationMinutes} minutes</span>,
            which is <span className="font-semibold">{shortByMinutes} minutes short</span> of
            the required {requiredMinutes} minutes. Please select the statement that best describes your situation.
          </p>
        </div>

        {/* Option A */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer transition-colors">
            <input
              type="radio"
              name="attestation"
              value="OPTION_A"
              checked={selectedOption === 'OPTION_A'}
              onChange={() => {
                setSelectedOption('OPTION_A');
                setOptionASuboption(null);
              }}
              className="mt-1"
            />
            <div>
              <span className="font-medium text-slate-100">Option A</span>
              <p className="text-sm text-slate-400 mt-1">
                I was provided the opportunity for a full, timely, uninterrupted 30-minute meal period.
              </p>
            </div>
          </label>

          {/* Option A sub-options */}
          {selectedOption === 'OPTION_A' && (
            <div className="ml-8 space-y-2">
              {OPTION_A_SUBOPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="optionA_sub"
                    value={opt.value}
                    checked={optionASuboption === opt.value}
                    onChange={() => setOptionASuboption(opt.value)}
                  />
                  <span className="text-sm text-slate-200">{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Option B */}
        <label className="flex items-start gap-3 p-4 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer transition-colors">
          <input
            type="radio"
            name="attestation"
            value="OPTION_B"
            checked={selectedOption === 'OPTION_B'}
            onChange={() => {
              setSelectedOption('OPTION_B');
              setOptionASuboption(null);
            }}
            className="mt-1"
          />
          <div>
            <span className="font-medium text-slate-100">Option B</span>
            <p className="text-sm text-slate-400 mt-1">
              I was NOT provided the opportunity for a full, timely, uninterrupted 30-minute meal period.
            </p>
          </div>
        </label>

        {/* Comment (optional, but recommended for Option B) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Additional Comments {selectedOption === 'OPTION_B' && <span className="text-amber-400">(recommended)</span>}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Please explain the circumstances..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 resize-none"
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
            {isSubmitting ? 'Submitting...' : 'Submit Attestation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
