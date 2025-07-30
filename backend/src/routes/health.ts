import { Router } from 'express';
import { getHealth, getDetailedHealth } from '../controllers/healthController';
import { validateApiKey } from '../middleware/auth';
import { healthRateLimit, detailedHealthRateLimit } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route GET /health
 * @desc Basic health check endpoint
 * @access Public
 * @rateLimit No limit
 */
router.get('/', healthRateLimit, getHealth);

/**
 * @route GET /health/detailed
 * @desc Detailed health check endpoint with system metrics
 * @access Private (requires API key)
 * @rateLimit 10 requests per 15 minutes per IP
 */
router.get('/detailed', detailedHealthRateLimit, validateApiKey, getDetailedHealth);

export default router;