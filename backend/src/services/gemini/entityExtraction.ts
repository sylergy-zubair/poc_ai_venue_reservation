import { GeminiApiClient, GeminiError, GeminiConnectionError } from './client';
import { 
  buildEntityExtractionMessages, 
  generateSuggestions, 
  ExtractionContext,
  VENUE_KEYWORDS,
  getCurrentDateContext
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
  private geminiClient: GeminiApiClient;
  private cache?: CacheService;
  private rateLimiter?: RateLimiter;

  constructor(
    geminiClient: GeminiApiClient,
    cache?: CacheService,
    rateLimiter?: RateLimiter
  ) {
    this.geminiClient = geminiClient;
    this.cache = cache;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Extract entities from natural language query using Gemini
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

    // Rate limiting
    if (this.rateLimiter) {
      await this.rateLimiter.checkLimit('gemini-extraction');
    }

    const startTime = Date.now();

    try {
      // Add current date context if not provided
      const enhancedContext: ExtractionContext = {
        dateContext: getCurrentDateContext(),
        ...context,
      };

      // Call Gemini API
      const messages = buildEntityExtractionMessages(query, enhancedContext);
      const response = await this.geminiClient.chat({ messages });

      // Process response
      const result = await this.processGeminiResponse(response.message.content, query);

      // Add metadata
      result.metadata = {
        processingTime: Date.now() - startTime,
        tokens: response.eval_count || 0,
        timestamp: new Date().toISOString(),
        model: this.geminiClient.getConfig().model,
        fromCache: false,
        totalDuration: response.total_duration,
        promptTokens: response.prompt_eval_count,
        completionTokens: response.eval_count,
        service: 'gemini',
      };

      // Cache successful result
      if (this.cache) {
        await this.cache.set(cacheKey, result, 3600); // 1 hour TTL
      }

      logger.info('Entity extraction completed via Gemini', {
        query: query.substring(0, 50),
        processingTime: result.metadata.processingTime,
        confidence: result.confidence.overall,
        model: this.geminiClient.getConfig().model,
        fromCache: false,
      });

      return result;
    } catch (error) {
      if (error instanceof GeminiConnectionError) {
        logger.warn('Gemini connection failed, using fallback extraction', {
          error: error.message,
          query: query.substring(0, 50),
        });
        return this.fallbackExtraction(query);
      }

      if (error instanceof GeminiError) {
        logger.error('Gemini API error', {
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

      // For unexpected errors, still try fallback
      return this.fallbackExtraction(query);
    }
  }

  /**
   * Process Gemini response and extract structured data
   */
  private async processGeminiResponse(
    content: string,
    originalQuery: string
  ): Promise<EntityExtractionResult> {
    try {
      // Clean the response - Gemini might return with some formatting
      let cleanContent = content.trim();
      
      // Remove any markdown formatting
      cleanContent = cleanContent.replace(/```json\s*|\s*```/g, '');
      cleanContent = cleanContent.replace(/```\s*|\s*```/g, '');
      
      // Find JSON content - look for the object boundaries
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }

      // Try to parse the JSON
      const parsed = JSON.parse(cleanContent);

      // Validate response structure
      this.validateGeminiResponse(parsed);

      // Post-process entities with enhanced normalization
      const processedEntities = this.postProcessEntities(parsed.entities);

      // Generate contextual suggestions
      const suggestions = parsed.suggestions || 
                         generateSuggestions(processedEntities, parsed.confidence);

      return {
        sessionId: this.generateSessionId(),
        entities: processedEntities,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning || 'Entities extracted using Google Gemini',
        suggestions,
        metadata: {}, // Will be filled by caller
      };
    } catch (error) {
      logger.warn('Failed to parse Gemini response, using fallback', {
        error: error instanceof Error ? error.message : 'Parse error',
        content: content.substring(0, 200),
        originalQuery: originalQuery.substring(0, 50),
      });

      // Fallback to pattern-based extraction
      return this.fallbackExtraction(originalQuery);
    }
  }

  /**
   * Enhanced post-processing for Gemini responses
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
   * Enhanced location normalization with more comprehensive mapping
   */
  private normalizeLocation(location: string | null): string | null {
    if (!location || typeof location !== 'string') return null;

    const normalized = location.trim();
    
    // Comprehensive city name mappings
    const cityMappings: Record<string, string> = {
      // Spanish cities
      'bcn': 'Barcelona',
      'mad': 'Madrid',
      'sev': 'Seville',
      'val': 'Valencia',
      
      // US cities
      'nyc': 'New York',
      'ny': 'New York',
      'la': 'Los Angeles',
      'sf': 'San Francisco',
      'san fran': 'San Francisco',
      'chi': 'Chicago',
      'dc': 'Washington DC',
      'philly': 'Philadelphia',
      
      // European cities
      'london': 'London',
      'paris': 'Paris',
      'berlin': 'Berlin',
      'rome': 'Rome',
      'amsterdam': 'Amsterdam',
      'vienna': 'Vienna',
      'prague': 'Prague',
      'budapest': 'Budapest',
      
      // Other major cities
      'tokyo': 'Tokyo',
      'singapore': 'Singapore',
      'dubai': 'Dubai',
      'sydney': 'Sydney',
      'melbourne': 'Melbourne',
      'toronto': 'Toronto',
      'vancouver': 'Vancouver',
    };

    const lower = normalized.toLowerCase();
    return cityMappings[lower] || 
           normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }

  /**
   * Enhanced date normalization with better relative date parsing
   */
  private normalizeDate(date: string | null): Date | null {
    if (!date || typeof date !== 'string') return null;

    try {
      // Handle YYYY-MM-DD format directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const parsed = new Date(date + 'T00:00:00.000Z');
        if (!isNaN(parsed.getTime())) {
          // Ensure date is not in the past (allow same day)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (parsed >= today) {
            return parsed;
          }
        }
      }

      // Try standard date parsing
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        // Ensure date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsed >= today) {
          return parsed;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Enhanced capacity normalization with range handling
   */
  private normalizeCapacity(capacity: number | string | null): number | null {
    if (capacity === null || capacity === undefined) return null;
    
    // Handle string inputs like "50-100" or "around 50"
    if (typeof capacity === 'string') {
      // Extract numbers from string
      const numbers = capacity.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        // Use the first number if multiple found
        capacity = parseInt(numbers[0]);
      } else {
        return null;
      }
    }

    if (typeof capacity !== 'number' || capacity < 1 || capacity > 100000) {
      return null;
    }
    
    return Math.floor(capacity);
  }

  /**
   * Enhanced event type normalization with more categories
   */
  private normalizeEventType(eventType: string | null): string | null {
    if (!eventType || typeof eventType !== 'string') return null;

    const normalized = eventType.toLowerCase().trim();
    
    // Comprehensive event type mapping
    const eventTypeMap: Record<string, string> = {
      // Business events
      'conference': 'conference',
      'business conference': 'conference',
      'corporate conference': 'conference',
      'meeting': 'meeting',
      'business meeting': 'meeting',
      'corporate meeting': 'meeting',
      'board meeting': 'meeting',
      'seminar': 'seminar',
      'workshop': 'workshop',
      'training': 'workshop',
      'training session': 'workshop',
      'presentation': 'presentation',
      'pitch': 'presentation',
      'demo': 'presentation',
      'networking': 'networking',
      'networking event': 'networking',
      'mixer': 'networking',
      
      // Social events
      'wedding': 'wedding',
      'wedding reception': 'wedding',
      'wedding ceremony': 'wedding',
      'party': 'party',
      'birthday party': 'party',
      'celebration': 'party',
      'anniversary': 'party',
      'reception': 'reception',
      'cocktail reception': 'reception',
      'gala': 'gala',
      'banquet': 'gala',
      
      // Educational events
      'graduation': 'ceremony',
      'ceremony': 'ceremony',
      'award ceremony': 'ceremony',
      
      // Entertainment events
      'concert': 'concert',
      'performance': 'performance',
      'show': 'performance',
      
      // Trade events
      'exhibition': 'exhibition',
      'trade show': 'exhibition',
      'expo': 'exhibition',
      'fair': 'exhibition',
    };

    return eventTypeMap[normalized] || eventType;
  }

  /**
   * Enhanced duration normalization
   */
  private normalizeDuration(duration: number | string | null): number | null {
    if (duration === null || duration === undefined) return null;
    
    if (typeof duration === 'string') {
      const lower = duration.toLowerCase();
      
      // Handle common duration phrases
      if (lower.includes('half day') || lower.includes('half-day')) return 4;
      if (lower.includes('full day') || lower.includes('full-day') || lower.includes('all day')) return 8;
      if (lower.includes('morning')) return 4;
      if (lower.includes('afternoon')) return 4;
      if (lower.includes('evening')) return 3;
      
      // Extract hours from string
      const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)/);
      if (hourMatch) {
        duration = parseFloat(hourMatch[1]);
      } else {
        return null;
      }
    }

    if (typeof duration !== 'number' || duration < 0.5 || duration > 24) {
      return null;
    }
    
    return Math.round(duration * 2) / 2; // Round to nearest 0.5 hour
  }

  /**
   * Enhanced budget normalization with currency detection
   */
  private normalizeBudget(budget: any): ExtractedEntities['budget'] {
    if (!budget || typeof budget !== 'object') return null;

    const { min, max, currency } = budget;
    
    if (typeof min !== 'number' && typeof max !== 'number') return null;

    // Normalize currency codes
    let normalizedCurrency = currency;
    if (typeof currency === 'string') {
      const currencyMap: Record<string, string> = {
        'euro': 'EUR',
        'euros': 'EUR',
        'eur': 'EUR',
        '€': 'EUR',
        'dollar': 'USD',
        'dollars': 'USD',
        'usd': 'USD',
        '$': 'USD',
        'pound': 'GBP',
        'pounds': 'GBP',
        'gbp': 'GBP',
        '£': 'GBP',
      };
      normalizedCurrency = currencyMap[currency.toLowerCase()] || currency.toUpperCase();
    }

    return {
      min: typeof min === 'number' && min > 0 ? min : undefined,
      max: typeof max === 'number' && max > 0 ? max : undefined,
      currency: normalizedCurrency,
    };
  }

  /**
   * Enhanced amenities normalization with standardization
   */
  private normalizeAmenities(amenities: any[]): string[] {
    if (!Array.isArray(amenities)) return [];

    const amenityMap: Record<string, string> = {
      'wi-fi': 'WiFi',
      'wifi': 'WiFi',
      'internet': 'WiFi',
      'wireless': 'WiFi',
      'av equipment': 'AV Equipment',
      'audio visual': 'AV Equipment',
      'projector': 'Projector',
      'microphone': 'Microphone',
      'sound system': 'Sound System',
      'parking': 'Parking',
      'catering': 'Catering',
      'food': 'Catering',
      'air conditioning': 'Air Conditioning',
      'ac': 'Air Conditioning',
      'heating': 'Heating',
      'wheelchair accessible': 'Wheelchair Accessible',
      'accessibility': 'Wheelchair Accessible',
      'ada compliant': 'Wheelchair Accessible',
    };

    return amenities
      .filter(item => typeof item === 'string')
      .map(item => {
        const normalized = item.toLowerCase().trim();
        return amenityMap[normalized] || 
               item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
      })
      .filter((item, index, arr) => arr.indexOf(item) === index) // Remove duplicates
      .slice(0, 10); // Limit to 10 amenities
  }

  /**
   * Enhanced fallback extraction with improved pattern matching
   */
  private async fallbackExtraction(query: string): Promise<EntityExtractionResult> {
    logger.info('Using enhanced fallback pattern-based extraction', {
      query: query.substring(0, 50),
    });

    const entities = this.enhancedPatternExtraction(query);

    return {
      sessionId: this.generateSessionId(),
      entities,
      confidence: {
        overall: entities.location || entities.capacity ? 0.4 : 0.2,
        location: entities.location ? 0.5 : 0,
        date: entities.date ? 0.3 : 0,
        capacity: entities.capacity ? 0.6 : 0,
        eventType: entities.eventType ? 0.4 : 0,
      },
      reasoning: 'Enhanced fallback extraction used - Gemini API unavailable',
      suggestions: [
        'AI service temporarily unavailable',
        'Using pattern-based extraction with reduced accuracy',
        'Please verify extracted information',
        'Try again later for improved results',
      ],
      metadata: {
        processingTime: 50,
        tokens: 0,
        timestamp: new Date().toISOString(),
        model: 'pattern-fallback',
        fallback: true,
        service: 'pattern-fallback',
      },
    };
  }

  /**
   * Enhanced pattern-based extraction for better fallback performance
   */
  private enhancedPatternExtraction(query: string): ExtractedEntities {
    const lowerQuery = query.toLowerCase();

    // Enhanced location extraction with more patterns
    const locationPatterns = [
      /(?:in|at|near)\s+([a-zA-Z\s]{2,30})(?:\s+(?:for|on|next|this|with|,|\.|$))/,
      /venue.*?(?:in|at|near)\s+([a-zA-Z\s]{2,30})/,
      /(?:^|\s)([a-zA-Z\s]{2,30})(?:\s+venue|\s+location)/,
    ];

    let location: string | null = null;
    for (const pattern of locationPatterns) {
      const match = lowerQuery.match(pattern);
      if (match) {
        const candidate = match[1].trim();
        // Filter out common non-location words
        if (!['venue', 'event', 'meeting', 'conference', 'party'].includes(candidate)) {
          location = candidate;
          break;
        }
      }
    }

    // Enhanced capacity extraction
    const capacityPatterns = [
      /(\d+)\s*(?:people|persons|attendees|guests|pax|seats)/,
      /(?:for|accommodate)\s*(\d+)/,
      /capacity\s*(?:of|:)?\s*(\d+)/,
    ];

    let capacity: number | null = null;
    for (const pattern of capacityPatterns) {
      const match = lowerQuery.match(pattern);
      if (match) {
        capacity = parseInt(match[1]);
        break;
      }
    }

    // Enhanced event type extraction
    let eventType: string | null = null;
    for (const type of VENUE_KEYWORDS.eventTypes) {
      if (lowerQuery.includes(type)) {
        eventType = type;
        break;
      }
    }

    // Basic amenities extraction
    const amenities: string[] = [];
    for (const amenity of VENUE_KEYWORDS.amenities) {
      if (lowerQuery.includes(amenity)) {
        amenities.push(amenity);
      }
    }

    return {
      location: this.normalizeLocation(location),
      date: null, // Date parsing is complex for fallback
      capacity: this.normalizeCapacity(capacity),
      eventType: this.normalizeEventType(eventType),
      duration: null,
      budget: null,
      amenities: this.normalizeAmenities(amenities),
    };
  }

  /**
   * Validate input query
   */
  private validateQuery(query: string): void {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    if (query.trim().length < 3) {
      throw new Error('Query must be at least 3 characters long');
    }

    if (query.length > 2000) {
      throw new Error('Query is too long (max 2000 characters)');
    }

    // Basic sanitization
    const sanitized = query.replace(/<[^>]*>/g, '').trim();
    if (sanitized.length !== query.trim().length) {
      throw new Error('Query contains invalid HTML tags');
    }
  }

  /**
   * Validate Gemini response structure
   */
  private validateGeminiResponse(response: any): void {
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
    return `gemini_extraction:${Buffer.from(combined).toString('base64')}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export convenience function for direct use
export async function extractEntities(
  query: string,
  context?: ExtractionContext
): Promise<EntityExtractionResult> {
  const geminiClient = new GeminiApiClient({
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  });
  const service = new EntityExtractionService(geminiClient);
  return service.extractEntities(query, context);
}