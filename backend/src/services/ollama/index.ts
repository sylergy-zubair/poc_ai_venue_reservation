// Main Ollama service integration
import { OllamaApiClient, OllamaConfig } from './client';
import { EntityExtractionService } from './entityExtraction';
import logger from '../../utils/logger';

// Default configuration
const DEFAULT_CONFIG: OllamaConfig = {
  apiUrl: process.env['OLLAMA_API_URL'] || 'http://localhost:11434',
  model: process.env['OLLAMA_MODEL'] || 'llama3.1:8b',
  timeout: 30000,
  maxRetries: 3,
};

// Global instances
let ollamaClient: OllamaApiClient | null = null;
let entityExtractionService: EntityExtractionService | null = null;

/**
 * Initialize Ollama client with configuration
 */
export function createOllamaClient(config?: Partial<OllamaConfig>): OllamaApiClient {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  logger.info('Initializing Ollama client', {
    apiUrl: finalConfig.apiUrl,
    model: finalConfig.model,
    timeout: finalConfig.timeout,
  });

  return new OllamaApiClient(finalConfig);
}

/**
 * Get or create singleton Ollama client
 */
export function getOllamaClient(): OllamaApiClient {
  if (!ollamaClient) {
    ollamaClient = createOllamaClient();
  }
  return ollamaClient;
}

/**
 * Create entity extraction service with Ollama client
 */
export function createEntityExtractionService(
  client?: OllamaApiClient,
  cache?: any,
  rateLimiter?: any
): EntityExtractionService {
  const ollamaClient = client || getOllamaClient();
  
  logger.info('Initializing entity extraction service', {
    model: ollamaClient.getConfig().model,
    cacheEnabled: !!cache,
    rateLimiterEnabled: !!rateLimiter,
  });

  return new EntityExtractionService(ollamaClient, cache, rateLimiter);
}

/**
 * Get or create singleton entity extraction service
 */
export function getEntityExtractionService(): EntityExtractionService {
  if (!entityExtractionService) {
    entityExtractionService = createEntityExtractionService();
  }
  return entityExtractionService;
}

/**
 * Initialize and verify Ollama connection
 */
export async function initializeOllama(): Promise<void> {
  const client = getOllamaClient();
  
  logger.info('Verifying Ollama connection and model availability...');
  
  try {
    const health = await client.healthCheck();
    
    if (health.status === 'healthy') {
      logger.info('Ollama initialization successful', {
        model: client.getConfig().model,
        responseTime: health.responseTime,
        modelAvailable: health.modelAvailable,
      });
    } else if (health.status === 'unhealthy' && !health.modelAvailable) {
      logger.warn('Ollama model not available, attempting to pull...', {
        model: client.getConfig().model,
      });
      
      // Attempt to pull the model
      await client.pullModel();
      
      // Verify again
      const retryHealth = await client.healthCheck();
      if (retryHealth.status === 'healthy') {
        logger.info('Ollama model pulled successfully', {
          model: client.getConfig().model,
        });
      } else {
        throw new Error('Failed to pull Ollama model');
      }
    } else {
      logger.error('Ollama health check failed', {
        status: health.status,
        details: health.details,
      });
      throw new Error(`Ollama health check failed: ${health.status}`);
    }
  } catch (error) {
    logger.error('Ollama initialization failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      config: DEFAULT_CONFIG,
    });
    
    // Don't throw in development - allow fallback extraction
    if (process.env['NODE_ENV'] !== 'production') {
      logger.warn('Continuing with fallback extraction due to Ollama initialization failure');
    } else {
      throw error;
    }
  }
}

// Export types and classes
export { OllamaApiClient, EntityExtractionService };
export type { OllamaConfig };

// Export error types
export {
  OllamaError,
  OllamaConnectionError,
  OllamaModelError,
} from './client';