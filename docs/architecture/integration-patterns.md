# Integration Patterns and External Services

## Overview

This document outlines the integration patterns, external service architectures, and communication protocols used in the AI-Powered Venue Search & Booking POC. The system integrates with multiple external services requiring robust error handling, retry mechanisms, and fallback strategies.

## External Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Venue Booking Application                  │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Frontend      │    │   Backend API   │                │
│  │   (Next.js)     │    │   (Node.js)     │                │
│  └─────────────────┘    └─────────────────┘                │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐
         │  Claude AI  │ │ Venue API │ │ Monitoring│
         │ (Anthropic) │ │Providers  │ │ Services  │
         └─────────────┘ └───────────┘ └───────────┘
```

## Claude AI Integration Pattern

### Service Architecture

The Claude AI integration follows a service adapter pattern with retry logic, rate limiting, and response caching.

```typescript
interface ClaudeIntegrationConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  rateLimitPerMinute: number;
  cacheTTL: number;
}

class ClaudeIntegrationService {
  private client: ClaudeApiClient;
  private cache: Cache;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;

  constructor(config: ClaudeIntegrationConfig) {
    this.client = new ClaudeApiClient(config);
    this.cache = new Cache({ ttl: config.cacheTTL });
    this.rateLimiter = new RateLimiter(config.rateLimitPerMinute);
    this.circuitBreaker = new CircuitBreaker({
      timeout: config.timeout,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });
  }
}
```

### Entity Extraction Pattern

**Request Flow:**
```
User Query → Input Validation → Rate Limiting → Circuit Breaker → Claude API → Response Processing → Caching → Error Handling
```

**Implementation:**
```typescript
class EntityExtractionService {
  async extractEntities(query: string, sessionId?: string): Promise<EntityExtractionResult> {
    // Input validation
    this.validateQuery(query);
    
    // Check cache first
    const cacheKey = this.generateCacheKey(query);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Rate limiting
    await this.rateLimiter.waitForToken();
    
    try {
      // Circuit breaker protection
      const result = await this.circuitBreaker.execute(async () => {
        return await this.callClaudeAPI(query);
      });
      
      // Process and validate response
      const processed = await this.processClaudeResponse(result);
      
      // Cache successful result
      await this.cache.set(cacheKey, processed);
      
      // Log successful call
      await this.auditService.logApiCall({
        service: 'claude',
        operation: 'extract_entities',
        success: true,
        duration: result.duration,
        tokens: result.tokens
      });
      
      return processed;
      
    } catch (error) {
      // Handle different error types
      return await this.handleClaudeError(error, query, sessionId);
    }
  }

  private async callClaudeAPI(query: string): Promise<ClaudeResponse> {
    const prompt = this.buildExtractionPrompt(query);
    
    const response = await this.client.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    return {
      content: response.content[0].text,
      tokens: response.usage.input_tokens + response.usage.output_tokens,
      duration: response.duration
    };
  }

  private buildExtractionPrompt(query: string): string {
    return `
      Extract venue search entities from this query: "${query}"
      
      Return a JSON object with the following structure:
      {
        "location": "city or area name (string or null)",
        "date": "event date in ISO format (string or null)",
        "capacity": "number of attendees (number or null)",
        "eventType": "type of event (string or null)",
        "duration": "event duration in hours (number or null)",
        "budget": {
          "min": "minimum budget (number or null)",
          "max": "maximum budget (number or null)",
          "currency": "currency code (string or null)"
        },
        "amenities": ["required amenities (array of strings)"],
        "confidence": {
          "overall": "confidence score 0-1 (number)",
          "location": "location confidence 0-1 (number)",
          "date": "date confidence 0-1 (number)",
          "capacity": "capacity confidence 0-1 (number)",
          "eventType": "event type confidence 0-1 (number)"
        }
      }
      
      Rules:
      - Only extract information explicitly mentioned in the query
      - Use null for missing information
      - Provide confidence scores based on clarity of information
      - Normalize locations to city names
      - Convert relative dates to specific dates when possible
    `;
  }
}
```

### Error Handling Strategy

```typescript
enum ClaudeErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  INVALID_API_KEY = 'INVALID_API_KEY',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

class ClaudeErrorHandler {
  async handleError(error: any, query: string, sessionId?: string): Promise<EntityExtractionResult> {
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case ClaudeErrorType.RATE_LIMIT:
        return await this.handleRateLimit(error, query, sessionId);
      
      case ClaudeErrorType.TIMEOUT:
        return await this.handleTimeout(error, query, sessionId);
      
      case ClaudeErrorType.SERVICE_UNAVAILABLE:
        return await this.handleServiceUnavailable(error, query, sessionId);
      
      case ClaudeErrorType.QUOTA_EXCEEDED:
        return await this.handleQuotaExceeded(error, query, sessionId);
      
      case ClaudeErrorType.INVALID_RESPONSE:
        return await this.handleInvalidResponse(error, query, sessionId);
      
      default:
        return await this.handleGenericError(error, query, sessionId);
    }
  }

  private async handleRateLimit(error: any, query: string, sessionId?: string): Promise<EntityExtractionResult> {
    const retryAfter = error.headers?.['retry-after'] || 60;
    
    // Log rate limit hit
    await this.auditService.logError({
      service: 'claude',
      error: 'RATE_LIMIT',
      retryAfter,
      sessionId
    });
    
    // Try fallback extraction
    return await this.fallbackExtraction(query, sessionId);
  }

  private async fallbackExtraction(query: string, sessionId?: string): Promise<EntityExtractionResult> {
    return {
      sessionId: sessionId || generateSessionId(),
      entities: await this.basicPatternExtraction(query),
      confidence: {
        overall: 0.3, // Low confidence for fallback
        location: 0.3,
        date: 0.3,
        capacity: 0.3,
        eventType: 0.3
      },
      suggestions: ['Claude AI temporarily unavailable. Please verify extracted information.'],
      metadata: {
        processingTime: 50,
        claudeTokens: 0,
        timestamp: new Date().toISOString(),
        fallback: true
      }
    };
  }
}
```

## Venue API Integration Pattern

### Multi-Provider Architecture

The system supports multiple venue booking providers through a unified interface with provider-specific adapters.

```typescript
interface VenueProvider {
  name: string;
  searchVenues(criteria: VenueSearchCriteria): Promise<Venue[]>;
  getVenueDetails(venueId: string): Promise<VenueDetails>;
  createBooking(request: BookingRequest): Promise<BookingResponse>;
  checkAvailability(venueId: string, date: Date): Promise<AvailabilityResponse>;
}

class VenueAggregationService {
  private providers: Map<string, VenueProvider>;
  private loadBalancer: LoadBalancer;
  private resultMerger: ResultMerger;

  constructor() {
    this.providers = new Map();
    this.loadBalancer = new LoadBalancer();
    this.resultMerger = new ResultMerger();
    
    // Register providers
    this.registerProvider('meetingpackage', new MeetingPackageProvider());
    this.registerProvider('ivvy', new IvvyProvider());
    this.registerProvider('eventup', new EventUpProvider());
  }

  async searchVenues(criteria: VenueSearchCriteria): Promise<VenueSearchResponse> {
    const availableProviders = await this.getHealthyProviders();
    
    if (availableProviders.length === 0) {
      throw new ServiceUnavailableError('No venue providers available');
    }
    
    // Parallel search across providers
    const searchPromises = availableProviders.map(async provider => {
      try {
        const results = await this.searchWithProvider(provider, criteria);
        return { provider: provider.name, results, success: true };
      } catch (error) {
        return { provider: provider.name, error, success: false };
      }
    });
    
    const searchResults = await Promise.allSettled(searchPromises);
    
    // Merge and rank results
    const successfulResults = searchResults
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => result.value);
    
    if (successfulResults.length === 0) {
      throw new ServiceUnavailableError('All venue providers failed');
    }
    
    const mergedResults = await this.resultMerger.merge(successfulResults);
    
    return {
      searchId: generateSearchId(),
      venues: mergedResults,
      totalCount: mergedResults.length,
      providers: successfulResults.map(r => r.provider),
      metadata: {
        searchTime: Date.now() - startTime,
        providersQueried: availableProviders.length,
        providersSuccessful: successfulResults.length
      }
    };
  }
}
```

### Provider-Specific Adapters

**MeetingPackage Provider:**
```typescript
class MeetingPackageProvider implements VenueProvider {
  name = 'meetingpackage';
  private client: MeetingPackageClient;
  private mapper: MeetingPackageMapper;

  async searchVenues(criteria: VenueSearchCriteria): Promise<Venue[]> {
    const apiRequest = this.mapper.mapSearchCriteria(criteria);
    
    const response = await this.client.post('/venues/search', apiRequest);
    
    return response.data.venues.map(venue => 
      this.mapper.mapVenueFromAPI(venue)
    );
  }

  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    const apiRequest = this.mapper.mapBookingRequest(request);
    
    const response = await this.client.post('/bookings', apiRequest);
    
    return this.mapper.mapBookingResponse(response.data);
  }
}

class MeetingPackageMapper {
  mapSearchCriteria(criteria: VenueSearchCriteria): any {
    return {
      location: criteria.location,
      attendees: criteria.capacity,
      date_from: criteria.date?.toISOString(),
      event_type: this.mapEventType(criteria.eventType),
      amenities: criteria.amenities?.map(a => this.mapAmenity(a))
    };
  }

  mapVenueFromAPI(apiVenue: any): Venue {
    return {
      id: `mp_${apiVenue.id}`,
      name: apiVenue.name,
      description: apiVenue.description,
      location: {
        address: apiVenue.address.full,
        city: apiVenue.address.city,
        country: apiVenue.address.country,
        coordinates: {
          lat: apiVenue.coordinates.latitude,
          lng: apiVenue.coordinates.longitude
        }
      },
      capacity: {
        min: apiVenue.capacity.min,
        max: apiVenue.capacity.max,
        recommended: apiVenue.capacity.recommended
      },
      pricing: {
        hourly: apiVenue.pricing.hourly,
        daily: apiVenue.pricing.daily,
        currency: apiVenue.pricing.currency
      },
      amenities: apiVenue.amenities.map(a => this.mapAmenityFromAPI(a)),
      images: {
        thumbnail: apiVenue.images.thumbnail,
        gallery: apiVenue.images.gallery
      }
    };
  }
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private threshold = 5,
    private timeout = 60000,
    private monitoringPeriod = 30000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new CircuitBreakerOpenError('Circuit breaker is OPEN');
      } else {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 3) {
          this.state = 'CLOSED';
          this.failures = 0;
        }
      } else if (this.state === 'CLOSED') {
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
      } else if (this.state === 'HALF_OPEN') {
        this.state = 'OPEN';
      }
      
      throw error;
    }
  }
}
```

## Monitoring and Observability Integration

### Health Check Pattern

```typescript
class HealthCheckService {
  private checks: Map<string, HealthChecker> = new Map();

  constructor() {
    this.registerCheck('database', new DatabaseHealthChecker());
    this.registerCheck('claude', new ClaudeHealthChecker());
    this.registerCheck('venue-providers', new VenueProvidersHealthChecker());
    this.registerCheck('system', new SystemHealthChecker());
  }

  async checkAll(): Promise<HealthReport> {
    const results = new Map<string, HealthCheckResult>();
    
    const checkPromises = Array.from(this.checks.entries()).map(
      async ([name, checker]) => {
        try {
          const result = await Promise.race([
            checker.check(),
            this.timeout(5000)
          ]);
          results.set(name, result);
        } catch (error) {
          results.set(name, {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    );

    await Promise.all(checkPromises);

    const overallStatus = this.determineOverallStatus(results);

    return {
      status: overallStatus,
      checks: Object.fromEntries(results),
      timestamp: new Date().toISOString()
    };
  }
}

class ClaudeHealthChecker implements HealthChecker {
  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple API test
      const response = await this.claudeClient.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 5000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          model: response.model,
          tokens: response.usage?.total_tokens
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }
}
```

### Metrics Collection Pattern

```typescript
class MetricsCollector {
  private prometheus: PrometheusRegistry;
  private metrics: Map<string, any> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // HTTP request metrics
    this.metrics.set('http_requests_total', new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status']
    }));

    // External API call metrics
    this.metrics.set('external_api_calls_total', new Counter({
      name: 'external_api_calls_total',
      help: 'Total external API calls',
      labelNames: ['service', 'operation', 'status']
    }));

    // Response time metrics
    this.metrics.set('response_time_histogram', new Histogram({
      name: 'response_time_seconds',
      help: 'Response time in seconds',
      labelNames: ['service', 'operation'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    }));

    // Entity extraction metrics
    this.metrics.set('entity_extraction_confidence', new Histogram({
      name: 'entity_extraction_confidence',
      help: 'Entity extraction confidence scores',
      labelNames: ['entity_type'],
      buckets: [0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 1.0]
    }));
  }

  recordHttpRequest(method: string, route: string, status: number) {
    this.metrics.get('http_requests_total')
      .labels(method, route, status.toString())
      .inc();
  }

  recordExternalApiCall(service: string, operation: string, success: boolean, duration: number) {
    this.metrics.get('external_api_calls_total')
      .labels(service, operation, success ? 'success' : 'failure')
      .inc();

    this.metrics.get('response_time_histogram')
      .labels(service, operation)
      .observe(duration / 1000);
  }

  recordEntityExtractionConfidence(entityType: string, confidence: number) {
    this.metrics.get('entity_extraction_confidence')
      .labels(entityType)
      .observe(confidence);
  }
}
```

## Caching Strategy

### Multi-Level Caching

```typescript
class CacheManager {
  private l1Cache: MemoryCache;     // In-memory cache
  private l2Cache: RedisCache;      // Redis cache
  private l3Cache: DatabaseCache;   // Database cache

  constructor() {
    this.l1Cache = new MemoryCache({ ttl: 300 }); // 5 minutes
    this.l2Cache = new RedisCache({ ttl: 3600 }); // 1 hour
    this.l3Cache = new DatabaseCache({ ttl: 86400 }); // 24 hours
  }

  async get<T>(key: string): Promise<T | null> {
    // Try L1 cache first
    let value = await this.l1Cache.get<T>(key);
    if (value) {
      return value;
    }

    // Try L2 cache
    value = await this.l2Cache.get<T>(key);
    if (value) {
      // Populate L1 cache
      await this.l1Cache.set(key, value);
      return value;
    }

    // Try L3 cache
    value = await this.l3Cache.get<T>(key);
    if (value) {
      // Populate L1 and L2 caches
      await Promise.all([
        this.l1Cache.set(key, value),
        this.l2Cache.set(key, value)
      ]);
      return value;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await Promise.all([
      this.l1Cache.set(key, value, ttl),
      this.l2Cache.set(key, value, ttl),
      this.l3Cache.set(key, value, ttl)
    ]);
  }
}
```

## Security Patterns

### API Key Management

```typescript
class ApiKeyManager {
  private keys: Map<string, ApiKeyConfig> = new Map();
  private rotationSchedule: CronJob;

  constructor() {
    this.loadApiKeys();
    this.setupKeyRotation();
  }

  private loadApiKeys() {
    const claudeKey = {
      service: 'claude',
      key: process.env.CLAUDE_API_KEY,
      rotationInterval: 30 * 24 * 3600 * 1000, // 30 days
      lastRotated: new Date(process.env.CLAUDE_KEY_LAST_ROTATED || Date.now())
    };

    this.keys.set('claude', claudeKey);
  }

  async getKey(service: string): Promise<string> {
    const config = this.keys.get(service);
    if (!config) {
      throw new Error(`API key not found for service: ${service}`);
    }

    // Check if key needs rotation
    if (this.needsRotation(config)) {
      await this.rotateKey(service);
    }

    return config.key;
  }

  private async rotateKey(service: string): Promise<void> {
    // Implementation depends on the service's key rotation API
    // This is a placeholder for the rotation logic
    console.log(`Rotating API key for service: ${service}`);
  }
}
```

This integration pattern ensures robust, scalable, and maintainable connections with external services while providing comprehensive monitoring and error handling capabilities.