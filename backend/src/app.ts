import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { addRequestMetadata } from '@/middleware/auth';
import healthRoutes from '@/routes/health';
import apiRoutes from '@/routes/api';
import logger from '@/utils/logger';
import { performanceMiddleware } from '@/utils/performanceMonitor';

// Create Express application
const app = express();

// Trust proxy (for rate limiting and real IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request metadata middleware
app.use(addRequestMetadata);

// Performance monitoring middleware
app.use(performanceMiddleware);

// Request logging middleware
app.use((req, _res, next) => {
  logger.http(`${req.method} ${req.path}`, {
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
  });
  next();
});

// Health check routes
app.use('/health', healthRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'AI-Powered Venue Booking API',
    version: require('../package.json').version,
    environment: process.env['NODE_ENV'] || 'development',
    documentation: '/api-docs',
    health: '/health',
  });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  });

  // Don't expose error details in production
  const isDevelopment = process.env['NODE_ENV'] === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? err.message : 'An unexpected error occurred',
      details: isDevelopment ? { stack: err.stack } : undefined,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  });
});

export { app };