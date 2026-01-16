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
  const response = await apiRequest<{ status: string; data: PendingCertification | null }>(
    '/api/certification/pending',
    { token }
  );
  return response.data;
}

export async function certifyDay(
  payload: CertifyPayload,
  token: string
): Promise<DailySummary> {
  const response = await apiRequest<{ status: string; data: DailySummary }>(
    '/api/certification',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      token
    }
  );
  return response.data;
}
