import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { config } from './config';
import { globalRateLimiter, loginRateLimiter } from './middleware/rateLimiter';
import { csrfProtection, getCsrfToken, invalidCsrfTokenError } from './middleware/csrf';

const app = express();

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
app.use('/api/auth/login', loginRateLimiter);

// Apply global rate limiting to all API endpoints (100 requests per 15 minutes per IP)
app.use('/api', globalRateLimiter);

// CSRF token endpoint (must be before CSRF protection)
app.get('/api/csrf-token', getCsrfToken);

// Apply CSRF protection to state-changing API requests
app.use('/api', csrfProtection);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

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

  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: config.nodeEnv === 'production' ? 'Internal server error' : err.message
  });
});

export default app;
