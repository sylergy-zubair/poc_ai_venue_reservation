import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiResponse } from '../types';

// Extend Request interface for rate limiting
declare module 'express' {
  interface Request {
    rateLimit?: {
      limit: number;
      used: number;
      remaining: number;
      resetTime: number;
    };
  }
}

// Basic health endpoint - no rate limiting
export const healthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 0, // Unlimited
  message: 'Too many health check requests',
  standardHeaders: true,
  legacyHeaders: false,
});

// Detailed health endpoint - limited access
export const detailedHealthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: (req: Request, res: Response): ApiResponse => ({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many detailed health check requests. Please try again later.',
      details: {
        retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60),
        limit: 10,
        remaining: req.rateLimit?.remaining || 0,
        resetTime: req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime).toISOString() : null,
      },
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  }),
  standardHeaders: true,
  legacyHeaders: false,
});

// API endpoints - moderate rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: (req: Request, res: Response): ApiResponse => ({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many API requests. Please try again later.',
      details: {
        retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60),
        limit: 100,
        remaining: req.rateLimit?.remaining || 0,
        resetTime: req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime).toISOString() : null,
      },
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  }),
  standardHeaders: true,
  legacyHeaders: false,
});

// Booking endpoints - strict rate limiting
export const bookingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 booking requests per windowMs
  message: (req: Request, res: Response): ApiResponse => ({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many booking requests. Please try again later.',
      details: {
        retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60),
        limit: 10,
        remaining: req.rateLimit?.remaining || 0,
        resetTime: req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime).toISOString() : null,
      },
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  }),
  standardHeaders: true,
  legacyHeaders: false,
});