# Phase 2: Core Backend API Development

**Duration**: Week 2-3  
**Goal**: TDD-driven backend API with Ollama LLM integration  
**Status**: Completed  
**Prerequisites**: Phase 1 completed

## Overview

Phase 2 focuses on building the core backend API services using strict TDD methodology. This includes integrating with Ollama LLM (Llama 3.1 8B) for natural language processing, implementing venue API integration, and creating a robust data layer for session management and logging.

## Deliverables

### 2.1 Entity Extraction Service (TDD)

**Objective**: Implement natural language processing using Ollama LLM to extract venue search entities

#### Core Functionality
- Parse natural language queries (e.g., "I need a venue for 300 people in Barcelona next month")
- Extract key entities: location, date, attendee count, event type
- Validate and normalize extracted data
- Handle edge cases and ambiguous queries

#### TDD Test Scenarios

**Test Suite 1: Entity Extraction**
```javascript
describe('Entity Extraction Service', () => {
  describe('parseVenueQuery', () => {
    test('should extract location, date, and capacity from natural language', async () => {
      const query = "I need a venue for 300 people in Barcelona next month";
      const result = await entityExtractionService.parseVenueQuery(query);
      
      expect(result).toEqual({
        location: "Barcelona",
        capacity: 300,
        date: expect.any(Date),
        eventType: null,
        confidence: expect.any(Number)
      });
    });

    test('should handle specific dates', async () => {
      const query = "Conference room for 50 people in London on December 15th";
      const result = await entityExtractionService.parseVenueQuery(query);
      
      expect(result.date.getMonth()).toBe(11); // December
      expect(result.date.getDate()).toBe(15);
      expect(result.location).toBe("London");
      expect(result.capacity).toBe(50);
    });

    test('should extract event type when mentioned', async () => {
      const query = "Wedding venue for 200 guests in Paris";
      const result = await entityExtractionService.parseVenueQuery(query);
      
      expect(result.eventType).toBe("wedding");
      expect(result.capacity).toBe(200);
    });

    test('should handle missing information gracefully', async () => {
      const query = "Looking for a venue in Barcelona";
      const result = await entityExtractionService.parseVenueQuery(query);
      
      expect(result.location).toBe("Barcelona");
      expect(result.capacity).toBeNull();
      expect(result.date).toBeNull();
    });
  });
});
```

#### Implementation Structure

**Entity Extraction Service**:
```typescript
interface VenueQuery {
  location: string | null;
  date: Date | null;
  capacity: number | null;
  eventType: string | null;
  confidence: number;
}

class EntityExtractionService {
  constructor(private claudeApiClient: ClaudeApiClient) {}

  async parseVenueQuery(query: string): Promise<VenueQuery> {
    // Implementation will be driven by failing tests
  }

  private validateExtractedEntities(entities: any): VenueQuery {
    // Validation logic
  }

  private normalizeDate(dateString: string): Date | null {
    // Date normalization logic
  }
}
```

**Claude API Integration**:
```typescript
class ClaudeApiClient {
  constructor(private apiKey: string) {}

  async extractEntities(prompt: string): Promise<any> {
    // Claude API integration
  }

  private buildExtractionPrompt(query: string): string {
    return `
      Extract venue search entities from this query: "${query}"
      
      Return JSON with:
      - location: string (city/area name)
      - date: string (ISO format or relative like "next month")
      - capacity: number (number of people/attendees)
      - eventType: string (wedding, conference, party, etc.)
      - confidence: number (0-1, extraction confidence)
    `;
  }
}
```

### 2.2 Venue API Integration (TDD)

**Objective**: Create abstraction layer for venue booking APIs with mock implementations for testing

#### Core Functionality
- Abstract interface for venue API providers
- Search venues based on extracted entities
- Handle booking requests
- Error handling and rate limiting

#### TDD Test Scenarios

**Test Suite 2: Venue API Integration**
```javascript
describe('Venue API Service', () => {
  let venueApiService;
  let mockVenueProvider;

  beforeEach(() => {
    mockVenueProvider = new MockVenueProvider();
    venueApiService = new VenueApiService(mockVenueProvider);
  });

  describe('searchVenues', () => {
    test('should return venues matching search criteria', async () => {
      const searchCriteria = {
        location: "Barcelona",
        capacity: 300,
        date: new Date('2024-03-15')
      };

      mockVenueProvider.setMockResponse([
        {
          id: "venue-1",
          name: "Barcelona Convention Center",
          location: "Barcelona",
          capacity: 500,
          availableDates: ["2024-03-15"],
          pricePerHour: 200
        }
      ]);

      const results = await venueApiService.searchVenues(searchCriteria);
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Barcelona Convention Center");
      expect(results[0].capacity).toBeGreaterThanOrEqual(300);
    });

    test('should handle API errors gracefully', async () => {
      mockVenueProvider.setMockError(new Error('API unavailable'));
      
      const searchCriteria = { location: "Barcelona" };
      
      await expect(venueApiService.searchVenues(searchCriteria))
        .rejects.toThrow('Venue search temporarily unavailable');
    });

    test('should filter venues by capacity', async () => {
      const venues = [
        { id: "1", capacity: 100 },
        { id: "2", capacity: 400 },
        { id: "3", capacity: 50 }
      ];
      
      mockVenueProvider.setMockResponse(venues);
      
      const results = await venueApiService.searchVenues({ capacity: 300 });
      const validVenues = results.filter(v => v.capacity >= 300);
      
      expect(validVenues).toHaveLength(1);
      expect(validVenues[0].capacity).toBe(400);
    });
  });

  describe('createBooking', () => {
    test('should create booking with contact information', async () => {
      const bookingRequest = {
        venueId: "venue-1",
        date: new Date('2024-03-15'),
        duration: 4,
        contactInfo: {
          name: "John Doe",
          email: "john@example.com",
          phone: "+1234567890"
        }
      };

      mockVenueProvider.setMockBookingResponse({
        bookingId: "booking-123",
        status: "confirmed",
        confirmationEmail: "john@example.com"
      });

      const result = await venueApiService.createBooking(bookingRequest);
      
      expect(result.bookingId).toBe("booking-123");
      expect(result.status).toBe("confirmed");
    });
  });
});
```

#### Implementation Structure

**Venue API Service**:
```typescript
interface VenueSearchCriteria {
  location?: string;
  date?: Date;
  capacity?: number;
  eventType?: string;
}

interface Venue {
  id: string;
  name: string;
  location: string;
  capacity: number;
  availableDates: Date[];
  pricePerHour: number;
  amenities: string[];
  images: string[];
}

interface BookingRequest {
  venueId: string;
  date: Date;
  duration: number;
  contactInfo: ContactInfo;
}

class VenueApiService {
  constructor(private provider: VenueProvider) {}

  async searchVenues(criteria: VenueSearchCriteria): Promise<Venue[]> {
    // Implementation driven by tests
  }

  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    // Implementation driven by tests
  }
}
```

### 2.3 Database Layer (TDD)

**Objective**: Implement data persistence with session management and logging

#### Core Functionality
- Session management for user queries
- Audit logging for API calls
- Query history (temporary storage)
- Error tracking and monitoring

#### TDD Test Scenarios

**Test Suite 3: Database Layer**
```javascript
describe('Database Layer', () => {
  let sessionService;
  let auditService;
  let db;

  beforeEach(async () => {
    db = await createTestDatabase();
    sessionService = new SessionService(db);
    auditService = new AuditService(db);
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  describe('Session Management', () => {
    test('should create and retrieve user session', async () => {
      const sessionData = {
        query: "venue for 100 people in Madrid",
        extractedEntities: { location: "Madrid", capacity: 100 },
        timestamp: new Date()
      };

      const sessionId = await sessionService.createSession(sessionData);
      const retrieved = await sessionService.getSession(sessionId);

      expect(retrieved.query).toBe(sessionData.query);
      expect(retrieved.extractedEntities.location).toBe("Madrid");
    });

    test('should expire sessions after specified time', async () => {
      const sessionId = await sessionService.createSession({ query: "test" });
      
      // Mock time passage
      jest.advanceTimersByTime(30 * 60 * 1000); // 30 minutes
      
      const retrieved = await sessionService.getSession(sessionId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Audit Logging', () => {
    test('should log API calls with details', async () => {
      const logEntry = {
        endpoint: '/api/search',
        method: 'POST',
        query: 'venue in Barcelona',
        response: { venueCount: 5 },
        duration: 1250,
        timestamp: new Date()
      };

      await auditService.logApiCall(logEntry);
      
      const logs = await auditService.getRecentLogs(1);
      expect(logs[0].endpoint).toBe('/api/search');
      expect(logs[0].duration).toBe(1250);
    });

    test('should log errors with stack traces', async () => {
      const error = new Error('Claude API timeout');
      error.stack = 'Error: Claude API timeout\n  at ...';

      await auditService.logError(error, {
        context: 'entity-extraction',
        query: 'problematic query'
      });

      const errorLogs = await auditService.getErrorLogs();
      expect(errorLogs[0].message).toBe('Claude API timeout');
      expect(errorLogs[0].context).toBe('entity-extraction');
    });
  });
});
```

## API Endpoints Design

### Core REST API Routes

**1. Entity Extraction Endpoint**
```
POST /api/extract
Body: { query: string }
Response: {
  entities: VenueQuery,
  sessionId: string,
  suggestions?: string[]
}
```

**2. Venue Search Endpoint**
```
POST /api/venues/search
Body: {
  sessionId?: string,
  entities: VenueSearchCriteria,
  overrides?: Partial<VenueSearchCriteria>
}
Response: {
  venues: Venue[],
  totalCount: number,
  searchId: string
}
```

**3. Booking Endpoint**
```
POST /api/venues/book
Body: {
  venueId: string,
  searchId: string,
  contactInfo: ContactInfo,
  bookingDetails: BookingDetails
}
Response: {
  bookingId: string,
  status: 'confirmed' | 'pending' | 'failed',
  confirmationDetails: any
}
```

## Error Handling Strategy

### Error Types and Handling
1. **Claude API Errors**: Timeout, rate limits, invalid responses
2. **Venue API Errors**: Service unavailable, invalid requests
3. **Validation Errors**: Invalid input data, missing required fields
4. **Database Errors**: Connection issues, constraint violations

### Error Response Format
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  }
}
```

## Performance Requirements

- Entity extraction: < 2 seconds
- Venue search: < 5 seconds
- Database operations: < 500ms
- Error responses: < 100ms

## Security Considerations

- API key rotation and secure storage
- Request rate limiting
- Input validation and sanitization
- PII data encryption in transit
- Session data cleanup

## Acceptance Criteria

- [ ] All TDD tests pass with 80%+ coverage
- [ ] Claude API integration extracts entities accurately
- [ ] Venue API abstraction supports multiple providers
- [ ] Database layer handles sessions and logging
- [ ] API endpoints follow RESTful conventions
- [ ] Error handling provides clear, actionable messages
- [ ] Performance requirements are met
- [ ] Security measures are implemented

## Dependencies

- Claude API access and credentials
- Venue API provider access (MockVenueProvider for development)
- MongoDB instance (containerized)
- Redis for session storage (optional)

## Risk Mitigation

- **Risk**: Claude API rate limits or downtime
  - **Mitigation**: Implement retry logic and fallback entity extraction
  
- **Risk**: Venue API reliability
  - **Mitigation**: Multiple provider support and circuit breaker pattern
  
- **Risk**: Database performance
  - **Mitigation**: Proper indexing and query optimization

## Phase 2 Completion Checklist

- [ ] Entity extraction service with full test coverage
- [ ] Venue API integration with mock provider
- [ ] Database layer with session and audit capabilities
- [ ] All API endpoints implemented and tested
- [ ] Error handling and logging functional
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Integration with Phase 1 infrastructure verified