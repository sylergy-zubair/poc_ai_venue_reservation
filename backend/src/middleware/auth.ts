import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types';

// Extend Express Request type to include apiKey
declare global {
  namespace Express {
    interface Request {
      apiKey?: string;
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Middleware to validate API key for admin endpoints
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.header('X-API-Key');
  
  if (!apiKey) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'API key is required for this endpoint',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    };
    
    res.status(401).json(response);
    return;
  }
  
  // In production, this would validate against a secure store
  const validApiKeys = [
    process.env.ADMIN_API_KEY || 'test-admin-key',
    process.env.MONITORING_API_KEY || 'test-monitoring-key',
  ];
  
  if (!validApiKeys.includes(apiKey)) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key provided',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    };
    
    res.status(401).json(response);
    return;
  }
  
  req.apiKey = apiKey;
  next();
};

/**
 * Middleware to add request metadata
 */
export const addRequestMetadata = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = generateRequestId();
  req.startTime = Date.now();
  next();
};

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}