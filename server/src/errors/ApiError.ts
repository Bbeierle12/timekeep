/**
 * Base class for all API errors.
 * Provides consistent error response format across the application.
 *
 * Response format:
 * {
 *   status: 'error',
 *   code: string,      // Machine-readable error code (e.g., 'INVALID_CREDENTIALS')
 *   message: string,   // Human-readable message
 *   details?: unknown  // Optional additional context
 * }
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to JSON response format
   */
  toJSON() {
    const response: {
      status: 'error';
      code: string;
      message: string;
      details?: unknown;
    } = {
      status: 'error',
      code: this.code,
      message: this.message
    };

    if (this.details !== undefined) {
      response.details = this.details;
    }

    return response;
  }

  // Common error factory methods
  static badRequest(code: string, message: string, details?: unknown) {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(code: string = 'UNAUTHORIZED', message: string = 'Authentication required') {
    return new ApiError(401, code, message);
  }

  static forbidden(code: string = 'FORBIDDEN', message: string = 'Access denied') {
    return new ApiError(403, code, message);
  }

  static notFound(code: string = 'NOT_FOUND', message: string = 'Resource not found') {
    return new ApiError(404, code, message);
  }

  static conflict(code: string, message: string, details?: unknown) {
    return new ApiError(409, code, message, details);
  }

  static tooManyRequests(code: string = 'RATE_LIMITED', message: string, retryAfter?: number) {
    return new ApiError(429, code, message, retryAfter ? { retryAfter } : undefined);
  }

  static internal(message: string = 'Internal server error') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
