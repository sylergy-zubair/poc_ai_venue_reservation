import { createSimplyBookClient } from './client';
import { createSimplyBookVenueService } from './venueService';
import logger from '../../utils/logger';

let venueService: ReturnType<typeof createSimplyBookVenueService> | null = null;

/**
 * Initialize SimplyBook.me service with environment configuration
 */
export function initializeSimplyBookService() {
  try {
    const companyLogin = process.env.SIMPLYBOOK_COMPANY_LOGIN;
    const apiKey = process.env.SIMPLYBOOK_API_KEY;

    if (!companyLogin || !apiKey) {
      logger.warn('SimplyBook.me credentials not configured, using mock data', {
        hasCompanyLogin: !!companyLogin,
        hasApiKey: !!apiKey,
      });
      return null;
    }

    const client = createSimplyBookClient({
      companyLogin,
      apiKey,
      apiUrl: process.env.SIMPLYBOOK_API_URL || 'https://user-api.simplybook.me',
      timeout: parseInt(process.env.SIMPLYBOOK_TIMEOUT || '30000'),
      rateLimitDelay: parseInt(process.env.SIMPLYBOOK_RATE_LIMIT_DELAY || '200'),
    });

    venueService = createSimplyBookVenueService(client);

    logger.info('SimplyBook.me service initialized successfully', {
      companyLogin,
      apiUrl: process.env.SIMPLYBOOK_API_URL || 'https://user-api.simplybook.me',
    });

    return venueService;
  } catch (error) {
    logger.error('Failed to initialize SimplyBook.me service', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get the SimplyBook.me venue service instance
 */
export function getSimplyBookVenueService() {
  if (!venueService) {
    venueService = initializeSimplyBookService();
  }
  return venueService;
}

/**
 * Check if SimplyBook.me is configured and available
 */
export function isSimplyBookConfigured(): boolean {
  return !!(process.env.SIMPLYBOOK_COMPANY_LOGIN && process.env.SIMPLYBOOK_API_KEY);
}

// Initialize on module load
venueService = initializeSimplyBookService();

export { createSimplyBookClient, createSimplyBookVenueService };
export * from './client';
export * from './venueService';
export * from './auth';