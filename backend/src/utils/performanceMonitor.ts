/**
 * Performance Monitor Utility
 * Phase 4: Monitoring and metrics collection for system performance
 */

import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
  count: number;
  average: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
  total: number;
}

export interface TimerResult {
  duration: number;
  operation: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private activeTimers: Map<string, { startTime: number; operation: string; metadata?: Record<string, any> }> = new Map();
  private readonly maxHistorySize = 1000; // Keep last 1000 measurements per operation

  /**
   * Start a performance timer for an operation
   */
  startTimer(operation: string, metadata?: Record<string, any>): string {
    const timerId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    performance.mark(`${timerId}-start`);
    
    this.activeTimers.set(timerId, {
      startTime,
      operation,
      metadata
    });

    return timerId;
  }

  /**
   * End a performance timer and record the measurement
   */
  endTimer(timerId: string): TimerResult | null {
    const timerData = this.activeTimers.get(timerId);
    if (!timerData) {
      console.warn(`Timer ${timerId} not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - timerData.startTime;

    performance.mark(`${timerId}-end`);
    performance.measure(timerId, `${timerId}-start`, `${timerId}-end`);

    // Record the measurement
    this.recordMeasurement(timerData.operation, duration);

    // Clean up
    this.activeTimers.delete(timerId);
    performance.clearMarks(`${timerId}-start`);
    performance.clearMarks(`${timerId}-end`);
    performance.clearMeasures(timerId);

    return {
      duration,
      operation: timerData.operation,
      timestamp: new Date().toISOString(),
      metadata: timerData.metadata
    };
  }

  /**
   * Record a measurement directly (for operations measured externally)
   */
  recordMeasurement(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const measurements = this.metrics.get(operation)!;
    measurements.push(duration);

    // Keep only the most recent measurements
    if (measurements.length > this.maxHistorySize) {
      measurements.shift();
    }
  }

  /**
   * Get performance metrics for an operation
   */
  getMetrics(operation: string): PerformanceMetrics | null {
    const measurements = this.metrics.get(operation);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);

    return {
      count: measurements.length,
      average: sum / measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
      total: sum
    };
  }

  /**
   * Get all available metrics
   */
  getAllMetrics(): Record<string, PerformanceMetrics> {
    const allMetrics: Record<string, PerformanceMetrics> = {};
    
    for (const operation of this.metrics.keys()) {
      const metrics = this.getMetrics(operation);
      if (metrics) {
        allMetrics[operation] = metrics;
      }
    }

    return allMetrics;
  }

  /**
   * Calculate percentile value
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Clear metrics for an operation
   */
  clearMetrics(operation?: string): void {
    if (operation) {
      this.metrics.delete(operation);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Get summary of system performance
   */
  getSystemSummary(): {
    totalOperations: number;
    averagePerformance: number;
    slowestOperation: { name: string; averageTime: number } | null;
    fastestOperation: { name: string; averageTime: number } | null;
  } {
    const allMetrics = this.getAllMetrics();
    const operations = Object.keys(allMetrics);

    if (operations.length === 0) {
      return {
        totalOperations: 0,
        averagePerformance: 0,
        slowestOperation: null,
        fastestOperation: null
      };
    }

    const totalCount = operations.reduce((sum, op) => sum + allMetrics[op].count, 0);
    const totalTime = operations.reduce((sum, op) => sum + allMetrics[op].total, 0);
    const averagePerformance = totalTime / totalCount;

    const sortedByAverage = operations
      .map(op => ({ name: op, averageTime: allMetrics[op].average }))
      .sort((a, b) => a.averageTime - b.averageTime);

    return {
      totalOperations: totalCount,
      averagePerformance,
      slowestOperation: sortedByAverage[sortedByAverage.length - 1] || null,
      fastestOperation: sortedByAverage[0] || null
    };
  }

  /**
   * Export metrics to JSON format
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.getAllMetrics(),
      summary: this.getSystemSummary(),
      activeTimers: Array.from(this.activeTimers.keys()).length
    }, null, 2);
  }

  /**
   * Create a decorator for automatic performance monitoring of methods
   */
  monitor(operation?: string) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;
      const operationName = operation || `${target.constructor.name}.${propertyName}`;

      descriptor.value = async function (...args: any[]) {
        const timerId = performanceMonitor.startTimer(operationName, {
          className: target.constructor.name,
          methodName: propertyName,
          argumentCount: args.length
        });

        try {
          const result = await method.apply(this, args);
          performanceMonitor.endTimer(timerId);
          return result;
        } catch (error) {
          const timerResult = performanceMonitor.endTimer(timerId);
          if (timerResult) {
            // Record error in metadata
            performanceMonitor.recordMeasurement(`${operationName}_error`, timerResult.duration);
          }
          throw error;
        }
      };

      return descriptor;
    };
  }

  /**
   * Measure memory usage for an operation
   */
  measureMemory(operation: string, fn: () => any): any {
    const beforeMemory = process.memoryUsage();
    const timerId = this.startTimer(`${operation}_memory`);
    
    try {
      const result = fn();
      const afterMemory = process.memoryUsage();
      const timerResult = this.endTimer(timerId);
      
      if (timerResult) {
        // Record memory delta
        const memoryDelta = {
          heapUsed: afterMemory.heapUsed - beforeMemory.heapUsed,
          heapTotal: afterMemory.heapTotal - beforeMemory.heapTotal,
          external: afterMemory.external - beforeMemory.external,
          rss: afterMemory.rss - beforeMemory.rss
        };
        
        this.recordMeasurement(`${operation}_memory_heap`, memoryDelta.heapUsed);
        this.recordMeasurement(`${operation}_memory_rss`, memoryDelta.rss);
      }
      
      return result;
    } catch (error) {
      this.endTimer(timerId);
      throw error;
    }
  }

  /**
   * Create a performance report for a specific time period
   */
  generateReport(startTime?: Date, endTime?: Date): {
    period: { start: string; end: string };
    metrics: Record<string, PerformanceMetrics>;
    summary: any;
    recommendations: string[];
  } {
    const now = new Date();
    const start = startTime || new Date(now.getTime() - 60 * 60 * 1000); // Last hour
    const end = endTime || now;

    const metrics = this.getAllMetrics();
    const summary = this.getSystemSummary();
    
    // Generate performance recommendations
    const recommendations: string[] = [];
    
    Object.entries(metrics).forEach(([operation, metric]) => {
      if (metric.average > 2000) {
        recommendations.push(`Operation "${operation}" has high average response time (${metric.average.toFixed(0)}ms)`);
      }
      if (metric.p95 > 5000) {
        recommendations.push(`Operation "${operation}" has high P95 response time (${metric.p95.toFixed(0)}ms)`);
      }
      if (metric.max > 10000) {
        recommendations.push(`Operation "${operation}" has very high maximum response time (${metric.max.toFixed(0)}ms)`);
      }
    });

    if (summary.averagePerformance > 1000) {
      recommendations.push('Overall system performance is below target (<1000ms average)');
    }

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      metrics,
      summary,
      recommendations
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Middleware for Express to automatically monitor request performance
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const timerId = performanceMonitor.startTimer('http_request', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  });

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const timerResult = performanceMonitor.endTimer(timerId);
    
    if (timerResult) {
      // Also record specific endpoint metrics
      const endpoint = `${req.method}_${req.route?.path || req.path}`;
      performanceMonitor.recordMeasurement(endpoint, timerResult.duration);
      
      // Add performance headers
      res.set('X-Response-Time', `${timerResult.duration.toFixed(2)}ms`);
    }
    
    originalEnd.apply(this, args);
  };

  next();
};

export default PerformanceMonitor;