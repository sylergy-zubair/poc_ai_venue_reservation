import dotenv from 'dotenv';
import { app } from './app';
import logger from '@/utils/logger';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Graceful shutdown handler
const gracefulShutdown = (signal: string): void => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  process.exit(0);
};

// Start server
const server = app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: NODE_ENV,
    version: require('../package.json').version,
    timestamp: new Date().toISOString(),
  });
  
  // Log available endpoints
  logger.info('Available endpoints:', {
    health: `http://localhost:${PORT}/health`,
    detailedHealth: `http://localhost:${PORT}/health/detailed`,
    root: `http://localhost:${PORT}/`,
  });
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      logger.error('Server error', { error: error.message, stack: error.stack });
      throw error;
  }
});

// Graceful shutdown on SIGTERM and SIGINT
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  
  // Exit gracefully
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise: promise.toString(),
  });
  
  // Don't exit on unhandled rejections in production
  if (NODE_ENV !== 'production') {
    process.exit(1);
  }
});

export { server };