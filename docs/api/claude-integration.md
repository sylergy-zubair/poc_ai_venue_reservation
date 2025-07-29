# Claude AI Integration Guide

## Overview

This guide provides comprehensive instructions for integrating with Claude AI (Anthropic) for natural language processing and entity extraction in the venue booking application. It covers authentication, best practices, error handling, and optimization strategies.

## Claude API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Venue Booking App                       │
│                                                             │
│  ┌─────────────────┐                                       │
│  │ User Interface  │                                       │
│  │ Natural Query   │                                       │
│  └─────────┬───────┘                                       │
│            │                                               │
│            ▼                                               │
│  ┌─────────────────┐    ┌─────────────────┐               │
│  │ Query Processor │    │ Entity Extractor│               │
│  │ - Validation    │    │ - Location      │               │
│  │ - Sanitization  │    │ - Date/Time     │               │
│  │ - Rate Limiting │    │ - Capacity      │               │
│  └─────────┬───────┘    │ - Event Type    │               │
│            │            └─────────┬───────┘               │
│            │                      │                       │
└────────────┼──────────────────────┼───────────────────────┘
             │                      │
             ▼                      ▼
   ┌─────────────────┐    ┌─────────────────┐
   │  Cache Layer    │    │  Claude API     │
   │  (Redis/Memory) │    │  (Anthropic)    │
   └─────────────────┘    └─────────────────┘
```

## API Authentication and Setup

### API Key Configuration

**Environment Variables:**
```bash
# .env
CLAUDE_API_KEY=sk-ant-api03-xxxxx...
CLAUDE_MODEL=claude-3-sonnet-20240229
CLAUDE_MAX_TOKENS=1000
CLAUDE_TIMEOUT=30000
```

**Client Initialization:**
```typescript
// services/claude/client.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeApiClient {
  private client: Anthropic;
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
    });
  }

  async createMessage(params: Anthropic.MessageCreateParams): Promise<Anthropic.Message> {
    try {
      const message = await this.client.messages.create({
        model: this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: this.config.maxTokens || 1000,
        ...params,
      });

      return message;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  private handleApiError(error: any): ClaudeError {
    if (error.status === 429) {
      return new RateLimitError(error.message, error.headers?.['retry-after']);
    }
    if (error.status === 401) {
      return new AuthenticationError('Invalid API key');
    }
    if (error.status === 400) {
      return new ValidationError(error.message);
    }
    return new ClaudeApiError(error.message, error.status);
  }
}

interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  timeout?: number;
}
```

### Custom Error Classes

```typescript
// services/claude/errors.ts
export class ClaudeError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ClaudeError';
  }
}

export class RateLimitError extends ClaudeError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends ClaudeError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ClaudeError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class ClaudeApiError extends ClaudeError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode);
    this.name = 'ClaudeApiError';
  }
}
```

## Entity Extraction Implementation

### Prompt Engineering

**System Prompt for Entity Extraction:**
```typescript
// services/claude/prompts.ts
export const ENTITY_EXTRACTION_SYSTEM_PROMPT = `
You are an expert assistant that extracts venue search parameters from natural language queries.

Your task is to analyze user queries about venue bookings and extract structured information.

Extract the following entities when present:
- location: City, region, or specific area name
- date: Event date (convert relative dates to specific dates when possible)
- capacity: Number of people/attendees
- eventType: Type of event (conference, wedding, party, meeting, etc.)
- duration: Event duration in hours
- budget: Budget range with currency
- amenities: Required facilities or services

Rules:
1. Only extract information explicitly mentioned or clearly implied
2. Use null for missing information
3. Normalize locations to city names
4. Convert relative dates (e.g., "next month") to specific dates when possible
5. Provide confidence scores (0-1) for each extraction
6. Return valid JSON only

Response format:
{
  "entities": {
    "location": "string or null",
    "date": "YYYY-MM-DD or null", 
    "capacity": "number or null",
    "eventType": "string or null",
    "duration": "number or null",
    "budget": {
      "min": "number or null",
      "max": "number or null", 
      "currency": "string or null"
    },
    "amenities": ["array of strings"]
  },
  "confidence": {
    "overall": "number 0-1",
    "location": "number 0-1",
    "date": "number 0-1", 
    "capacity": "number 0-1",
    "eventType": "number 0-1"
  },
  "reasoning": "Brief explanation of extractions"
}
`;

export const buildEntityExtractionPrompt = (query: string, context?: ExtractionContext): string => {
  let prompt = `Extract venue search entities from this query: "${query}"`;
  
  if (context?.previousQuery) {
    prompt += `\n\nPrevious query context: "${context.previousQuery}"`;
  }
  
  if (context?.userLocation) {
    prompt += `\n\nUser's current location: ${context.userLocation}`;
  }
  
  if (context?.dateContext) {
    prompt += `\n\nCurrent date: ${context.dateContext}`;
  }
  
  return prompt;
};

interface ExtractionContext {
  previousQuery?: string;
  userLocation?: string;
  dateContext?: string;
  userPreferences?: Record<string, any>;
}
```

### Entity Extraction Service

```typescript
// services/claude/entityExtraction.ts
export class EntityExtractionService {
  private claudeClient: ClaudeApiClient;
  private cache: CacheService;
  private rateLimiter: RateLimiter;

  constructor(
    claudeClient: ClaudeApiClient,
    cache: CacheService,
    rateLimiter: RateLimiter
  ) {
    this.claudeClient = claudeClient;
    this.cache = cache;
    this.rateLimiter = rateLimiter;
  }

  async extractEntities(
    query: string,
    context?: ExtractionContext
  ): Promise<EntityExtractionResult> {
    // Input validation
    this.validateQuery(query);

    // Check cache first
    const cacheKey = this.generateCacheKey(query, context);
    const cached = await this.cache.get<EntityExtractionResult>(cacheKey);
    if (cached) {
      return { ...cached, metadata: { ...cached.metadata, fromCache: true } };
    }

    // Rate limiting
    await this.rateLimiter.checkLimit('claude-api');

    const startTime = Date.now();

    try {
      // Call Claude API
      const response = await this.claudeClient.createMessage({
        system: ENTITY_EXTRACTION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildEntityExtractionPrompt(query, context),
          },
        ],
      });

      // Process response
      const result = await this.processClaudeResponse(response, query);
      
      // Add metadata
      result.metadata = {
        processingTime: Date.now() - startTime,
        claudeTokens: response.usage.input_tokens + response.usage.output_tokens,
        timestamp: new Date().toISOString(),
        model: response.model,
        fromCache: false,
      };

      // Cache successful result
      await this.cache.set(cacheKey, result, 3600); // 1 hour TTL

      return result;
    } catch (error) {
      if (error instanceof RateLimitError) {
        return this.handleRateLimit(error, query, context);
      }
      
      if (error instanceof ClaudeApiError) {
        return this.handleApiError(error, query, context);
      }

      throw error;
    }
  }

  private async processClaudeResponse(
    response: Anthropic.Message,
    originalQuery: string
  ): Promise<EntityExtractionResult> {
    try {
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const parsed = JSON.parse(content.text);
      
      // Validate response structure
      this.validateClaudeResponse(parsed);

      // Post-process entities
      const processedEntities = this.postProcessEntities(parsed.entities);

      return {
        sessionId: generateSessionId(),
        entities: processedEntities,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        suggestions: this.generateSuggestions(processedEntities, parsed.confidence),
        metadata: {}, // Will be filled by caller
      };
    } catch (error) {
      // Fallback to pattern-based extraction
      return this.fallbackExtraction(originalQuery);
    }
  }

  private postProcessEntities(entities: any): ExtractedEntities {
    return {
      location: this.normalizeLocation(entities.location),
      date: this.normalizeDate(entities.date),
      capacity: this.normalizeCapacity(entities.capacity),
      eventType: this.normalizeEventType(entities.eventType),
      duration: this.normalizeDuration(entities.duration),
      budget: this.normalizeBudget(entities.budget),
      amenities: this.normalizeAmenities(entities.amenities),
    };
  }

  private normalizeLocation(location: string | null): string | null {
    if (!location) return null;
    
    // City name normalization
    const normalized = location.trim().toLowerCase();
    const cityMappings: Record<string, string> = {
      'bcn': 'Barcelona',
      'madrid': 'Madrid',
      'valencia': 'Valencia',
      // Add more mappings as needed
    };
    
    return cityMappings[normalized] || 
           location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();
  }

  private normalizeDate(date: string | null): Date | null {
    if (!date) return null;
    
    try {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return null;
      }
      
      // Ensure date is in the future
      if (parsed < new Date()) {
        return null;
      }
      
      return parsed;
    } catch {
      return null;
    }
  }

  private normalizeCapacity(capacity: number | null): number | null {
    if (!capacity || capacity < 1) return null;
    return Math.floor(capacity);
  }

  private normalizeEventType(eventType: string | null): string | null {
    if (!eventType) return null;
    
    const eventTypeMap: Record<string, string> = {
      'conference': 'conference',
      'meeting': 'meeting',
      'wedding': 'wedding',
      'party': 'party',
      'seminar': 'seminar',
      'workshop': 'workshop',
      // Add more mappings
    };
    
    const normalized = eventType.toLowerCase();
    return eventTypeMap[normalized] || eventType;
  }

  private generateSuggestions(
    entities: ExtractedEntities,
    confidence: ConfidenceScores
  ): string[] {
    const suggestions: string[] = [];
    
    if (!entities.location) {
      suggestions.push('Consider specifying a location for better venue matches');
    }
    
    if (!entities.date) {
      suggestions.push('Adding a specific date will help find available venues');
    }
    
    if (!entities.capacity) {
      suggestions.push('Specifying the number of attendees will improve recommendations');
    }
    
    if (confidence.overall < 0.7) {
      suggestions.push('Try providing more specific details for better results');
    }
    
    return suggestions;
  }

  private async fallbackExtraction(query: string): Promise<EntityExtractionResult> {
    // Simple pattern-based extraction as fallback
    const entities = this.basicPatternExtraction(query);
    
    return {
      sessionId: generateSessionId(),
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
        claudeTokens: 0,
        timestamp: new Date().toISOString(),
        fallback: true,
      },
    };
  }

  private basicPatternExtraction(query: string): ExtractedEntities {
    const lowerQuery = query.toLowerCase();
    
    // Location extraction patterns
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
    const capacityPattern = /(\d+)\s*(?:people|persons|attendees|guests)/;
    const capacityMatch = lowerQuery.match(capacityPattern);
    const capacity = capacityMatch ? parseInt(capacityMatch[1]) : null;
    
    // Event type extraction
    const eventTypes = ['conference', 'meeting', 'wedding', 'party', 'seminar'];
    let eventType: string | null = null;
    for (const type of eventTypes) {
      if (lowerQuery.includes(type)) {
        eventType = type;
        break;
      }
    }
    
    return {
      location,
      date: null, // Date parsing is complex for fallback
      capacity,
      eventType,
      duration: null,
      budget: null,
      amenities: [],
    };
  }

  private validateQuery(query: string): void {
    if (!query || query.trim().length < 5) {
      throw new ValidationError('Query must be at least 5 characters long');
    }
    
    if (query.length > 1000) {
      throw new ValidationError('Query is too long (max 1000 characters)');
    }
    
    // Sanitize input
    const sanitized = query.replace(/<[^>]*>/g, '').trim();
    if (sanitized !== query) {
      throw new ValidationError('Query contains invalid characters');
    }
  }

  private validateClaudeResponse(response: any): void {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format');
    }
    
    if (!response.entities || !response.confidence) {
      throw new Error('Response missing required fields');
    }
    
    // Validate confidence scores
    const { confidence } = response;
    const requiredConfidenceFields = ['overall', 'location', 'date', 'capacity', 'eventType'];
    
    for (const field of requiredConfidenceFields) {
      if (typeof confidence[field] !== 'number' || 
          confidence[field] < 0 || 
          confidence[field] > 1) {
        throw new Error(`Invalid confidence score for ${field}`);
      }
    }
  }

  private generateCacheKey(query: string, context?: ExtractionContext): string {
    const contextStr = context ? JSON.stringify(context) : '';
    return `entity_extraction:${Buffer.from(query + contextStr).toString('base64')}`;
  }

  private async handleRateLimit(
    error: RateLimitError,
    query: string,
    context?: ExtractionContext
  ): Promise<EntityExtractionResult> {
    // Log rate limit hit
    console.warn('Claude API rate limit hit', {
      retryAfter: error.retryAfter,
      query: query.substring(0, 50),
    });

    // Return fallback extraction
    return this.fallbackExtraction(query);
  }

  private async handleApiError(
    error: ClaudeApiError,
    query: string,
    context?: ExtractionContext
  ): Promise<EntityExtractionResult> {
    // Log API error
    console.error('Claude API error', {
      statusCode: error.statusCode,
      message: error.message,
      query: query.substring(0, 50),
    });

    // Return fallback for recoverable errors
    if (error.statusCode && error.statusCode >= 500) {
      return this.fallbackExtraction(query);
    }

    // Re-throw for client errors
    throw error;
  }
}

// Type definitions
interface ExtractedEntities {
  location: string | null;
  date: Date | null;
  capacity: number | null;
  eventType: string | null;
  duration: number | null;
  budget: {
    min?: number;
    max?: number;
    currency?: string;
  } | null;
  amenities: string[];
}

interface ConfidenceScores {
  overall: number;
  location: number;
  date: number;
  capacity: number;
  eventType: number;
}

interface EntityExtractionResult {
  sessionId: string;
  entities: ExtractedEntities;
  confidence: ConfidenceScores;
  reasoning?: string;
  suggestions: string[];
  metadata: {
    processingTime?: number;
    claudeTokens?: number;
    timestamp?: string;
    model?: string;
    fromCache?: boolean;
    fallback?: boolean;
  };
}
```

## Rate Limiting and Caching

### Rate Limiting Implementation

```typescript
// services/claude/rateLimiter.ts
export class RateLimiter {
  private limits: Map<string, RateLimit> = new Map();
  private redis?: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis;
  }

  async checkLimit(key: string, maxRequests = 50, windowMs = 60000): Promise<void> {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (this.redis) {
      await this.checkRedisLimit(key, maxRequests, windowMs, now);
    } else {
      await this.checkMemoryLimit(key, maxRequests, windowStart, now);
    }
  }

  private async checkMemoryLimit(
    key: string,
    maxRequests: number,
    windowStart: number,
    now: number
  ): Promise<void> {
    let limit = this.limits.get(key);
    
    if (!limit) {
      limit = { requests: [], resetTime: now + 60000 };
      this.limits.set(key, limit);
    }

    // Remove old requests
    limit.requests = limit.requests.filter(time => time > windowStart);

    if (limit.requests.length >= maxRequests) {
      const oldestRequest = Math.min(...limit.requests);
      const retryAfter = Math.ceil((oldestRequest + 60000 - now) / 1000);
      throw new RateLimitError('Rate limit exceeded', retryAfter);
    }

    limit.requests.push(now);
  }

  private async checkRedisLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
    now: number
  ): Promise<void> {
    const redisKey = `rate_limit:${key}`;
    
    const count = await this.redis!.incr(redisKey);
    
    if (count === 1) {
      await this.redis!.expire(redisKey, Math.ceil(windowMs / 1000));
    }

    if (count > maxRequests) {
      const ttl = await this.redis!.ttl(redisKey);
      throw new RateLimitError('Rate limit exceeded', ttl);
    }
  }
}

interface RateLimit {
  requests: number[];
  resetTime: number;
}
```

### Caching Strategy

```typescript
// services/claude/cache.ts
export class CacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private redis?: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis;
    
    // Clean up memory cache every 5 minutes
    setInterval(() => this.cleanupMemoryCache(), 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.value as T;
    }

    // Try Redis cache
    if (this.redis) {
      try {
        const redisValue = await this.redis.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue) as T;
          // Populate memory cache
          this.memoryCache.set(key, {
            value: parsed,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
          });
          return parsed;
        }
      } catch (error) {
        console.warn('Redis cache error:', error);
      }
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;

    // Set in memory cache
    this.memoryCache.set(key, { value, expiresAt });

    // Set in Redis cache
    if (this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      } catch (error) {
        console.warn('Redis cache set error:', error);
      }
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
  }
}

interface CacheEntry {
  value: any;
  expiresAt: number;
}
```

## Monitoring and Analytics

### Usage Tracking

```typescript
// services/claude/analytics.ts
export class ClaudeAnalytics {
  private metrics: Map<string, number> = new Map();

  recordApiCall(success: boolean, duration: number, tokens: number): void {
    const date = new Date().toISOString().split('T')[0];
    
    this.incrementMetric(`api_calls_${date}`);
    this.incrementMetric(`api_calls_total`);
    
    if (success) {
      this.incrementMetric(`api_calls_success_${date}`);
      this.incrementMetric(`tokens_used_${date}`, tokens);
      this.recordMetric(`response_time_${date}`, duration);
    } else {
      this.incrementMetric(`api_calls_failed_${date}`);
    }
  }

  recordExtractionAccuracy(confidence: number, userFeedback?: number): void {
    const date = new Date().toISOString().split('T')[0];
    
    this.recordMetric(`confidence_scores_${date}`, confidence);
    
    if (userFeedback) {
      this.recordMetric(`user_feedback_${date}`, userFeedback);
    }
  }

  private incrementMetric(key: string, value = 1): void {
    this.metrics.set(key, (this.metrics.get(key) || 0) + value);
  }

  private recordMetric(key: string, value: number): void {
    const values = this.getMetricArray(key);
    values.push(value);
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
  }

  private getMetricArray(key: string): number[] {
    const existing = this.metrics.get(key);
    if (Array.isArray(existing)) {
      return existing;
    }
    
    const array: number[] = [];
    this.metrics.set(key, array as any);
    return array;
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of this.metrics.entries()) {
      if (Array.isArray(value)) {
        result[key] = {
          count: value.length,
          average: value.reduce((a, b) => a + b, 0) / value.length,
          min: Math.min(...value),
          max: Math.max(...value),
        };
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
}
```

## Best Practices and Optimization

### Prompt Optimization

1. **Be Specific**: Clearly define expected output format
2. **Use Examples**: Provide few-shot examples for complex extractions
3. **Set Constraints**: Define validation rules and boundaries
4. **Handle Edge Cases**: Account for ambiguous or incomplete queries

### Cost Optimization

1. **Caching**: Cache responses to avoid duplicate API calls
2. **Token Management**: Optimize prompt length and response size
3. **Rate Limiting**: Implement proper rate limiting to avoid overages
4. **Fallback Strategies**: Use pattern-based extraction for simple cases

### Error Resilience

1. **Circuit Breaker**: Implement circuit breaker pattern for API failures
2. **Graceful Degradation**: Provide fallback extraction methods
3. **Retry Logic**: Implement exponential backoff for transient errors
4. **Monitoring**: Track API health and performance metrics

### Security Considerations

1. **Input Sanitization**: Validate and sanitize all user inputs
2. **API Key Security**: Securely store and rotate API keys
3. **Request Logging**: Log requests for debugging without exposing sensitive data
4. **Response Validation**: Validate API responses before processing

This Claude integration provides a robust, scalable, and maintainable solution for natural language processing in the venue booking application while following best practices for error handling, caching, and performance optimization.