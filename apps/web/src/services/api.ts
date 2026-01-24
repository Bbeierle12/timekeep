export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export type ApiResponse<T> = {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: string;
};

export type PagedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
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

let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

export function resetCsrfToken() {
  csrfToken = null;
  csrfPromise = null;
}

async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    csrfPromise = fetch(`${API_BASE_URL}/api/v1/csrf-token`, {
      method: 'GET',
      credentials: 'include'
    })
      .then(async (response) => {
        const data = await response.json() as { csrfToken?: string };
        if (!response.ok || !data.csrfToken) {
          throw new Error('Failed to fetch CSRF token');
        }
        csrfToken = data.csrfToken;
        return data.csrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
}

function needsCsrfToken(method: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const fetchOptions = options ?? {};
  const method = (fetchOptions.method ?? 'GET').toString().toUpperCase();

  const headers = new Headers(fetchOptions.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (needsCsrfToken(method)) {
    const token = await fetchCsrfToken();
    headers.set('X-CSRF-Token', token);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'include'
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
