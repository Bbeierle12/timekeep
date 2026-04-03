import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes';
import { config } from './config';
import { globalRateLimiter, loginRateLimiter, createRateLimiter } from './middleware/rateLimiter';
import { csrfProtection, getCsrfToken, invalidCsrfTokenError } from './middleware/csrf';
import { requestIdMiddleware } from './middleware/requestId';
import { pool } from './db/connection';
import { logger } from './utils/logger';
import { Sentry } from './utils/sentry';
import { ApiError } from './errors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust the first proxy (Railway, Render, etc.) so req.ip reflects the real client IP
// instead of the proxy's IP. This is critical for accurate rate limiting.
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Assign a unique request ID to every request for tracing
app.use(requestIdMiddleware);

// Security headers via helmet
app.use(helmet({
  // Content Security Policy - allow serving the frontend SPA
  contentSecurityPolicy: config.nodeEnv === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
    }
  } : false,
  // X-Frame-Options: DENY
  frameguard: { action: 'deny' },
  // Strict-Transport-Security - only in production with HTTPS
  hsts: config.nodeEnv === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false,
  // X-Content-Type-Options: nosniff
  noSniff: true,
  // Referrer-Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // X-XSS-Protection - modern browsers ignore this, but doesn't hurt
  xssFilter: true
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else if (config.nodeEnv === 'development') {
      // Allow all origins in development
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Apply stricter rate limiting to login endpoints (20 requests per 15 minutes per IP)
// Both versioned (/api/v1) and legacy (/api) paths need coverage
app.use('/api/auth/employee/login', loginRateLimiter);  // Legacy (deprecated)
app.use('/api/auth/admin/login', loginRateLimiter);     // Legacy (deprecated)
app.use('/api/v1/auth/employee/login', loginRateLimiter);
app.use('/api/v1/auth/admin/login', loginRateLimiter);
app.use('/api/v1/auth/admin/login/mfa', loginRateLimiter);

// Strict rate limiting for password reset endpoints (5 requests per hour per IP)
const passwordResetLimiter = createRateLimiter(5, 60 * 60 * 1000);
app.use('/api/auth/admin/forgot-password', passwordResetLimiter);
app.use('/api/auth/admin/reset-password', passwordResetLimiter);
app.use('/api/auth/admin/validate-reset-token', passwordResetLimiter);
app.use('/api/v1/auth/admin/forgot-password', passwordResetLimiter);
app.use('/api/v1/auth/admin/reset-password', passwordResetLimiter);
app.use('/api/v1/auth/admin/validate-reset-token', passwordResetLimiter);

// Apply global rate limiting to all API endpoints (100 requests per 15 minutes per IP)
app.use('/api', globalRateLimiter);

// CSRF token endpoint (must be before CSRF protection)
// Both versioned and legacy paths for backwards compatibility
app.get('/api/csrf-token', getCsrfToken);      // Legacy (deprecated)
app.get('/api/v1/csrf-token', getCsrfToken);

// Apply CSRF protection to state-changing API requests
app.use('/api', csrfProtection);

app.get('/health', async (_req, res) => {
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbLatencyMs = Date.now() - dbStart;

    res.json({
      status: 'ok',
      dependencies: {
        database: { status: 'ok', latencyMs: dbLatencyMs }
      },
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      dependencies: {
        database: { status: 'error', message: (err as Error).message }
      }
    });
  }
});

app.use('/api', routes);

// --- Serve frontend static files in production ---
const clientDistPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientDistPath));

// SPA fallback: serve index.html for any non-API route
app.get('*', (req, res, next) => {
  // Don't serve index.html for API routes or health check
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) next(); // If file doesn't exist, fall through
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Handle CSRF errors
  if (err === invalidCsrfTokenError) {
    res.status(403).json({
      status: 'error',
      code: 'CSRF_ERROR',
      message: 'Invalid or missing CSRF token'
    });
    return;
  }

  // Handle ApiError instances with consistent format
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Report to Sentry with request context
  Sentry.captureException(err, {
    extra: { requestId: _req.requestId, method: _req.method, path: _req.path }
  });

  // Log unexpected errors with request context
  logger.error('Unhandled error', {
    requestId: _req.requestId,
    method: _req.method,
    path: _req.path,
    error: err.message,
    stack: config.nodeEnv !== 'production' ? err.stack : undefined
  });

  // Generic error response
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: config.nodeEnv === 'production' ? 'Internal server error' : err.message
  });
});

export default app;
