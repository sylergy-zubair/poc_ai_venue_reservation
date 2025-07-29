# API Design Specification

## API Design Principles

### RESTful Design
- Use HTTP methods semantically (GET, POST, PUT, DELETE)
- Resource-based URLs with clear hierarchy
- Stateless operations with consistent response formats
- Appropriate HTTP status codes for all responses

### Consistency Standards
- Consistent naming conventions (camelCase for JSON)
- Standardized error response format
- Versioning strategy for future API changes
- Comprehensive input validation and sanitization

### Performance Considerations
- Pagination for large result sets
- Compression for response payloads
- Caching headers for appropriate responses
- Rate limiting to prevent abuse

## API Endpoints Specification

### 1. Entity Extraction API

**Extract entities from natural language query**

```http
POST /api/extract
Content-Type: application/json
```

**Request Body:**
```typescript
interface ExtractRequest {
  query: string;           // User's natural language query
  sessionId?: string;      // Optional existing session ID
  context?: {              // Optional context for better extraction
    previousQuery?: string;
    userPreferences?: any;
  };
}
```

**Response:**
```typescript
interface ExtractResponse {
  sessionId: string;       // Session ID for tracking
  entities: {
    location: string | null;      // Extracted location
    date: string | null;          // ISO date string
    capacity: number | null;      // Number of attendees
    eventType: string | null;     // Type of event
    duration: number | null;      // Event duration in hours
    budget: number | null;        // Budget range
    amenities: string[];          // Required amenities
  };
  confidence: {
    overall: number;         // Overall confidence score (0-1)
    location: number;        // Location confidence
    date: number;            // Date confidence
    capacity: number;        // Capacity confidence
    eventType: number;       // Event type confidence
  };
  suggestions?: string[];    // Suggestions for missing info
  metadata: {
    processingTime: number;  // Processing time in ms
    claudeTokens: number;    // Tokens used
    timestamp: string;       // ISO timestamp
  };
}
```

**Example Request:**
```json
{
  "query": "I need a venue for 300 people in Barcelona next month for a corporate conference"
}
```

**Example Response:**
```json
{
  "sessionId": "sess_abc123def456",
  "entities": {
    "location": "Barcelona",
    "date": "2024-03-15",
    "capacity": 300,
    "eventType": "conference",
    "duration": 8,
    "budget": null,
    "amenities": ["wifi", "av_equipment"]
  },
  "confidence": {
    "overall": 0.92,
    "location": 0.98,
    "date": 0.85,
    "capacity": 0.95,
    "eventType": 0.90
  },
  "suggestions": [
    "Consider specifying your budget range",
    "What time would you prefer to start?"
  ],
  "metadata": {
    "processingTime": 1247,
    "claudeTokens": 156,
    "timestamp": "2024-02-15T10:30:00Z"
  }
}
```

**Error Responses:**
```typescript
// 400 Bad Request
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query must be at least 10 characters long",
    "details": {
      "field": "query",
      "received": "too short"
    }
  }
}

// 429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds",
    "details": {
      "retryAfter": 60,
      "limit": 100,
      "remaining": 0
    }
  }
}

// 503 Service Unavailable
{
  "error": {
    "code": "CLAUDE_API_UNAVAILABLE",
    "message": "AI service temporarily unavailable",
    "details": {
      "fallbackAvailable": false,
      "estimatedRetryTime": "2024-02-15T10:35:00Z"
    }
  }
}
```

### 2. Venue Search API

**Search for venues based on extracted entities**

```http
POST /api/venues/search
Content-Type: application/json
```

**Request Body:**
```typescript
interface VenueSearchRequest {
  sessionId?: string;      // Optional session ID
  entities: {
    location: string;              // Required location
    date?: string;                 // ISO date string
    capacity?: number;             // Minimum capacity
    eventType?: string;            // Event type
    duration?: number;             // Duration in hours
    budget?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    amenities?: string[];          // Required amenities
  };
  filters?: {
    priceRange?: {
      min: number;
      max: number;
    };
    rating?: number;               // Minimum rating
    distance?: number;             // Max distance from location (km)
  };
  pagination?: {
    page?: number;                 // Page number (default: 1)
    limit?: number;                // Results per page (default: 20, max: 100)
  };
  sort?: {
    field: 'price' | 'rating' | 'distance' | 'capacity';
    order: 'asc' | 'desc';
  };
}
```

**Response:**
```typescript
interface VenueSearchResponse {
  searchId: string;        // Unique search ID for tracking
  venues: Venue[];         // Array of matching venues
  totalCount: number;      // Total number of matching venues
  pagination: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters: {               // Applied filters summary
    location: string;
    dateRange?: string;
    capacityRange?: string;
    priceRange?: string;
  };
  metadata: {
    searchTime: number;    // Search time in ms
    providers: string[];   // API providers used
    timestamp: string;
  };
}

interface Venue {
  id: string;
  name: string;
  description: string;
  location: {
    address: string;
    city: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  capacity: {
    min: number;
    max: number;
    recommended: number;
  };
  pricing: {
    hourly: number;
    daily: number;
    currency: string;
    additionalFees?: {
      setup: number;
      cleaning: number;
      service: number;
    };
  };
  amenities: string[];
  images: {
    thumbnail: string;
    gallery: string[];
  };
  availability: {
    date: string;
    timeSlots: {
      start: string;
      end: string;
      available: boolean;
    }[];
  }[];
  rating: {
    average: number;
    reviewCount: number;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  policies: {
    cancellation: string;
    catering: boolean;
    alcohol: boolean;
    smoking: boolean;
  };
}
```

**Example Request:**
```json
{
  "sessionId": "sess_abc123def456",
  "entities": {
    "location": "Barcelona",
    "date": "2024-03-15",
    "capacity": 300,
    "eventType": "conference",
    "amenities": ["wifi", "av_equipment"]
  },
  "filters": {
    "priceRange": {
      "min": 100,
      "max": 500
    },
    "rating": 4.0
  },
  "pagination": {
    "page": 1,
    "limit": 10
  },
  "sort": {
    "field": "rating",
    "order": "desc"
  }
}
```

**Example Response:**
```json
{
  "searchId": "search_xyz789abc123",
  "venues": [
    {
      "id": "venue_bcn_001",
      "name": "Barcelona Convention Center",
      "description": "Modern convention center in the heart of Barcelona",
      "location": {
        "address": "Avinguda Reina Maria Cristina, s/n",
        "city": "Barcelona",
        "country": "Spain",
        "coordinates": {
          "lat": 41.3731,
          "lng": 2.1545
        }
      },
      "capacity": {
        "min": 50,
        "max": 500,
        "recommended": 350
      },
      "pricing": {
        "hourly": 250,
        "daily": 1800,
        "currency": "EUR",
        "additionalFees": {
          "setup": 150,
          "cleaning": 100,
          "service": 200
        }
      },
      "amenities": [
        "wifi",
        "av_equipment",
        "parking",
        "catering_kitchen",
        "air_conditioning"
      ],
      "images": {
        "thumbnail": "https://images.venue.com/bcn001/thumb.jpg",
        "gallery": [
          "https://images.venue.com/bcn001/main.jpg",
          "https://images.venue.com/bcn001/interior.jpg"
        ]
      },
      "availability": [
        {
          "date": "2024-03-15",
          "timeSlots": [
            {
              "start": "09:00",
              "end": "17:00",
              "available": true
            }
          ]
        }
      ],
      "rating": {
        "average": 4.8,
        "reviewCount": 156
      },
      "contact": {
        "phone": "+34 932 000 000",
        "email": "bookings@bcnconvention.com",
        "website": "https://bcnconvention.com"
      },
      "policies": {
        "cancellation": "Free cancellation up to 48 hours before event",
        "catering": true,
        "alcohol": true,
        "smoking": false
      }
    }
  ],
  "totalCount": 23,
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  },
  "filters": {
    "location": "Barcelona",
    "capacityRange": "300+",
    "priceRange": "€100-€500"
  },
  "metadata": {
    "searchTime": 2340,
    "providers": ["VenueProvider1", "VenueProvider2"],
    "timestamp": "2024-02-15T10:32:00Z"
  }
}
```

### 3. Booking API

**Create a venue booking**

```http
POST /api/venues/book
Content-Type: application/json
```

**Request Body:**
```typescript
interface BookingRequest {
  venueId: string;         // Venue identifier
  searchId?: string;       // Optional search ID for tracking
  sessionId?: string;      // Optional session ID
  bookingDetails: {
    date: string;          // ISO date string
    startTime: string;     // Time in HH:MM format
    endTime: string;       // Time in HH:MM format
    attendeeCount: number; // Expected number of attendees
    eventType: string;     // Type of event
    specialRequests?: string; // Additional requirements
  };
  contactInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company?: string;
    title?: string;
  };
  billingInfo?: {
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    taxId?: string;
  };
  paymentIntent?: string;  // Payment processor intent ID
}
```

**Response:**
```typescript
interface BookingResponse {
  bookingId: string;       // Unique booking identifier
  status: 'confirmed' | 'pending' | 'failed';
  confirmationCode: string; // Human-readable confirmation code
  venue: {
    id: string;
    name: string;
    address: string;
  };
  booking: {
    date: string;
    startTime: string;
    endTime: string;
    duration: number;      // Duration in hours
    attendeeCount: number;
  };
  pricing: {
    subtotal: number;
    taxes: number;
    fees: number;
    total: number;
    currency: string;
    breakdown: {
      venueRental: number;
      additionalServices: number;
      taxes: number;
    };
  };
  contact: {
    primaryContact: string;
    email: string;
    phone: string;
  };
  nextSteps: string[];     // Array of next step instructions
  documents?: {
    contract?: string;     // URL to contract document
    invoice?: string;      // URL to invoice
  };
  metadata: {
    bookedAt: string;      // ISO timestamp
    processingTime: number; // Processing time in ms
    provider: string;      // Booking provider used
  };
}
```

**Example Request:**
```json
{
  "venueId": "venue_bcn_001",
  "searchId": "search_xyz789abc123",
  "sessionId": "sess_abc123def456",
  "bookingDetails": {
    "date": "2024-03-15",
    "startTime": "09:00",
    "endTime": "17:00",
    "attendeeCount": 300,
    "eventType": "conference",
    "specialRequests": "Need microphone setup by 8:30 AM"
  },
  "contactInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@company.com",
    "phone": "+1-555-123-4567",
    "company": "Tech Corp",
    "title": "Event Manager"
  },
  "billingInfo": {
    "address": {
      "street": "123 Business Ave",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    },
    "taxId": "12-3456789"
  }
}
```

**Example Response:**
```json
{
  "bookingId": "booking_bcn_240215_001",
  "status": "confirmed",
  "confirmationCode": "BCN-CONF-2024-001",
  "venue": {
    "id": "venue_bcn_001",
    "name": "Barcelona Convention Center",
    "address": "Avinguda Reina Maria Cristina, s/n, Barcelona"
  },
  "booking": {
    "date": "2024-03-15",
    "startTime": "09:00",
    "endTime": "17:00",
    "duration": 8,
    "attendeeCount": 300
  },
  "pricing": {
    "subtotal": 2000,
    "taxes": 420,
    "fees": 350,
    "total": 2770,
    "currency": "EUR",
    "breakdown": {
      "venueRental": 1800,
      "additionalServices": 200,
      "taxes": 420
    }
  },
  "contact": {
    "primaryContact": "John Doe",
    "email": "john.doe@company.com",
    "phone": "+1-555-123-4567"
  },
  "nextSteps": [
    "You will receive a contract within 24 hours",
    "Full payment is due 7 days before the event",
    "Contact venue coordinator for setup details"
  ],
  "documents": {
    "contract": "https://docs.venue.com/contracts/BCN-CONF-2024-001.pdf",
    "invoice": "https://docs.venue.com/invoices/BCN-CONF-2024-001.pdf"
  },
  "metadata": {
    "bookedAt": "2024-02-15T10:35:00Z",
    "processingTime": 3456,
    "provider": "VenueBookingProvider"
  }
}
```

### 4. Health Check APIs

**System health check**

```http
GET /health
```

**Response:**
```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;       // Uptime in seconds
  environment: string;
}
```

**Detailed health check**

```http
GET /health/detailed
```

**Response:**
```typescript
interface DetailedHealthResponse {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      details?: any;
    };
    claudeApi: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      details?: any;
    };
    venueApi: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      details?: any;
    };
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
  timestamp: string;
}
```

## Error Handling Standards

### Error Response Format

All API errors follow a consistent format:

```typescript
interface ErrorResponse {
  error: {
    code: string;          // Machine-readable error code
    message: string;       // Human-readable error message
    details?: any;         // Additional error context
    timestamp: string;     // ISO timestamp
    requestId: string;     // Unique request identifier
    path: string;          // API endpoint path
  };
}
```

### HTTP Status Codes

- **200 OK**: Successful request
- **201 Created**: Resource successfully created
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., booking conflict)
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error
- **502 Bad Gateway**: External service error
- **503 Service Unavailable**: Service temporarily unavailable

### Common Error Codes

```typescript
enum ErrorCodes {
  // Validation Errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Authentication/Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_SESSION = 'INVALID_SESSION',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // External Service Errors
  CLAUDE_API_ERROR = 'CLAUDE_API_ERROR',
  VENUE_API_ERROR = 'VENUE_API_ERROR',
  CLAUDE_API_UNAVAILABLE = 'CLAUDE_API_UNAVAILABLE',
  
  // Business Logic Errors
  VENUE_NOT_AVAILABLE = 'VENUE_NOT_AVAILABLE',
  BOOKING_CONFLICT = 'BOOKING_CONFLICT',
  INSUFFICIENT_CAPACITY = 'INSUFFICIENT_CAPACITY',
  
  // System Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```

## Rate Limiting

### Rate Limit Configuration

```typescript
interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  max: number;           // Maximum requests per window
  message: string;       // Error message when limit exceeded
  standardHeaders: boolean; // Include rate limit headers
  legacyHeaders: boolean;   // Include legacy headers
}

// Default configuration
const defaultRateLimit: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
};
```

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1645875600
Retry-After: 900
```

## API Versioning Strategy

### URL Versioning
```
/api/v1/extract
/api/v1/venues/search
/api/v1/venues/book
```

### Version Support Policy
- Current version: v1
- Backwards compatibility: Maintain for 6 months after new version
- Deprecation notice: 3 months before removal
- Breaking changes: Only in new major versions

## Authentication & Security

### API Key Authentication
```http
Authorization: Bearer your-api-key-here
```

### Request Signing (Optional)
```http
X-Signature: sha256=signature-hash
X-Timestamp: 1645875600
```

### CORS Configuration
```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
```

This API design provides a comprehensive, consistent, and scalable foundation for the venue booking application while maintaining flexibility for future enhancements.