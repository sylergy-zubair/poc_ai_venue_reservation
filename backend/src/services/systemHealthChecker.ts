/**
 * System Health Checker Service
 * Phase 4: Comprehensive health monitoring for all system components
 */

import { performanceMonitor } from '../utils/performanceMonitor';
import logger from '../utils/logger';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface HealthCheckResult {
  healthy: boolean;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  details?: any;
  responseTime?: number;
  timestamp: string;
}

export interface SystemHealthReport {
  overall: boolean;
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    database: HealthCheckResult;
    geminiApi: HealthCheckResult;
    venueApi: HealthCheckResult;
    memory: HealthCheckResult;
    disk: HealthCheckResult;
    performance: HealthCheckResult;
    dependencies: HealthCheckResult;
  };
  timestamp: string;
  uptime: number;
  version: string;
}

export class SystemHealthChecker {
  private readonly thresholds = {
    memory: {
      warning: 0.8, // 80% of available memory
      critical: 0.95 // 95% of available memory
    },
    disk: {
      warning: 0.85, // 85% disk usage
      critical: 0.95 // 95% disk usage
    },
    responseTime: {
      warning: 1000, // 1 second
      critical: 5000 // 5 seconds
    },
    errorRate: {
      warning: 0.05, // 5% error rate
      critical: 0.15 // 15% error rate
    }
  };

  /**
   * Perform all health checks
   */
  async checkAll(): Promise<SystemHealthReport> {
    logger.info('Starting comprehensive health check');

    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkGeminiApi(),
      this.checkVenueApi(),
      this.checkMemoryUsage(),
      this.checkDiskSpace(),
      this.checkPerformance(),
      this.checkDependencies()
    ]);

    const healthResults = {
      database: this.getResultFromSettled(checks[0]),
      geminiApi: this.getResultFromSettled(checks[1]),
      venueApi: this.getResultFromSettled(checks[2]),
      memory: this.getResultFromSettled(checks[3]),
      disk: this.getResultFromSettled(checks[4]),
      performance: this.getResultFromSettled(checks[5]),
      dependencies: this.getResultFromSettled(checks[6])
    };

    // Determine overall health status
    const statuses = Object.values(healthResults).map(result => result.status);
    const hasCritical = statuses.includes('critical');
    const hasWarning = statuses.includes('warning');
    
    const overallStatus = hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy';
    const overall = overallStatus === 'healthy';

    const report: SystemHealthReport = {
      overall,
      status: overallStatus,
      checks: healthResults,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0'
    };

    logger.info(`Health check completed - Overall status: ${overallStatus}`);
    return report;
  }

  /**
   * Check database connectivity and performance
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    const timerId = performanceMonitor.startTimer('health_check_database');
    
    try {
      // TODO: Replace with actual database check when MongoDB is implemented
      // For now, simulate database check
      const startTime = Date.now();
      
      // Simulate database query
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const responseTime = Date.now() - startTime;
      performanceMonitor.endTimer(timerId);

      if (responseTime > this.thresholds.responseTime.critical) {
        return {
          healthy: false,
          status: 'critical',
          message: 'Database response time is critically slow',
          responseTime,
          timestamp: new Date().toISOString(),
          details: { responseTime: `${responseTime}ms` }
        };
      }

      if (responseTime > this.thresholds.responseTime.warning) {
        return {
          healthy: true,
          status: 'warning',
          message: 'Database response time is slower than expected',
          responseTime,
          timestamp: new Date().toISOString(),
          details: { responseTime: `${responseTime}ms` }
        };
      }

      return {
        healthy: true,
        status: 'healthy',
        message: 'Database is responsive',
        responseTime,
        timestamp: new Date().toISOString(),
        details: { responseTime: `${responseTime}ms` }
      };

    } catch (error) {
      performanceMonitor.endTimer(timerId);
      logger.error('Database health check failed:', error);
      
      return {
        healthy: false,
        status: 'critical',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check Google Gemini API connectivity
   */
  async checkGeminiApi(): Promise<HealthCheckResult> {
    const timerId = performanceMonitor.startTimer('health_check_gemini');
    
    try {
      const startTime = Date.now();
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        performanceMonitor.endTimer(timerId);
        return {
          healthy: false,
          status: 'critical',
          message: 'Gemini API key not configured',
          timestamp: new Date().toISOString(),
          details: { error: 'GEMINI_API_KEY environment variable not set' }
        };
      }

      // Use the Gemini client to perform a health check
      const { GeminiApiClient } = await import('./gemini/client');
      const geminiClient = new GeminiApiClient({
        apiKey,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
      });

      const healthResult = await geminiClient.healthCheck();
      const responseTime = Date.now() - startTime;
      
      performanceMonitor.endTimer(timerId);

      if (healthResult.status === 'healthy') {
        return {
          healthy: true,
          status: 'healthy',
          message: 'Gemini API is responsive and model is available',
          responseTime,
          timestamp: new Date().toISOString(),
          details: {
            model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
            service: 'Google Gemini API',
            responseTime: `${responseTime}ms`
          }
        };
      } else {
        return {
          healthy: false,
          status: 'critical',
          message: 'Gemini API health check failed',
          responseTime,
          timestamp: new Date().toISOString(),
          details: {
            ...healthResult.details,
            responseTime: `${responseTime}ms`
          }
        };
      }

    } catch (error) {
      performanceMonitor.endTimer(timerId);
      logger.error('Gemini health check failed:', error);
      
      let message = 'Gemini API is unreachable';
      let status: 'warning' | 'critical' = 'critical';
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          message = 'Invalid Gemini API key';
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
          message = 'Gemini API quota exceeded';
          status = 'warning';
        }
      }
      
      return {
        healthy: false,
        status,
        message,
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Connection failed' }
      };
    }
  }


  /**
   * Check external venue API connectivity (includes SimplyBook.me)
   */
  async checkVenueApi(): Promise<HealthCheckResult> {
    const timerId = performanceMonitor.startTimer('health_check_venue_api');
    
    try {
      const startTime = Date.now();
      
      // Check if SimplyBook.me is configured
      const { getSimplyBookVenueService, isSimplyBookConfigured } = await import('./simplybook');
      
      if (isSimplyBookConfigured()) {
        // Check SimplyBook.me health
        const venueService = getSimplyBookVenueService();
        if (venueService) {
          const healthResult = await venueService.healthCheck();
          const responseTime = Date.now() - startTime;
          performanceMonitor.endTimer(timerId);
          
          if (healthResult.status === 'healthy') {
            return {
              healthy: true,
              status: 'healthy',
              message: 'SimplyBook.me venue service is responsive',
              responseTime,
              timestamp: new Date().toISOString(),
              details: {
                provider: 'SimplyBook.me',
                ...healthResult.details,
                responseTime: `${responseTime}ms`
              }
            };
          } else {
            return {
              healthy: false,
              status: 'warning',
              message: 'SimplyBook.me venue service is not healthy',
              responseTime,
              timestamp: new Date().toISOString(),
              details: {
                provider: 'SimplyBook.me',
                ...healthResult.details,
                responseTime: `${responseTime}ms`
              }
            };
          }
        }
      }
      
      // Check if legacy venue APIs are configured
      const venueApiUrl = process.env.VENUE_API_URL;
      if (!venueApiUrl) {
        performanceMonitor.endTimer(timerId);
        return {
          healthy: false,
          status: 'warning',
          message: 'No venue APIs configured',
          timestamp: new Date().toISOString(),
          details: { 
            configuration: 'Neither SimplyBook.me nor legacy venue APIs configured',
            simplyBookConfigured: false,
            legacyApiConfigured: false
          }
        };
      }

      // Simple connectivity check for legacy API
      const response = await fetch(`${venueApiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });

      const responseTime = Date.now() - startTime;
      performanceMonitor.endTimer(timerId);

      if (!response.ok) {
        return {
          healthy: false,
          status: 'warning',
          message: `Legacy venue API health check returned status ${response.status}`,
          responseTime,
          timestamp: new Date().toISOString(),
          details: { 
            provider: 'Legacy API',
            status: response.status,
            url: venueApiUrl,
            responseTime: `${responseTime}ms`
          }
        };
      }

      return {
        healthy: true,
        status: 'healthy',
        message: 'Legacy venue API is responsive',
        responseTime,
        timestamp: new Date().toISOString(),
        details: { 
          provider: 'Legacy API',
          url: venueApiUrl,
          responseTime: `${responseTime}ms`
        }
      };

    } catch (error) {
      performanceMonitor.endTimer(timerId);
      
      return {
        healthy: false,
        status: 'warning',
        message: 'Venue API connectivity check failed',
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Connection failed' }
      };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage(): Promise<HealthCheckResult> {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal + memUsage.external;
      const usedMemory = memUsage.heapUsed;
      const usageRatio = usedMemory / totalMemory;

      const details = {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        usagePercentage: `${(usageRatio * 100).toFixed(1)}%`
      };

      if (usageRatio > this.thresholds.memory.critical) {
        return {
          healthy: false,
          status: 'critical',
          message: 'Memory usage is critically high',
          timestamp: new Date().toISOString(),
          details
        };
      }

      if (usageRatio > this.thresholds.memory.warning) {
        return {
          healthy: true,
          status: 'warning',
          message: 'Memory usage is high',
          timestamp: new Date().toISOString(),
          details
        };
      }

      return {
        healthy: true,
        status: 'healthy',
        message: 'Memory usage is normal',
        timestamp: new Date().toISOString(),
        details
      };

    } catch (error) {
      logger.error('Memory health check failed:', error);
      return {
        healthy: false,
        status: 'critical',
        message: 'Unable to check memory usage',
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check disk space
   */
  async checkDiskSpace(): Promise<HealthCheckResult> {
    try {
      // Use df command to check disk usage (Linux/Mac)
      const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'");
      const usagePercentage = parseInt(stdout.trim(), 10) / 100;

      const details = {
        usagePercentage: `${(usagePercentage * 100).toFixed(1)}%`,
        path: '/'
      };

      if (usagePercentage > this.thresholds.disk.critical) {
        return {
          healthy: false,
          status: 'critical',
          message: 'Disk usage is critically high',
          timestamp: new Date().toISOString(),
          details
        };
      }

      if (usagePercentage > this.thresholds.disk.warning) {
        return {
          healthy: true,
          status: 'warning',
          message: 'Disk usage is high',
          timestamp: new Date().toISOString(),
          details
        };
      }

      return {
        healthy: true,
        status: 'healthy',
        message: 'Disk usage is normal',
        timestamp: new Date().toISOString(),
        details
      };

    } catch (error) {
      logger.warn('Disk space check failed (possibly unsupported platform):', error);
      
      // Fallback: check if we can write to temp
      try {
        await fs.writeFile('/tmp/health-check', 'test');
        await fs.unlink('/tmp/health-check');
        
        return {
          healthy: true,
          status: 'healthy',
          message: 'Disk write test successful',
          timestamp: new Date().toISOString(),
          details: { method: 'write-test-fallback' }
        };
      } catch (writeError) {
        return {
          healthy: false,
          status: 'critical',
          message: 'Unable to write to disk',
          timestamp: new Date().toISOString(),
          details: { error: writeError instanceof Error ? writeError.message : 'Write test failed' }
        };
      }
    }
  }

  /**
   * Check application performance metrics
   */
  async checkPerformance(): Promise<HealthCheckResult> {
    try {
      const metrics = performanceMonitor.getAllMetrics();
      const summary = performanceMonitor.getSystemSummary();

      // Check if we have enough data
      if (summary.totalOperations < 10) {
        return {
          healthy: true,
          status: 'healthy',
          message: 'Insufficient performance data for analysis',
          timestamp: new Date().toISOString(),
          details: { 
            totalOperations: summary.totalOperations,
            message: 'Need at least 10 operations for meaningful analysis'
          }
        };
      }

      const details = {
        totalOperations: summary.totalOperations,
        averageResponseTime: `${summary.averagePerformance.toFixed(2)}ms`,
        slowestOperation: summary.slowestOperation,
        fastestOperation: summary.fastestOperation
      };

      // Check for performance issues
      if (summary.averagePerformance > this.thresholds.responseTime.critical) {
        return {
          healthy: false,
          status: 'critical',
          message: 'Application performance is critically slow',
          timestamp: new Date().toISOString(),
          details
        };
      }

      if (summary.averagePerformance > this.thresholds.responseTime.warning) {
        return {
          healthy: true,
          status: 'warning',
          message: 'Application performance is slower than expected',
          timestamp: new Date().toISOString(),
          details
        };
      }

      return {
        healthy: true,
        status: 'healthy',
        message: 'Application performance is good',
        timestamp: new Date().toISOString(),
        details
      };

    } catch (error) {
      logger.error('Performance health check failed:', error);
      return {
        healthy: false,
        status: 'warning',
        message: 'Unable to analyze performance metrics',
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check critical dependencies
   */
  async checkDependencies(): Promise<HealthCheckResult> {
    try {
      const dependencies = [];
      const requiredEnvVars = [
        'NODE_ENV',
        'PORT'
      ];

      // Check environment variables
      const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingEnvVars.length > 0) {
        dependencies.push(`Missing environment variables: ${missingEnvVars.join(', ')}`);
      }

      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
      
      if (majorVersion < 18) {
        dependencies.push(`Node.js version ${nodeVersion} is below recommended version 18+`);
      }

      const details = {
        nodeVersion,
        platform: process.platform,
        architecture: process.arch,
        environmentVariables: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT,
          OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ? 'configured' : 'not configured'
        }
      };

      if (dependencies.length > 0) {
        return {
          healthy: false,
          status: 'warning',
          message: 'Some dependency issues detected',
          timestamp: new Date().toISOString(),
          details: { ...details, issues: dependencies }
        };
      }

      return {
        healthy: true,
        status: 'healthy',
        message: 'All dependencies are satisfied',
        timestamp: new Date().toISOString(),
        details
      };

    } catch (error) {
      logger.error('Dependencies health check failed:', error);
      return {
        healthy: false,
        status: 'critical',
        message: 'Unable to check dependencies',
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Extract result from Promise.allSettled
   */
  private getResultFromSettled(settled: PromiseSettledResult<HealthCheckResult>): HealthCheckResult {
    if (settled.status === 'fulfilled') {
      return settled.value;
    } else {
      logger.error('Health check promise rejected:', settled.reason);
      return {
        healthy: false,
        status: 'critical',
        message: 'Health check failed with error',
        timestamp: new Date().toISOString(),
        details: { error: settled.reason?.message || 'Unknown error' }
      };
    }
  }

  /**
   * Get a simple health status for quick checks
   */
  async quickCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Quick checks that should complete in under 1 second
      const checks = await Promise.allSettled([
        this.checkMemoryUsage(),
        this.checkDependencies()
      ]);

      const results = checks.map(check => this.getResultFromSettled(check));
      const hasUnhealthy = results.some(result => !result.healthy);
      const hasCritical = results.some(result => result.status === 'critical');

      return {
        healthy: !hasUnhealthy,
        message: hasCritical ? 'Critical issues detected' : 
                hasUnhealthy ? 'Some issues detected' : 'System is healthy'
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Health check failed'
      };
    }
  }
}

export const systemHealthChecker = new SystemHealthChecker();