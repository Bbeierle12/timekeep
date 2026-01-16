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

export async function fetchPendingCertification(
  token: string
): Promise<PendingCertification | null> {
  return apiRequest<PendingCertification | null>('/api/certification/pending', { token });
}

export async function certifyDay(
  payload: CertifyPayload,
  token: string
): Promise<DailySummary> {
  return apiRequest<DailySummary>('/api/certification', {
    method: 'POST',
    body: JSON.stringify(payload),
    token
  });
}
