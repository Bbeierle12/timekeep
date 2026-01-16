import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { ReminderStage } from '../../hooks/useReminders';

type LunchWarningModalProps = {
  isOpen: boolean;
  stage: ReminderStage;
  minutesUntilDeadline: number;
  onDismiss: () => void;
  onTakeLunch: () => void;
  onSignWaiver?: () => void;
};

const STAGE_CONFIG = {
  stage1: {
    title: 'Lunch Reminder',
    icon: (
      <svg className="w-12 h-12 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    severity: 'info' as const,
    primaryColor: 'sky'
  },
  stage2: {
    title: 'Lunch Break Required Soon',
    icon: (
      <svg className="w-12 h-12 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    severity: 'warning' as const,
    primaryColor: 'amber'
  },
  stage3: {
    title: 'Urgent: Meal Break Required',
    icon: (
      <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    severity: 'urgent' as const,
    primaryColor: 'red'
  }
};

export default function LunchWarningModal({
  isOpen,
  stage,
  minutesUntilDeadline,
  onDismiss,
  onTakeLunch,
  onSignWaiver
}: LunchWarningModalProps) {
  if (!stage) return null;

  const config = STAGE_CONFIG[stage];
  const minutesRemaining = Math.max(0, minutesUntilDeadline);

  const getMessage = () => {
    switch (stage) {
      case 'stage1':
        return (
          <>
            <p className="text-slate-300 mb-2">
              You've been working for <span className="font-semibold text-slate-100">3.5 hours</span>.
            </p>
            <p className="text-slate-400 text-sm">
              California labor law requires a 30-minute meal break before the 5th hour of work.
              You have approximately <span className="font-medium text-slate-200">{minutesRemaining} minutes</span> remaining.
            </p>
          </>
        );
      case 'stage2':
        return (
          <>
            <p className="text-slate-300 mb-2">
              You've been working for <span className="font-semibold text-amber-300">4 hours</span>.
            </p>
            <p className="text-slate-400 text-sm">
              Please take your meal break soon. You must begin your lunch within{' '}
              <span className="font-medium text-amber-200">{minutesRemaining} minutes</span> to remain compliant.
            </p>
          </>
        );
      case 'stage3':
        return (
          <>
            <p className="text-slate-300 mb-2">
              You've been working for <span className="font-semibold text-red-300">4.5 hours</span>.
            </p>
            <p className="text-slate-400 text-sm mb-4">
              Your meal break is due in <span className="font-medium text-red-200">{minutesRemaining} minutes</span>.
              Please take your lunch break now or sign a meal waiver if you choose to skip it.
            </p>
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-sm text-red-200">
              If you do not take a lunch break before 5 hours, you will need to sign a waiver.
            </div>
          </>
        );
    }
  };

  const severityClasses = {
    info: 'border-sky-500/30',
    warning: 'border-amber-500/30',
    urgent: 'border-red-500/30'
  };

  return (
    <Modal
      title={config.title}
      isOpen={isOpen}
      onClose={onDismiss}
      showCloseButton={stage !== 'stage3'}
      size="md"
    >
      <div className={`border-t ${severityClasses[config.severity]} -mx-6 px-6 pt-4`}>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">{config.icon}</div>
          <div className="mb-6">{getMessage()}</div>

          <div className="flex flex-col w-full gap-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={onTakeLunch}
            >
              Take Lunch Now
            </Button>

            {stage === 'stage3' && onSignWaiver && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={onSignWaiver}
              >
                Sign Meal Waiver
              </Button>
            )}

            {stage !== 'stage3' && (
              <Button
                variant="ghost"
                className="w-full text-slate-400"
                onClick={onDismiss}
              >
                Remind Me Later
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
