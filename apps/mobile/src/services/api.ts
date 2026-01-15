const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

type ApiResponse<T> = {
  status: 'success' | 'error';
  data?: T;
  message?: string;
};

async function apiRequest<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options
  });

  return response.json();
}

export async function registerPushToken(token: string, platform: 'ios' | 'android' | 'web') {
  return apiRequest('/api/push-tokens', {
    method: 'POST',
    body: JSON.stringify({ token, platform })
  });
}

export async function sendPunchBatch(
  punches: Array<{ actionType: string; recordedAt: string; comment?: string }>,
  authToken: string
) {
  return apiRequest('/api/punch/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ punches })
  });
}
