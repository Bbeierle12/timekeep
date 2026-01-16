import { API_BASE_URL } from './api';

export type ReportType = 'payroll' | 'timesheet' | 'violations' | 'waivers';

export type DateRange = {
  start: string;
  end: string;
};

export async function downloadReport(
  type: ReportType,
  range: DateRange,
  token: string
): Promise<Blob> {
  const url = `${API_BASE_URL}/api/admin/reports/${type}?start=${range.start}&end=${range.end}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Download failed' }));
    throw new Error(error.message || 'Failed to download report');
  }

  return response.blob();
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function downloadAndSaveReport(
  type: ReportType,
  range: DateRange,
  token: string
): Promise<void> {
  const blob = await downloadReport(type, range, token);
  const filename = `${type}_${range.start}_${range.end}.csv`;
  triggerDownload(blob, filename);
}
