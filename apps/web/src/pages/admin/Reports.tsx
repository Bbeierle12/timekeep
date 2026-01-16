import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { downloadAndSaveReport, ReportType } from '../../services/reports';

type ReportConfig = {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const reports: ReportConfig[] = [
  {
    id: 'payroll',
    title: 'Payroll Report',
    description: 'Export employee hours, overtime, and earnings for payroll processing.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'timesheet',
    title: 'Timesheet Report',
    description: 'Detailed time entries including clock in/out, lunches, and breaks.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'violations',
    title: 'Violations Report',
    description: 'All compliance violations including meal and break infractions.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
  {
    id: 'waivers',
    title: 'Waivers Report',
    description: 'All signed meal waivers and attestations for compliance records.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }
];

export default function AdminReports() {
  const { token } = useAuth();
  const [dateRange, setDateRange] = useState({
    start: getDefaultStartDate(),
    end: new Date().toISOString().split('T')[0]
  });
  const [downloading, setDownloading] = useState<ReportType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (reportType: ReportType) => {
    if (!token) return;

    setDownloading(reportType);
    setError(null);

    try {
      await downloadAndSaveReport(reportType, dateRange, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download report');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <AdminLayout title="Reports" subtitle="Export data for payroll and compliance">
      {/* Date Range Selector */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">From:</label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">To:</label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-40"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                const { start, end } = getCurrentPayPeriod();
                setDateRange({ start, end });
              }}
            >
              Current Pay Period
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const { start, end } = getLastPayPeriod();
                setDateRange({ start, end });
              }}
            >
              Last Pay Period
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onDownload={() => handleDownload(report.id)}
            isDownloading={downloading === report.id}
          />
        ))}
      </div>

      {/* Info Section */}
      <Card className="mt-6 p-4">
        <h3 className="text-sm font-semibold text-white mb-2">Report Information</h3>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>All reports are exported in CSV format for easy import into spreadsheet software.</li>
          <li>Date ranges are inclusive of both start and end dates.</li>
          <li>Reports include all employees active during the selected period.</li>
        </ul>
      </Card>
    </AdminLayout>
  );
}

function ReportCard({
  report,
  onDownload,
  isDownloading
}: {
  report: ReportConfig;
  onDownload: () => void;
  isDownloading: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-slate-800 rounded-lg text-sky-400">
          {report.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{report.title}</h3>
          <p className="text-sm text-slate-400 mb-4">{report.description}</p>
          <Button
            onClick={onDownload}
            disabled={isDownloading}
            className="w-full sm:w-auto"
          >
            {isDownloading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Downloading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV
              </span>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Helper functions for pay period calculations (assuming bi-weekly starting Jan 1)
function getDefaultStartDate(): string {
  const today = new Date();
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  return twoWeeksAgo.toISOString().split('T')[0];
}

function getCurrentPayPeriod(): { start: string; end: string } {
  const today = new Date();
  const year = today.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const daysSinceStart = Math.floor((today.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const currentPeriod = Math.floor(daysSinceStart / 14);

  const periodStart = new Date(startOfYear.getTime() + currentPeriod * 14 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(periodStart.getTime() + 13 * 24 * 60 * 60 * 1000);

  return {
    start: periodStart.toISOString().split('T')[0],
    end: periodEnd.toISOString().split('T')[0]
  };
}

function getLastPayPeriod(): { start: string; end: string } {
  const current = getCurrentPayPeriod();
  const periodStart = new Date(current.start);
  periodStart.setDate(periodStart.getDate() - 14);
  const periodEnd = new Date(periodStart.getTime() + 13 * 24 * 60 * 60 * 1000);

  return {
    start: periodStart.toISOString().split('T')[0],
    end: periodEnd.toISOString().split('T')[0]
  };
}
