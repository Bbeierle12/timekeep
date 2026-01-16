import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';

type CCPANoticeProps = {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  companyName?: string;
  disclosureText?: string;
};

const defaultDisclosureText = `We collect and use your location data for the following purposes:

1. **Time and Attendance Tracking**: Your location is recorded when you clock in, clock out, start/end breaks, and start/end meal periods to verify work location compliance.

2. **Compliance Verification**: Location data helps ensure compliance with California labor laws regarding meal and rest breaks, and helps verify that time entries are recorded from approved work locations.

3. **Data Retention**: Your location data is retained for the duration required by California labor law (minimum 4 years) and may be used for payroll, compliance audits, and dispute resolution.

4. **Data Access**: Your location data may be accessed by your employer's HR and management personnel for legitimate business purposes related to time tracking and compliance.

5. **Your Rights**: Under the California Consumer Privacy Act (CCPA), you have the right to:
   - Know what personal information is collected about you
   - Request deletion of your personal information (subject to legal retention requirements)
   - Opt-out of the sale of your personal information (we do not sell your data)
   - Non-discrimination for exercising your privacy rights

For questions about our data practices, please contact your HR department or privacy officer.`;

export default function CCPANotice({
  isOpen,
  onAccept,
  onDecline,
  companyName = 'Your Employer',
  disclosureText,
}: CCPANoticeProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
    if (isAtBottom) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (acknowledged) {
      onAccept();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing without action
      title="Location Tracking Notice"
      size="lg"
    >
      <div className="space-y-4">
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl text-sky-400">📍</div>
            <div>
              <h3 className="font-semibold text-sky-400">
                California Consumer Privacy Act (CCPA) Notice
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                {companyName} uses location tracking as part of its time and attendance system.
                Please review the information below.
              </p>
            </div>
          </div>
        </div>

        <div
          className="bg-slate-800 rounded-lg p-4 max-h-64 overflow-y-auto text-sm text-slate-300 space-y-3"
          onScroll={handleScroll}
        >
          {(disclosureText || defaultDisclosureText).split('\n\n').map((paragraph, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {paragraph.split('**').map((part, i) =>
                i % 2 === 1 ? (
                  <strong key={i} className="text-slate-100">{part}</strong>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </div>
          ))}
        </div>

        {!scrolledToBottom && (
          <p className="text-xs text-slate-500 text-center">
            Scroll down to read the complete notice
          </p>
        )}

        <div className="space-y-3">
          <Checkbox
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            disabled={!scrolledToBottom}
            label={
              <span className={!scrolledToBottom ? 'text-slate-500' : ''}>
                I have read and understand this notice. I consent to the collection and use of my
                location data as described above for time and attendance purposes.
              </span>
            }
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onDecline}
          >
            Decline
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleAccept}
            disabled={!acknowledged || !scrolledToBottom}
          >
            Accept & Continue
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Declining will prevent you from using the time clock. Contact your administrator if you have questions.
        </p>
      </div>
    </Modal>
  );
}
