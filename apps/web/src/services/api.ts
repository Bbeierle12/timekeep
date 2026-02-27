// When hosted on the same origin, use '' so requests go to the same server.
// Override with VITE_API_URL for local dev or split deployments.
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRY_DELAY_MS = 300;
const DEFAULT_RETRIES = 1;

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

export type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

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

function isIdempotentMethod(method: string) {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createAbortSignal(timeoutMs: number, upstream?: AbortSignal | null) {
  const controller = new AbortController();
  let didTimeout = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let onAbort: (() => void) | null = null;

  if (upstream) {
    if (upstream.aborted) {
      controller.abort();
    } else {
      onAbort = () => controller.abort();
      upstream.addEventListener('abort', onAbort, { once: true });
    }
  }

  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);
  }

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (upstream && onAbort) {
      upstream.removeEventListener('abort', onAbort);
    }
  };

  return { signal: controller.signal, cleanup, didTimeout: () => didTimeout };
}

export async function apiRequest<T>(
  path: string,
  options?: ApiRequestOptions
): Promise<T> {
  const {
    timeoutMs,
    retries,
    retryDelayMs,
    ...fetchOptions
  } = options ?? {};
  const method = (fetchOptions.method ?? 'GET').toString().toUpperCase();

  const headers = new Headers(fetchOptions.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (needsCsrfToken(method)) {
    const token = await fetchCsrfToken();
    headers.set('X-CSRF-Token', token);
  }

  const maxRetries = retries ?? (isIdempotentMethod(method) ? DEFAULT_RETRIES : 0);
  const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryDelay = retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  let attempt = 0;
  while (true) {
    const { signal, cleanup, didTimeout } = createAbortSignal(timeout, fetchOptions.signal);
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...fetchOptions,
        headers,
        credentials: 'include',
        signal
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
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      if (isAbortError) {
        if (didTimeout()) {
          throw new ApiError('Request timed out', 408);
        }
        throw error;
      }

      if (error instanceof ApiError || attempt >= maxRetries || !isIdempotentMethod(method)) {
        throw error;
      }

      attempt += 1;
      await delay(retryDelay * attempt);
    } finally {
      cleanup();
    }
  }
}
