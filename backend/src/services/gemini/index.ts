// Google Gemini API service exports
export { GeminiApiClient, GeminiError, GeminiConnectionError, GeminiModelError } from './client';
export { EntityExtractionService, extractEntities } from './entityExtraction';
export { 
  buildEntityExtractionMessages, 
  generateSuggestions, 
  ExtractionContext,
  VENUE_KEYWORDS,
  getCurrentDateContext
} from './prompts';

// Re-export types for convenience
export type { 
  GeminiConfig,
  GeminiGenerateRequest,
  GeminiGenerateResponse,
  GeminiChatRequest,
  GeminiChatResponse
} from './client';

export type { CacheService, RateLimiter } from './entityExtraction';