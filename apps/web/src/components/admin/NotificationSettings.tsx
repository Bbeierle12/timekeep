import { useState } from 'react';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import Input from '../ui/Input';

type NotificationChannel = 'email' | 'sms' | 'push';

type NotificationEvent =
  | 'lunch_violation'
  | 'break_violation'
  | 'overtime_approaching'
  | 'overtime_exceeded'
  | 'missed_punch'
  | 'geofence_violation'
  | 'waiver_signed'
  | 'attestation_issue'
  | 'correction_requested';

type NotificationConfig = {
  event: NotificationEvent;
  realtime: boolean;
  digest: boolean;
  channels: NotificationChannel[];
};

type DigestSchedule = {
  enabled: boolean;
  time: string; // HH:mm format
  days: number[]; // 0-6 for Sunday-Saturday
};

type NotificationSettingsProps = {
  notifications: NotificationConfig[];
  digestSchedule: DigestSchedule;
  recipientEmails: string[];
  onNotificationChange: (event: NotificationEvent, config: Partial<NotificationConfig>) => void;
  onDigestScheduleChange: (schedule: DigestSchedule) => void;
  onRecipientsChange: (emails: string[]) => void;
  onSave: () => Promise<void>;
};

const eventLabels: Record<NotificationEvent, { label: string; description: string }> = {
  lunch_violation: {
    label: 'Lunch Violations',
    description: 'When an employee takes lunch late or short',
  },
  break_violation: {
    label: 'Break Violations',
    description: 'When an employee misses or skips a required break',
  },
  overtime_approaching: {
    label: 'Overtime Approaching',
    description: 'When an employee is approaching overtime threshold',
  },
  overtime_exceeded: {
    label: 'Overtime Exceeded',
    description: 'When an employee works unauthorized overtime',
  },
  missed_punch: {
    label: 'Missed Punches',
    description: 'When an employee forgets to clock in or out',
  },
  geofence_violation: {
    label: 'Location Violations',
    description: 'When an employee punches outside approved areas',
  },
  waiver_signed: {
    label: 'Waivers Signed',
    description: 'When an employee signs a meal waiver',
  },
  attestation_issue: {
    label: 'Attestation Issues',
    description: 'When an employee reports a break/meal issue',
  },
  correction_requested: {
    label: 'Correction Requests',
    description: 'When an employee requests a time correction',
  },
};

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function NotificationSettings({
  notifications,
  digestSchedule,
  recipientEmails,
  onNotificationChange,
  onDigestScheduleChange,
  onRecipientsChange,
  onSave,
}: NotificationSettingsProps) {
  const [newEmail, setNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (email && !recipientEmails.includes(email)) {
      onRecipientsChange([...recipientEmails, email]);
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    onRecipientsChange(recipientEmails.filter((e) => e !== email));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    const days = digestSchedule.days.includes(day)
      ? digestSchedule.days.filter((d) => d !== day)
      : [...digestSchedule.days, day].sort();
    onDigestScheduleChange({ ...digestSchedule, days });
  };

  return (
    <div className="space-y-6">
      {/* Recipients */}
      <div className="p-4 bg-slate-800 rounded-lg">
        <h4 className="font-medium text-slate-100 mb-3">Notification Recipients</h4>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="manager@company.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
              className="flex-1"
            />
            <Button onClick={handleAddEmail}>Add</Button>
          </div>
          {recipientEmails.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recipientEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 rounded-full text-sm"
                >
                  {email}
                  <button
                    onClick={() => handleRemoveEmail(email)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No recipients configured</p>
          )}
        </div>
      </div>

      {/* Event Configuration */}
      <div className="p-4 bg-slate-800 rounded-lg">
        <h4 className="font-medium text-slate-100 mb-3">Alert Configuration</h4>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-4 pb-2 border-b border-slate-700 text-sm font-medium text-slate-400">
            <div>Event</div>
            <div className="text-center">Real-time</div>
            <div className="text-center">Daily Digest</div>
            <div className="text-center">Channels</div>
          </div>
          {notifications.map((config) => {
            const eventInfo = eventLabels[config.event];
            return (
              <div key={config.event} className="grid grid-cols-4 gap-4 items-center py-2">
                <div>
                  <div className="font-medium text-slate-100 text-sm">{eventInfo.label}</div>
                  <div className="text-xs text-slate-500">{eventInfo.description}</div>
                </div>
                <div className="flex justify-center">
                  <Checkbox
                    checked={config.realtime}
                    onChange={(e) =>
                      onNotificationChange(config.event, { realtime: e.target.checked })
                    }
                    label={
                      <span className="sr-only">
                        Enable real-time alerts for {eventInfo.label}
                      </span>
                    }
                  />
                </div>
                <div className="flex justify-center">
                  <Checkbox
                    checked={config.digest}
                    onChange={(e) =>
                      onNotificationChange(config.event, { digest: e.target.checked })
                    }
                    label={
                      <span className="sr-only">
                        Enable daily digest for {eventInfo.label}
                      </span>
                    }
                  />
                </div>
                <div className="flex justify-center gap-2">
                  {(['email', 'push'] as NotificationChannel[]).map((channel) => (
                    <button
                      key={channel}
                      onClick={() => {
                        const channels = config.channels.includes(channel)
                          ? config.channels.filter((c) => c !== channel)
                          : [...config.channels, channel];
                        onNotificationChange(config.event, { channels });
                      }}
                      className={`px-2 py-1 text-xs rounded ${
                        config.channels.includes(channel)
                          ? 'bg-sky-500/30 text-sky-400'
                          : 'bg-slate-700 text-slate-500'
                      }`}
                      title={channel === 'email' ? 'Email' : 'Push Notification'}
                    >
                      {channel === 'email' ? '✉️' : '🔔'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Digest Schedule */}
      <div className="p-4 bg-slate-800 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-slate-100">Daily Digest</h4>
            <p className="text-sm text-slate-400">Summary of all events at end of day</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={digestSchedule.enabled}
              onChange={(e) =>
                onDigestScheduleChange({ ...digestSchedule, enabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
          </label>
        </div>

        {digestSchedule.enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Send Time</label>
              <input
                type="time"
                value={digestSchedule.time}
                onChange={(e) =>
                  onDigestScheduleChange({ ...digestSchedule, time: e.target.value })
                }
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Days</label>
              <div className="flex gap-2">
                {dayLabels.map((label, index) => (
                  <button
                    key={index}
                    onClick={() => toggleDay(index)}
                    className={`w-10 h-10 rounded-full text-sm font-medium ${
                      digestSchedule.days.includes(index)
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
