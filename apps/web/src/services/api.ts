export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export type ApiResponse<T> = {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...fetchOptions } = options ?? {};

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...fetchOptions.headers
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers
  });

  const data = await response.json() as ApiResponse<T>;

  if (!response.ok || data.status === 'error') {
    throw new ApiError(
      data.message ?? `Request failed: ${response.status}`,
      response.status,
      data.code
    );
  }

  return data.data as T;
}

// Helper for authenticated requests
export function createAuthenticatedRequest(token: string) {
  return <T>(path: string, options?: RequestInit) =>
    apiRequest<T>(path, { ...options, token });
}
