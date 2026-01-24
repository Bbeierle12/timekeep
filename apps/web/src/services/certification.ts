import { apiRequest } from './api';
import type { DailySummary, TimeEntry } from './timeEntries';

export type PendingCertification = {
  workDate: string;
  summary: DailySummary;
  entries: TimeEntry[];
  hasViolation: boolean;
  violationType: string | null;
  requiresAttestation: boolean;
};

export type CertifyPayload = {
  workDate?: string;
  comment?: string;
  requestCorrection?: boolean;
  correctionNote?: string;
};

export async function fetchPendingCertification(): Promise<PendingCertification | null> {
  return apiRequest<PendingCertification | null>('/api/v1/certifications/pending');
}

export async function certifyDay(
  payload: CertifyPayload
): Promise<DailySummary> {
  return apiRequest<DailySummary>('/api/v1/certifications', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
