import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes';
import { config } from './config';
import { globalRateLimiter, loginRateLimiter } from './middleware/rateLimiter';
import { csrfProtection, getCsrfToken, invalidCsrfTokenError } from './middleware/csrf';
import { ApiError } from './errors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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

// Apply global rate limiting to all API endpoints (100 requests per 15 minutes per IP)
app.use('/api', globalRateLimiter);

// CSRF token endpoint (must be before CSRF protection)
// Both versioned and legacy paths for backwards compatibility
app.get('/api/csrf-token', getCsrfToken);      // Legacy (deprecated)
app.get('/api/v1/csrf-token', getCsrfToken);

// Apply CSRF protection to state-changing API requests
app.use('/api', csrfProtection);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
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

  // Log unexpected errors
  console.error('Unhandled error:', err);

  // Generic error response
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: config.nodeEnv === 'production' ? 'Internal server error' : err.message
  });
});

export default app;
