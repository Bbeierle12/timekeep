import { useState } from 'react';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';

type ExportFormat = 'csv' | 'excel' | 'pdf';

type ColumnConfig = {
  key: string;
  label: string;
  enabled: boolean;
  order: number;
};

type ExportSettingsConfig = {
  defaultFormat: ExportFormat;
  includeHeaders: boolean;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  timezone: string;
  decimalHours: boolean;
  columns: {
    payroll: ColumnConfig[];
    timesheet: ColumnConfig[];
    violations: ColumnConfig[];
  };
};

type ExportSettingsProps = {
  config: ExportSettingsConfig;
  onConfigChange: (config: Partial<ExportSettingsConfig>) => void;
  onSave: () => Promise<void>;
};

const formatOptions: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'csv', label: 'CSV', description: 'Comma-separated values, compatible with all spreadsheet software' },
  { value: 'excel', label: 'Excel', description: 'Microsoft Excel format (.xlsx) with formatting' },
  { value: 'pdf', label: 'PDF', description: 'Printable document format' },
];

const dateFormatOptions = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/15/2024)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (15/01/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-01-15)' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (Jan 15, 2024)' },
];

export default function ExportSettings({
  config,
  onConfigChange,
  onSave,
}: ExportSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'payroll' | 'timesheet' | 'violations'>('payroll');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleColumn = (reportType: 'payroll' | 'timesheet' | 'violations', key: string) => {
    const columns = config.columns[reportType].map((col) =>
      col.key === key ? { ...col, enabled: !col.enabled } : col
    );
    onConfigChange({
      columns: {
        ...config.columns,
        [reportType]: columns,
      },
    });
  };

  const moveColumn = (
    reportType: 'payroll' | 'timesheet' | 'violations',
    key: string,
    direction: 'up' | 'down'
  ) => {
    const columns = [...config.columns[reportType]];
    const index = columns.findIndex((col) => col.key === key);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === columns.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [columns[index], columns[newIndex]] = [columns[newIndex], columns[index]];

    // Update order values
    columns.forEach((col, i) => {
      col.order = i;
    });

    onConfigChange({
      columns: {
        ...config.columns,
        [reportType]: columns,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Default Format */}
      <div className="p-4 bg-slate-800 rounded-lg">
        <h4 className="font-medium text-slate-100 mb-3">Default Export Format</h4>
        <div className="space-y-2">
          {formatOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-start p-3 rounded-lg cursor-pointer transition-colors ${
                config.defaultFormat === option.value
                  ? 'bg-sky-500/20 border border-sky-500/50'
                  : 'bg-slate-700/50 hover:bg-slate-700'
              }`}
            >
              <input
                type="radio"
                name="export-format"
                value={option.value}
                checked={config.defaultFormat === option.value}
                onChange={() => onConfigChange({ defaultFormat: option.value })}
                className="mt-1 h-4 w-4 text-sky-500 focus:ring-sky-500 focus:ring-offset-0 bg-slate-900 border-slate-600"
              />
              <div className="ml-3">
                <span className="block font-medium text-slate-100">{option.label}</span>
                <span className="block text-sm text-slate-400">{option.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Format Options */}
      <div className="p-4 bg-slate-800 rounded-lg">
        <h4 className="font-medium text-slate-100 mb-4">Format Options</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Date Format</label>
            <select
              value={config.dateFormat}
              onChange={(e) => onConfigChange({ dateFormat: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
            >
              {dateFormatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Time Format</label>
            <select
              value={config.timeFormat}
              onChange={(e) => onConfigChange({ timeFormat: e.target.value as '12h' | '24h' })}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
            >
              <option value="12h">12-hour (2:30 PM)</option>
              <option value="24h">24-hour (14:30)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <Checkbox
            checked={config.includeHeaders}
            onChange={(e) => onConfigChange({ includeHeaders: e.target.checked })}
            label="Include column headers in export"
          />
          <Checkbox
            checked={config.decimalHours}
            onChange={(e) => onConfigChange({ decimalHours: e.target.checked })}
            label="Show hours as decimals (e.g., 8.5 instead of 8:30)"
          />
        </div>
      </div>

      {/* Column Configuration */}
      <div className="p-4 bg-slate-800 rounded-lg">
        <h4 className="font-medium text-slate-100 mb-4">Column Configuration</h4>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 mb-4">
          {(['payroll', 'timesheet', 'violations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Report
            </button>
          ))}
        </div>

        {/* Column List */}
        <div className="space-y-2">
          <p className="text-sm text-slate-500 mb-3">
            Enable/disable and reorder columns for the {activeTab} report
          </p>
          {config.columns[activeTab]
            .sort((a, b) => a.order - b.order)
            .map((column, index) => (
              <div
                key={column.key}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  column.enabled ? 'bg-slate-700/50' : 'bg-slate-700/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={column.enabled}
                    onChange={() => toggleColumn(activeTab, column.key)}
                    label={
                      <span className={column.enabled ? 'text-slate-100' : 'text-slate-500'}>
                        {column.label}
                      </span>
                    }
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveColumn(activeTab, column.key, 'up')}
                    disabled={index === 0}
                    className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveColumn(activeTab, column.key, 'down')}
                    disabled={index === config.columns[activeTab].length - 1}
                    className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
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
