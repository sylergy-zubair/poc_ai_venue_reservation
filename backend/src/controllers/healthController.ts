import { Request, Response } from 'express';
import { HealthStatus, DetailedHealthStatus, ApiResponse, ServiceHealth, SystemHealth } from '@/types';
import logger from '@/utils/logger';

// Package version from package.json
const packageJson = require('../../package.json');

/**
 * Basic health check endpoint
 * Returns simple health status without sensitive information
 */
export const getHealth = (req: Request, res: Response): void => {
  try {
    const uptime = process.uptime();
    
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      uptime,
      environment: process.env.NODE_ENV || 'development',
    };
    
    logger.debug('Health check requested', {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      uptime,
    });
    
    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId: req.requestId,
    });
    
    const errorResponse: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
    
    res.status(503).json(errorResponse);
  }
};

/**
 * Detailed health check endpoint
 * Returns comprehensive system health information
 * Requires API key authentication
 */
export const getDetailedHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Check all services in parallel
    const [databaseHealth, ollamaHealth, venueProvidersHealth, systemHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkOllamaHealth(),
      checkVenueProvidersHealth(),
      getSystemHealth(),
    ]);
    
    // Determine overall health status
    const services = {
      database: databaseHealth,
      ollamaLlm: ollamaHealth,
      venueProviders: venueProvidersHealth,
    };
    
    const overallStatus = determineOverallStatus(services);
    
    const detailedHealth: DetailedHealthStatus = {
      status: overallStatus,
      overall: overallStatus,
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services,
      system: systemHealth,
    };
    
    const processingTime = Date.now() - startTime;
    
    logger.info('Detailed health check completed', {
      requestId: req.requestId,
      apiKey: req.apiKey,
      processingTime,
      overallStatus,
      serviceStatuses: {
        database: databaseHealth.status,
        ollamaLlm: ollamaHealth.status,
        venueProviders: venueProvidersHealth.status,
      },
    });
    
    res.status(200).json(detailedHealth);
  } catch (error) {
    logger.error('Detailed health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId: req.requestId,
    });
    
    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Unable to perform detailed health check',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    };
    
    res.status(503).json(errorResponse);
  }
};

/**
 * Check database connectivity and performance
 */
async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // This would typically ping the database
    // For now, we'll simulate a database check
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate DB latency
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      details: {
        connection: 'active',
        collections: 4,
        lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      responseTime,
      details: {
        error: error instanceof Error ? error.message : 'Database connection failed',
      },
    };
  }
}

/**
 * Check Ollama LLM connectivity and model availability
 */
async function checkOllamaHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const ollamaUrl = process.env['OLLAMA_API_URL'] || 'http://localhost:11434';
    
    // Check basic connectivity
    const healthResponse = await fetch(`${ollamaUrl}/api/health`);
    if (!healthResponse.ok) {
      throw new Error(`Ollama health check failed: ${healthResponse.status}`);
    }
    
    // Check model availability
    const tagsResponse = await fetch(`${ollamaUrl}/api/tags`);
    if (!tagsResponse.ok) {
      throw new Error(`Failed to fetch Ollama models: ${tagsResponse.status}`);
    }
    
    const tagsData = await tagsResponse.json() as any;
    const models = tagsData.models || [];
    const modelName = 'llama3.1:8b';
    const modelAvailable = models.some((model: any) => model.name === modelName);
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: modelAvailable ? 'healthy' : 'degraded',
      responseTime,
      details: {
        model: modelName,
        modelAvailable,
        totalModels: models.length,
        apiUrl: ollamaUrl,
        models: models.map((m: any) => m.name).slice(0, 5), // Show first 5 models
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      responseTime,
      details: {
        error: error instanceof Error ? error.message : 'Ollama service unavailable',
        model: 'llama3.1:8b',
        apiUrl: process.env['OLLAMA_API_URL'] || 'http://localhost:11434',
      },
    };
  }
}

/**
 * Check venue provider APIs health
 */
async function checkVenueProvidersHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // This would typically check multiple venue provider APIs
    // For now, we'll simulate the checks
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API latency
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'degraded', // Some providers might be down
      responseTime,
      details: {
        MeetingPackage: {
          status: 'healthy',
          responseTime: 120,
        },
        iVvy: {
          status: 'unhealthy',
          responseTime: 0,
          error: 'Connection timeout',
        },
        EventUp: {
          status: 'healthy',
          responseTime: 80,
        },
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      responseTime,
      details: {
        error: error instanceof Error ? error.message : 'Venue providers unavailable',
      },
    };
  }
}

/**
 * Get system resource usage
 */
async function getSystemHealth(): Promise<SystemHealth> {
  const memUsage = process.memoryUsage();
  
  return {
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
    cpu: {
      usage: Math.round(Math.random() * 30 + 10), // Simulate CPU usage between 10-40%
    },
  };
}

/**
 * Determine overall system health based on service statuses
 */
function determineOverallStatus(services: Record<string, ServiceHealth>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map(service => service.status);
  
  if (statuses.every(status => status === 'healthy')) {
    return 'healthy';
  }
  
  if (statuses.some(status => status === 'unhealthy')) {
    return 'unhealthy';
  }
  
  return 'degraded';
}