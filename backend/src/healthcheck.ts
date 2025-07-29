/**
 * Standalone health check script for Docker health checks
 * This script makes a simple HTTP request to the health endpoint
 * and exits with appropriate status codes
 */

import http from 'http';

const healthCheck = (): void => {
  const port = process.env.PORT || 3001;
  const timeout = 3000; // 3 seconds timeout
  
  const options = {
    hostname: 'localhost',
    port,
    path: '/health',
    method: 'GET',
    timeout,
  };

  const request = http.request(options, (response) => {
    if (response.statusCode === 200) {
      console.log('Health check passed');
      process.exit(0);
    } else {
      console.error(`Health check failed with status ${response.statusCode}`);
      process.exit(1);
    }
  });

  request.on('error', (error) => {
    console.error('Health check request failed:', error.message);
    process.exit(1);
  });

  request.on('timeout', () => {
    console.error('Health check timed out');
    request.destroy();
    process.exit(1);
  });

  request.end();
};

// Run health check
healthCheck();