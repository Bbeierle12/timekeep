import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import routes from './routes';
import { config } from './config';
import { rateLimiter } from './middleware/rateLimiter';

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

// Apply rate limiting to auth routes
app.use('/api/auth', rateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: config.nodeEnv === 'production' ? 'Internal server error' : err.message
  });
});

export default app;
