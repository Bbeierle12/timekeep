import { useState } from 'react';
import Button from '../ui/Button';

type WaiverTextEditorProps = {
  mealWaiverText: string;
  attestationText: string;
  ccpaDisclosureText: string;
  onMealWaiverChange: (text: string) => void;
  onAttestationChange: (text: string) => void;
  onCCPADisclosureChange: (text: string) => void;
  onSave: () => Promise<void>;
};

const defaultMealWaiverText = `I voluntarily agree to waive my meal period for today. I understand that:

1. I have the right to a 30-minute uninterrupted meal period if I work more than 5 hours
2. I am waiving this meal period of my own free will
3. I can revoke this waiver at any time before or during my shift
4. My employer will provide me an opportunity to eat during my shift

By signing below, I acknowledge that I have read and understand this waiver.`;

const defaultAttestationText = `I certify that:

A) I was provided an opportunity to take all meal and rest breaks required by law, AND I took all such breaks without interruption or duty.

OR

B) I was provided an opportunity to take breaks but chose to voluntarily skip or shorten a break for personal reasons (not at the direction of my employer).

By signing below, I confirm that my selection above is true and accurate.`;

const defaultCCPAText = `California Consumer Privacy Act (CCPA) Location Tracking Notice

[Company Name] collects and uses your location data when you clock in and out. This data is used for:
- Verifying work location
- Ensuring compliance with labor laws
- Payroll and time tracking

Your data is retained for 4 years as required by California law. You have the right to request access to or deletion of your data.`;

export default function WaiverTextEditor({
  mealWaiverText,
  attestationText,
  ccpaDisclosureText,
  onMealWaiverChange,
  onAttestationChange,
  onCCPADisclosureChange,
  onSave,
}: WaiverTextEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'waiver' | 'attestation' | 'ccpa'>('waiver');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = (type: 'waiver' | 'attestation' | 'ccpa') => {
    if (!confirm('Reset to default text? This will overwrite your current text.')) return;

    switch (type) {
      case 'waiver':
        onMealWaiverChange(defaultMealWaiverText);
        break;
      case 'attestation':
        onAttestationChange(defaultAttestationText);
        break;
      case 'ccpa':
        onCCPADisclosureChange(defaultCCPAText);
        break;
    }
  };

  const tabs = [
    { id: 'waiver' as const, label: 'Meal Waiver', text: mealWaiverText, onChange: onMealWaiverChange },
    { id: 'attestation' as const, label: 'Daily Attestation', text: attestationText, onChange: onAttestationChange },
    { id: 'ccpa' as const, label: 'CCPA Disclosure', text: ccpaDisclosureText, onChange: onCCPADisclosureChange },
  ];

  const activeTabData = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-300">
            {activeTabData.label} Text
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReset(activeTab)}
          >
            Reset to Default
          </Button>
        </div>

        <textarea
          value={activeTabData.text}
          onChange={(e) => activeTabData.onChange(e.target.value)}
          rows={12}
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-y"
          placeholder={`Enter ${activeTabData.label.toLowerCase()} text...`}
        />

        <p className="mt-2 text-xs text-slate-500">
          {activeTab === 'waiver' && 'This text is shown when employees request to waive their meal period.'}
          {activeTab === 'attestation' && 'This text is shown during daily certification when employees attest to their breaks.'}
          {activeTab === 'ccpa' && 'This text is shown to employees when they first log in, explaining location tracking per CCPA requirements.'}
        </p>
      </div>

      {/* Preview */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Preview</h4>
        <div className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap">
          {activeTabData.text || <span className="text-slate-500 italic">No text entered</span>}
        </div>
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
