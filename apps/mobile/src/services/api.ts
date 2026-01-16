const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ApiResponse<T> = {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: string;
};

export type TimeEntry = {
  id: string;
  action_type: string;
  recorded_at: string;
  comment: string | null;
  resolved_address: string | null;
};

export type LoginResponse = {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    type: 'EMPLOYEE';
    name: string;
    initials?: string;
  };
  pendingCertification?: {
    workDate: string;
    entries: Array<{
      id: string;
      work_date: string;
      action_type: string;
      recorded_at: string;
    }>;
    summary: unknown;
  } | null;
};

async function apiRequest<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<ApiResponse<T>> {
  const { token, ...fetchOptions } = options ?? {};

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers ?? {}),
  };

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    return {
      status: 'error',
      message: 'Network error. Please check your connection.',
    };
  }
}

export async function registerPushToken(token: string, platform: 'ios' | 'android' | 'web') {
  return apiRequest('/api/push-tokens', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}

export async function sendPunchBatch(
  punches: Array<{ actionType: string; recordedAt: string; comment?: string }>,
  authToken: string
) {
  return apiRequest('/api/punch/batch', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ punches }),
  });
}

export async function loginEmployee(
  initials: string,
  pin: string
): Promise<ApiResponse<LoginResponse>> {
  return apiRequest<LoginResponse>('/api/auth/employee/login', {
    method: 'POST',
    body: JSON.stringify({ initials, pin }),
  });
}

export async function logout(token: string) {
  return apiRequest('/api/auth/logout', {
    method: 'POST',
    token,
  });
}

export async function getTodayEntries(token: string): Promise<ApiResponse<TimeEntry[]>> {
  const today = new Date().toISOString().split('T')[0];
  return apiRequest<TimeEntry[]>(`/api/punch?date=${today}`, {
    method: 'GET',
    token,
  });
}

export async function recordPunch(
  token: string,
  actionType: string,
  location?: { latitude: number; longitude: number }
): Promise<ApiResponse<TimeEntry>> {
  return apiRequest<TimeEntry>('/api/punch', {
    method: 'POST',
    token,
    body: JSON.stringify({
      actionType,
      latitude: location?.latitude,
      longitude: location?.longitude,
    }),
  });
}

export async function getEntryHistory(
  token: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<{ entries: TimeEntry[]; hasMore: boolean }>> {
  return apiRequest<{ entries: TimeEntry[]; hasMore: boolean }>(
    `/api/punch/history?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      token,
    }
  );
}

export async function certifyDay(
  token: string,
  workDate: string
): Promise<ApiResponse<void>> {
  return apiRequest<void>('/api/certifications', {
    method: 'POST',
    token,
    body: JSON.stringify({ workDate }),
  });
}

export async function refreshToken(
  token: string
): Promise<ApiResponse<LoginResponse>> {
  return apiRequest<LoginResponse>('/api/auth/refresh', {
    method: 'POST',
    token,
  });
}
