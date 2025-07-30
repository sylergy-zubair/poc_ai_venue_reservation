import { OllamaApiClient, OllamaError, OllamaConnectionError } from './client';
import { 
  buildEntityExtractionMessages, 
  generateSuggestions, 
  ExtractionContext,
  VENUE_KEYWORDS 
} from './prompts';
import { EntityExtractionResult, ExtractedEntities } from '../../types';
import logger from '../../utils/logger';

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

export interface RateLimiter {
  checkLimit(key: string): Promise<void>;
}

export class EntityExtractionService {
  private ollamaClient: OllamaApiClient;
  private cache?: CacheService;
  private rateLimiter?: RateLimiter;

  constructor(
    ollamaClient: OllamaApiClient,
    cache?: CacheService,
    rateLimiter?: RateLimiter
  ) {
    this.ollamaClient = ollamaClient;
    this.cache = cache;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Extract entities from natural language query using Ollama
   */
  async extractEntities(
    query: string,
    context?: ExtractionContext
  ): Promise<EntityExtractionResult> {
    // Input validation
    this.validateQuery(query);

    // Check cache first
    const cacheKey = this.generateCacheKey(query, context);
    if (this.cache) {
      const cached = await this.cache.get<EntityExtractionResult>(cacheKey);
      if (cached) {
        logger.debug('Entity extraction cache hit', { cacheKey });
        return { ...cached, metadata: { ...cached.metadata, fromCache: true } };
      }
    }

    // Rate limiting (more generous since it's local)
    if (this.rateLimiter) {
      await this.rateLimiter.checkLimit('ollama-extraction');
    }

    const startTime = Date.now();

    try {
      // Call Ollama API
      const messages = buildEntityExtractionMessages(query, context);
      const response = await this.ollamaClient.chat({ messages });

      // Process response
      const result = await this.processOllamaResponse(response.message.content, query);

      // Add metadata
      result.metadata = {
        processingTime: Date.now() - startTime,
        tokens: response.eval_count || 0,
        timestamp: new Date().toISOString(),
        model: this.ollamaClient.getConfig().model,
        fromCache: false,
        totalDuration: response.total_duration,
        loadDuration: response.load_duration,
        evalDuration: response.eval_duration,
      };

      // Cache successful result
      if (this.cache) {
        await this.cache.set(cacheKey, result, 3600); // 1 hour TTL
      }

      logger.info('Entity extraction completed', {
        query: query.substring(0, 50),
        processingTime: result.metadata.processingTime,
        confidence: result.confidence.overall,
        fromCache: false,
      });

      return result;
    } catch (error) {
      if (error instanceof OllamaConnectionError) {
        logger.warn('Ollama connection failed, using fallback extraction', {
          error: error.message,
          query: query.substring(0, 50),
        });
        return this.fallbackExtraction(query);
      }

      if (error instanceof OllamaError) {
        logger.error('Ollama API error', {
          error: error.message,
          statusCode: error.statusCode,
          query: query.substring(0, 50),
        });
        return this.fallbackExtraction(query);
      }

      logger.error('Unexpected entity extraction error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.substring(0, 50),
      });

      throw error;
    }
  }

  /**
   * Process Ollama response and extract structured data
   */
  private async processOllamaResponse(
    content: string,
    originalQuery: string
  ): Promise<EntityExtractionResult> {
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanContent = content.trim();
      
      // Find JSON content between ```json and ``` or just look for JSON object
      const jsonMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                       cleanContent.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        cleanContent = jsonMatch[1];
      }

      // Try to parse the JSON
      const parsed = JSON.parse(cleanContent);

      // Validate response structure
      this.validateOllamaResponse(parsed);

      // Post-process entities
      const processedEntities = this.postProcessEntities(parsed.entities);

      // Generate suggestions
      const suggestions = parsed.suggestions || 
                         generateSuggestions(processedEntities, parsed.confidence);

      return {
        sessionId: this.generateSessionId(),
        entities: processedEntities,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning || 'Entities extracted using Llama 3.1',
        suggestions,
        metadata: {}, // Will be filled by caller
      };
    } catch (error) {
      logger.warn('Failed to parse Ollama response, using fallback', {
        error: error instanceof Error ? error.message : 'Parse error',
        content: content.substring(0, 200),
        originalQuery: originalQuery.substring(0, 50),
      });

      // Fallback to pattern-based extraction
      return this.fallbackExtraction(originalQuery);
    }
  }

  /**
   * Post-process and normalize extracted entities
   */
  private postProcessEntities(entities: any): ExtractedEntities {
    return {
      location: this.normalizeLocation(entities.location),
      date: this.normalizeDate(entities.date),
      capacity: this.normalizeCapacity(entities.capacity),
      eventType: this.normalizeEventType(entities.eventType),
      duration: this.normalizeDuration(entities.duration),
      budget: this.normalizeBudget(entities.budget),
      amenities: this.normalizeAmenities(entities.amenities || []),
    };
  }

  /**
   * Normalize location to consistent format
   */
  private normalizeLocation(location: string | null): string | null {
    if (!location || typeof location !== 'string') return null;

    const normalized = location.trim();
    
    // City name mappings for common abbreviations
    const cityMappings: Record<string, string> = {
      'bcn': 'Barcelona',
      'mad': 'Madrid',
      'nyc': 'New York',
      'la': 'Los Angeles',
      'sf': 'San Francisco',
      'london': 'London',
      'paris': 'Paris',
    };

    const lower = normalized.toLowerCase();
    return cityMappings[lower] || 
           normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }

  /**
   * Normalize date to proper Date object
   */
  private normalizeDate(date: string | null): Date | null {
    if (!date || typeof date !== 'string') return null;

    try {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) return null;

      // Ensure date is not in the past (allow same day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsed < today) return null;

      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Normalize capacity to valid number
   */
  private normalizeCapacity(capacity: number | null): number | null {
    if (typeof capacity !== 'number' || capacity < 1 || capacity > 100000) {
      return null;
    }
    return Math.floor(capacity);
  }

  /**
   * Normalize event type to standard categories
   */
  private normalizeEventType(eventType: string | null): string | null {
    if (!eventType || typeof eventType !== 'string') return null;

    const normalized = eventType.toLowerCase().trim();
    
    // Map variations to standard event types
    const eventTypeMap: Record<string, string> = {
      'conference': 'conference',
      'meeting': 'meeting',
      'business meeting': 'meeting',
      'corporate meeting': 'meeting',
      'wedding': 'wedding',
      'party': 'party',
      'celebration': 'party',
      'seminar': 'seminar',
      'workshop': 'workshop',
      'training': 'workshop',
      'presentation': 'presentation',
      'networking': 'networking',
      'reception': 'reception',
      'gala': 'gala',
      'exhibition': 'exhibition',
      'trade show': 'exhibition',
    };

    return eventTypeMap[normalized] || eventType;
  }

  /**
   * Normalize duration to hours
   */
  private normalizeDuration(duration: number | null): number | null {
    if (typeof duration !== 'number' || duration < 0.5 || duration > 24) {
      return null;
    }
    return Math.round(duration * 2) / 2; // Round to nearest 0.5 hour
  }

  /**
   * Normalize budget range
   */
  private normalizeBudget(budget: any): ExtractedEntities['budget'] {
    if (!budget || typeof budget !== 'object') return null;

    const { min, max, currency } = budget;
    
    if (typeof min !== 'number' && typeof max !== 'number') return null;

    return {
      min: typeof min === 'number' && min > 0 ? min : undefined,
      max: typeof max === 'number' && max > 0 ? max : undefined,
      currency: typeof currency === 'string' ? currency.toUpperCase() : undefined,
    };
  }

  /**
   * Normalize amenities list
   */
  private normalizeAmenities(amenities: any[]): string[] {
    if (!Array.isArray(amenities)) return [];

    return amenities
      .filter(item => typeof item === 'string')
      .map(item => item.toLowerCase().trim())
      .filter(item => item.length > 0)
      .slice(0, 10); // Limit to 10 amenities
  }

  /**
   * Fallback extraction using pattern matching
   */
  private async fallbackExtraction(query: string): Promise<EntityExtractionResult> {
    logger.info('Using fallback pattern-based extraction', {
      query: query.substring(0, 50),
    });

    const entities = this.basicPatternExtraction(query);

    return {
      sessionId: this.generateSessionId(),
      entities,
      confidence: {
        overall: 0.3,
        location: entities.location ? 0.4 : 0,
        date: entities.date ? 0.3 : 0,
        capacity: entities.capacity ? 0.5 : 0,
        eventType: entities.eventType ? 0.3 : 0,
      },
      reasoning: 'Fallback extraction used due to AI service unavailability',
      suggestions: [
        'AI service temporarily unavailable',
        'Please verify extracted information',
        'Try again in a few moments for better results',
      ],
      metadata: {
        processingTime: 50,
        tokens: 0,
        timestamp: new Date().toISOString(),
        fallback: true,
      },
    };
  }

  /**
   * Basic pattern-based extraction for fallback
   */
  private basicPatternExtraction(query: string): ExtractedEntities {
    const lowerQuery = query.toLowerCase();

    // Location extraction
    const locationPatterns = [
      /in\s+([a-zA-Z\s]+?)(?:\s+for|\s+on|\s+next|\s*$)/,
      /at\s+([a-zA-Z\s]+?)(?:\s+for|\s+on|\s+next|\s*$)/,
      /venue.*?in\s+([a-zA-Z\s]+)/,
    ];

    let location: string | null = null;
    for (const pattern of locationPatterns) {
      const match = lowerQuery.match(pattern);
      if (match) {
        location = match[1].trim();
        break;
      }
    }

    // Capacity extraction
    const capacityPattern = /(\d+)\s*(?:people|persons|attendees|guests|pax)/;
    const capacityMatch = lowerQuery.match(capacityPattern);
    const capacity = capacityMatch ? parseInt(capacityMatch[1]) : null;

    // Event type extraction
    let eventType: string | null = null;
    for (const type of VENUE_KEYWORDS.eventTypes) {
      if (lowerQuery.includes(type)) {
        eventType = type;
        break;
      }
    }

    return {
      location: this.normalizeLocation(location),
      date: null, // Date parsing is complex for fallback
      capacity: this.normalizeCapacity(capacity),
      eventType: this.normalizeEventType(eventType),
      duration: null,
      budget: null,
      amenities: [],
    };
  }

  /**
   * Validate input query
   */
  private validateQuery(query: string): void {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    if (query.trim().length < 5) {
      throw new Error('Query must be at least 5 characters long');
    }

    if (query.length > 1000) {
      throw new Error('Query is too long (max 1000 characters)');
    }

    // Basic sanitization
    const sanitized = query.replace(/<[^>]*>/g, '').trim();
    if (sanitized.length !== query.trim().length) {
      throw new Error('Query contains invalid characters');
    }
  }

  /**
   * Validate Ollama response structure
   */
  private validateOllamaResponse(response: any): void {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format');
    }

    if (!response.entities || !response.confidence) {
      throw new Error('Response missing required fields: entities, confidence');
    }

    // Validate confidence scores
    const { confidence } = response;
    const requiredFields = ['overall', 'location', 'date', 'capacity', 'eventType'];

    for (const field of requiredFields) {
      const value = confidence[field];
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new Error(`Invalid confidence score for ${field}: ${value}`);
      }
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(query: string, context?: ExtractionContext): string {
    const contextStr = context ? JSON.stringify(context) : '';
    const combined = query + contextStr;
    return `ollama_extraction:${Buffer.from(combined).toString('base64')}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export convenience function for direct use
export async function extractEntities(
  query: string,
  context?: ExtractionContext
): Promise<EntityExtractionResult> {
  const ollamaClient = new OllamaApiClient({
    apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1:8b'
  });
  const service = new EntityExtractionService(ollamaClient);
  return service.extractEntities(query, context);
}