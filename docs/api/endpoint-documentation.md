# API Endpoint Documentation

## Overview

This document provides comprehensive documentation for all API endpoints in the AI-powered venue booking application. It includes detailed request/response schemas, authentication requirements, error codes, and practical examples.

## Base URL and Versioning

**Base URL:** `https://api.venue-booking.com/v1`  
**API Version:** v1  
**Content Type:** `application/json`  
**Authentication:** Bearer token (where required)

## Authentication

### Authentication Header

```http
Authorization: Bearer <your-jwt-token>
```

### API Key Authentication (for admin endpoints)

```http
X-API-Key: <your-api-key>
```

## Global Response Format

### Success Response Structure

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "metadata": {
    "timestamp": "2024-02-15T10:30:00Z",
    "requestId": "req_abc123def456",
    "version": "1.0"
  }
}
```

### Error Response Structure

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error context
    }
  },
  "metadata": {
    "timestamp": "2024-02-15T10:30:00Z",
    "requestId": "req_abc123def456"
  }
}
```

## Entity Extraction Endpoints

### Extract Entities from Natural Language Query

Extract venue search parameters from a natural language query using AI.

**Endpoint:** `POST /api/extract`  
**Authentication:** None required  
**Rate Limit:** 100 requests per minute per IP

#### Request

```json
{
  "query": "I need a venue for 300 people in Barcelona next month for a corporate conference",
  "sessionId": "sess_abc123def456",
  "context": {
    "previousQuery": "venue for meeting",
    "userLocation": "Madrid, Spain",
    "dateContext": "2024-02-15",
    "userPreferences": {
      "currency": "EUR",
      "language": "en"
    }
  }
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | Natural language venue search query (5-1000 characters) |
| `sessionId` | string | No | Existing session ID for context |
| `context` | object | No | Additional context to improve extraction |
| `context.previousQuery` | string | No | Previous query in the session |
| `context.userLocation` | string | No | User's current location |
| `context.dateContext` | string | No | Current date for relative date processing |
| `context.userPreferences` | object | No | User preferences (currency, language, etc.) |

#### Response

```json
{
  "success": true,
  "data": {
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
      "timestamp": "2024-02-15T10:30:00Z",
      "model": "claude-3-sonnet-20240229",
      "fromCache": false
    }
  }
}
```

#### Error Examples

**Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query must be at least 5 characters long",
    "details": {
      "field": "query",
      "received": "hi",
      "minimum": 5
    }
  }
}
```

**Rate Limit Error (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds",
    "details": {
      "retryAfter": 60,
      "limit": 100,
      "remaining": 0,
      "resetTime": "2024-02-15T10:31:00Z"
    }
  }
}
```

**AI Service Error (503):**
```json
{
  "success": false,
  "error": {
    "code": "CLAUDE_API_UNAVAILABLE",
    "message": "AI service temporarily unavailable",
    "details": {
      "fallbackAvailable": true,
      "estimatedRetryTime": "2024-02-15T10:35:00Z"
    }
  }
}
```

## Venue Search Endpoints

### Search Venues

Search for venues based on extracted entities or manual criteria.

**Endpoint:** `POST /api/venues/search`  
**Authentication:** None required  
**Rate Limit:** 50 requests per minute per IP

#### Request

```json
{
  "sessionId": "sess_abc123def456",
  "entities": {
    "location": "Barcelona",
    "date": "2024-03-15",
    "capacity": 300,
    "eventType": "conference",
    "duration": 8,
    "amenities": ["wifi", "av_equipment"]
  },
  "filters": {
    "priceRange": {
      "min": 100,
      "max": 500,
      "currency": "EUR"
    },
    "rating": 4.0,
    "distance": 25,
    "verified": true
  },
  "pagination": {
    "page": 1,
    "limit": 20
  },
  "sort": {
    "field": "rating",
    "order": "desc"
  }
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entities` | object | Yes | Search criteria |
| `entities.location` | string | Yes | City or location name |
| `entities.date` | string | No | Event date (ISO format) |
| `entities.capacity` | number | No | Number of attendees |
| `entities.eventType` | string | No | Type of event |
| `entities.duration` | number | No | Duration in hours |
| `entities.amenities` | array | No | Required amenities |
| `filters` | object | No | Additional search filters |
| `filters.priceRange` | object | No | Price range filter |
| `filters.rating` | number | No | Minimum rating (1-5) |
| `filters.distance` | number | No | Max distance from location (km) |
| `filters.verified` | boolean | No | Only verified venues |
| `pagination` | object | No | Pagination settings |
| `pagination.page` | number | No | Page number (default: 1) |
| `pagination.limit` | number | No | Results per page (default: 20, max: 100) |
| `sort` | object | No | Sort criteria |
| `sort.field` | string | No | Sort field (price, rating, distance, capacity) |
| `sort.order` | string | No | Sort order (asc, desc) |

#### Response

```json
{
  "success": true,
  "data": {
    "searchId": "search_xyz789abc123",
    "venues": [
      {
        "id": "venue_bcn_001",
        "name": "Barcelona Convention Center",
        "description": "Modern convention center in the heart of Barcelona",
        "category": "conference_center",
        "location": {
          "address": "Avinguda Reina Maria Cristina, s/n",
          "city": "Barcelona",
          "country": "Spain",
          "coordinates": {
            "lat": 41.3731,
            "lng": 2.1545
          },
          "timezone": "Europe/Madrid"
        },
        "capacity": {
          "min": 50,
          "max": 500,
          "recommended": 350,
          "configurations": [
            {
              "name": "Theater",
              "capacity": 500,
              "description": "Theater-style seating"
            },
            {
              "name": "Reception",
              "capacity": 400,
              "description": "Standing reception"
            }
          ]
        },
        "pricing": {
          "hourly": 250,
          "daily": 1800,
          "currency": "EUR",
          "minimumSpend": 1000,
          "additionalFees": [
            {
              "name": "Setup Fee",
              "amount": 150,
              "type": "fixed",
              "mandatory": true
            },
            {
              "name": "Service Charge",
              "amount": 10,
              "type": "percentage",
              "mandatory": false
            }
          ]
        },
        "amenities": [
          {
            "id": "wifi",
            "name": "High-Speed WiFi",
            "category": "technology",
            "included": true,
            "additionalCost": 0
          },
          {
            "id": "av_equipment",
            "name": "Audio/Visual Equipment",
            "category": "technology",
            "included": true,
            "additionalCost": 0
          },
          {
            "id": "parking",
            "name": "Parking",
            "category": "accessibility",
            "included": false,
            "additionalCost": 15
          }
        ],
        "images": {
          "thumbnail": "https://images.venue.com/bcn001/thumb.jpg",
          "gallery": [
            "https://images.venue.com/bcn001/main.jpg",
            "https://images.venue.com/bcn001/interior.jpg",
            "https://images.venue.com/bcn001/exterior.jpg"
          ],
          "floorPlans": [
            "https://images.venue.com/bcn001/floorplan.pdf"
          ]
        },
        "availability": {
          "date": "2024-03-15",
          "timeSlots": [
            {
              "start": "09:00",
              "end": "17:00",
              "available": true,
              "price": 1800
            },
            {
              "start": "18:00",
              "end": "23:00",
              "available": false,
              "reason": "Already booked"
            }
          ]
        },
        "rating": {
          "average": 4.8,
          "reviewCount": 156,
          "distribution": {
            "5": 89,
            "4": 45,
            "3": 15,
            "2": 5,
            "1": 2
          }
        },
        "contact": {
          "name": "Event Manager",
          "phone": "+34 932 000 000",
          "email": "bookings@bcnconvention.com",
          "website": "https://bcnconvention.com"
        },
        "policies": {
          "cancellation": "Free cancellation up to 48 hours before event",
          "catering": true,
          "alcohol": true,
          "smoking": false,
          "parking": true
        },
        "provider": "MeetingPackage",
        "verified": true,
        "lastUpdated": "2024-02-14T15:30:00Z"
      }
    ],
    "totalCount": 23,
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "hasNext": true,
      "hasPrevious": false,
      "limit": 20
    },
    "filters": {
      "location": "Barcelona",
      "dateRange": "2024-03-15",
      "capacityRange": "300+",
      "priceRange": "€100-€500"
    },
    "providers": ["MeetingPackage", "iVvy"],
    "metadata": {
      "searchTime": 2340,
      "providersQueried": 2,
      "providersSuccessful": 2,
      "timestamp": "2024-02-15T10:32:00Z"
    }
  }
}
```

### Get Venue Details

Get detailed information about a specific venue.

**Endpoint:** `GET /api/venues/{venueId}`  
**Authentication:** None required  
**Rate Limit:** 200 requests per minute per IP

#### Request

```http
GET /api/venues/venue_bcn_001
```

#### Response

```json
{
  "success": true,
  "data": {
    "venue": {
      // Complete venue object (same structure as search result)
      "id": "venue_bcn_001",
      "name": "Barcelona Convention Center",
      // ... all venue details
    },
    "additionalDetails": {
      "virtualTour": "https://virtualtour.venue.com/bcn001",
      "reviews": [
        {
          "id": "review_001",
          "rating": 5,
          "title": "Excellent venue for our conference",
          "comment": "Great facilities and professional staff",
          "author": "John D.",
          "date": "2024-01-15T10:00:00Z",
          "verified": true
        }
      ],
      "nearbyVenues": [
        {
          "id": "venue_bcn_002",
          "name": "Barcelona Business Center",
          "distance": 1.2,
          "rating": 4.6
        }
      ],
      "transportation": {
        "metro": [
          {
            "station": "Espanya",
            "line": "L1, L3",
            "distance": 0.3
          }
        ],
        "bus": ["150", "13", "23"],
        "parking": {
          "available": true,
          "spaces": 120,
          "hourlyRate": 2.5
        }
      }
    }
  }
}
```

## Booking Endpoints

### Create Booking

Create a new venue booking.

**Endpoint:** `POST /api/venues/book`  
**Authentication:** None required (contact info validation)  
**Rate Limit:** 10 requests per minute per IP

#### Request

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
    "eventName": "Annual Tech Conference 2024",
    "setup": "theater",
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
    "taxId": "12-3456789",
    "purchaseOrder": "PO-2024-001"
  },
  "requirements": {
    "catering": {
      "required": true,
      "type": "breakfast_lunch",
      "attendees": 300,
      "dietaryRestrictions": ["vegetarian", "gluten-free"]
    },
    "equipment": ["projector", "microphones", "flipcharts"],
    "services": ["photography", "live_streaming"]
  }
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `venueId` | string | Yes | Venue identifier |
| `bookingDetails` | object | Yes | Event details |
| `bookingDetails.date` | string | Yes | Event date (YYYY-MM-DD) |
| `bookingDetails.startTime` | string | Yes | Start time (HH:MM) |
| `bookingDetails.endTime` | string | Yes | End time (HH:MM) |
| `bookingDetails.attendeeCount` | number | Yes | Number of attendees |
| `bookingDetails.eventType` | string | Yes | Type of event |
| `bookingDetails.eventName` | string | No | Name/title of event |
| `bookingDetails.setup` | string | No | Room setup configuration |
| `contactInfo` | object | Yes | Primary contact information |
| `contactInfo.firstName` | string | Yes | Contact's first name |
| `contactInfo.lastName` | string | Yes | Contact's last name |
| `contactInfo.email` | string | Yes | Valid email address |
| `contactInfo.phone` | string | Yes | Phone number |
| `contactInfo.company` | string | No | Company name |
| `billingInfo` | object | No | Billing information |
| `requirements` | object | No | Additional requirements |

#### Response

```json
{
  "success": true,
  "data": {
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
      "attendeeCount": 300,
      "eventType": "conference",
      "eventName": "Annual Tech Conference 2024"
    },
    "pricing": {
      "subtotal": 2000.00,
      "taxes": 420.00,
      "fees": 350.00,
      "total": 2770.00,
      "currency": "EUR",
      "breakdown": {
        "venueRental": 1800.00,
        "additionalServices": 200.00,
        "setupFee": 150.00,
        "taxes": 420.00,
        "serviceCharge": 200.00
      },
      "paymentTerms": "Full payment due 7 days before event"
    },
    "contact": {
      "primaryContact": "John Doe",
      "email": "john.doe@company.com",
      "phone": "+1-555-123-4567",
      "company": "Tech Corp"
    },
    "nextSteps": [
      "You will receive a contract within 24 hours",
      "Full payment is due 7 days before the event",
      "Contact venue coordinator for setup details",
      "Review and sign the contract to confirm booking"
    ],
    "documents": {
      "contract": "https://docs.venue.com/contracts/BCN-CONF-2024-001.pdf",
      "invoice": "https://docs.venue.com/invoices/BCN-CONF-2024-001.pdf",
      "termsAndConditions": "https://docs.venue.com/terms/standard.pdf"
    },
    "coordinatorInfo": {
      "name": "Maria Rodriguez",
      "email": "maria@bcnconvention.com",
      "phone": "+34 932 000 001",
      "availableHours": "Monday-Friday 9:00-18:00 CET"
    },
    "metadata": {
      "bookedAt": "2024-02-15T10:35:00Z",
      "processingTime": 3456,
      "provider": "MeetingPackage",
      "providerBookingId": "mp_booking_789456"
    }
  }
}
```

#### Error Examples

**Booking Conflict (409):**
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Venue not available for selected date and time",
    "details": {
      "conflictReason": "Time slot already booked",
      "availableAlternatives": [
        {
          "date": "2024-03-15",
          "startTime": "18:00",
          "endTime": "23:00"
        },
        {
          "date": "2024-03-16",
          "startTime": "09:00",
          "endTime": "17:00"
        }
      ]
    }
  }
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid booking request",
    "details": {
      "errors": [
        {
          "field": "contactInfo.email",
          "message": "Invalid email format"
        },
        {
          "field": "bookingDetails.attendeeCount",
          "message": "Exceeds venue capacity (max: 500)"
        }
      ]
    }
  }
}
```

### Get Booking Status

Check the status of a booking.

**Endpoint:** `GET /api/bookings/{bookingId}`  
**Authentication:** None required (returns limited info)  
**Rate Limit:** 100 requests per minute per IP

#### Request

```http
GET /api/bookings/booking_bcn_240215_001?confirmationCode=BCN-CONF-2024-001
```

#### Response

```json
{
  "success": true,
  "data": {
    "bookingId": "booking_bcn_240215_001",
    "status": "confirmed",
    "confirmationCode": "BCN-CONF-2024-001",
    "venue": {
      "name": "Barcelona Convention Center",
      "address": "Avinguda Reina Maria Cristina, s/n, Barcelona"
    },
    "event": {
      "date": "2024-03-15",
      "startTime": "09:00",
      "endTime": "17:00",
      "attendeeCount": 300
    },
    "statusHistory": [
      {
        "status": "pending",
        "timestamp": "2024-02-15T10:35:00Z",
        "note": "Booking request submitted"
      },
      {
        "status": "confirmed",
        "timestamp": "2024-02-15T11:15:00Z",
        "note": "Booking confirmed by venue"
      }
    ],
    "paymentStatus": "pending",
    "documents": {
      "contract": "https://docs.venue.com/contracts/BCN-CONF-2024-001.pdf",
      "invoice": "https://docs.venue.com/invoices/BCN-CONF-2024-001.pdf"
    }
  }
}
```

## Health Check Endpoints

### Application Health

Check the overall health of the API service.

**Endpoint:** `GET /health`  
**Authentication:** None required  
**Rate Limit:** No limit

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2024-02-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "environment": "production"
}
```

### Detailed Health Check

Get detailed health information about all services.

**Endpoint:** `GET /health/detailed`  
**Authentication:** Admin API key required  
**Rate Limit:** 10 requests per minute

#### Response

```json
{
  "overall": "healthy",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "details": {
        "connection": "active",
        "collections": 4,
        "lastBackup": "2024-02-15T02:00:00Z"
      }
    },
    "claudeApi": {
      "status": "healthy",
      "responseTime": 1200,
      "details": {
        "model": "claude-3-sonnet-20240229",
        "tokensUsedToday": 15420,
        "rateLimitRemaining": 85
      }
    },
    "venueProviders": {
      "status": "degraded",
      "responseTime": 2800,
      "details": {
        "MeetingPackage": {
          "status": "healthy",
          "responseTime": 1200
        },
        "iVvy": {
          "status": "unhealthy",
          "responseTime": 0,
          "error": "Connection timeout"
        },
        "EventUp": {
          "status": "healthy",
          "responseTime": 800
        }
      }
    }
  },
  "system": {
    "memory": {
      "used": 512000000,
      "total": 1073741824,
      "percentage": 47.7
    },
    "cpu": {
      "usage": 23.5
    },
    "disk": {
      "used": 5368709120,
      "total": 21474836480,
      "percentage": 25.0
    }
  },
  "timestamp": "2024-02-15T10:30:00Z"
}
```

## Error Codes Reference

### HTTP Status Codes

| Status | Description | Usage |
|--------|-------------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource successfully created |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (booking conflicts) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | External service error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Application Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_QUERY` | 400 | Query validation failed |
| `MISSING_REQUIRED_FIELD` | 400 | Required field missing |
| `INVALID_FORMAT` | 400 | Invalid data format |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `CLAUDE_API_ERROR` | 502 | Claude AI service error |
| `CLAUDE_API_UNAVAILABLE` | 503 | Claude AI service unavailable |
| `VENUE_API_ERROR` | 502 | Venue provider error |
| `VENUE_NOT_FOUND` | 404 | Venue not found |
| `VENUE_NOT_AVAILABLE` | 409 | Venue not available for booking |
| `BOOKING_CONFLICT` | 409 | Booking time conflict |
| `INSUFFICIENT_CAPACITY` | 409 | Venue capacity insufficient |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limiting

### Rate Limit Headers

All responses include rate limiting headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1645875600
Retry-After: 900
```

### Rate Limits by Endpoint

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `/api/extract` | 100 requests/minute | Per IP |
| `/api/venues/search` | 50 requests/minute | Per IP |
| `/api/venues/{id}` | 200 requests/minute | Per IP |
| `/api/venues/book` | 10 requests/minute | Per IP |
| `/api/bookings/{id}` | 100 requests/minute | Per IP |
| `/health` | No limit | - |
| `/health/detailed` | 10 requests/minute | Per API key |

## Pagination

### Request Parameters

```json
{
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

### Response Format

```json
{
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 87,
      "hasNext": true,
      "hasPrevious": false,
      "limit": 20
    }
  }
}
```

## Filtering and Sorting

### Filter Parameters

```json
{
  "filters": {
    "priceRange": {
      "min": 100,
      "max": 500,
      "currency": "EUR"
    },
    "rating": 4.0,
    "capacity": {
      "min": 50,
      "max": 1000
    },
    "amenities": ["wifi", "parking"],
    "eventTypes": ["conference", "meeting"],
    "verified": true
  }
}
```

### Sort Parameters

```json
{
  "sort": {
    "field": "rating",
    "order": "desc"
  }
}
```

### Available Sort Fields

- `rating` - Venue rating
- `price` - Price per hour/day
- `distance` - Distance from search location
- `capacity` - Venue capacity
- `name` - Venue name (alphabetical)
- `updated` - Last updated date

## SDK Examples

### JavaScript/Node.js

```javascript
import VenueBookingAPI from '@venue-booking/api-client';

const client = new VenueBookingAPI({
  baseURL: 'https://api.venue-booking.com/v1',
  apiKey: 'your-api-key' // for admin endpoints
});

// Extract entities
const extraction = await client.extract({
  query: 'I need a venue for 300 people in Barcelona next month'
});

// Search venues
const searchResults = await client.venues.search({
  entities: extraction.entities,
  filters: {
    priceRange: { min: 100, max: 500, currency: 'EUR' }
  }
});

// Create booking
const booking = await client.venues.book({
  venueId: 'venue_bcn_001',
  bookingDetails: {
    date: '2024-03-15',
    startTime: '09:00',
    endTime: '17:00',
    attendeeCount: 300
  },
  contactInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1-555-123-4567'
  }
});
```

### Python

```python
from venue_booking_api import VenueBookingClient

client = VenueBookingClient(
    base_url='https://api.venue-booking.com/v1',
    api_key='your-api-key'  # for admin endpoints
)

# Extract entities
extraction = client.extract(
    query='I need a venue for 300 people in Barcelona next month'
)

# Search venues
search_results = client.venues.search(
    entities=extraction['entities'],
    filters={
        'price_range': {'min': 100, 'max': 500, 'currency': 'EUR'}
    }
)

# Create booking
booking = client.venues.book(
    venue_id='venue_bcn_001',
    booking_details={
        'date': '2024-03-15',
        'start_time': '09:00',
        'end_time': '17:00',
        'attendee_count': 300
    },
    contact_info={
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john@example.com',
        'phone': '+1-555-123-4567'
    }
)
```

## Webhook Events

### Booking Status Updates

When booking status changes, webhooks will be sent to registered endpoints.

**Webhook URL Configuration:** Set via admin panel or API

**Webhook Payload:**
```json
{
  "event": "booking.status_changed",
  "timestamp": "2024-02-15T10:35:00Z",
  "data": {
    "bookingId": "booking_bcn_240215_001",
    "previousStatus": "pending",
    "currentStatus": "confirmed",
    "venue": {
      "id": "venue_bcn_001",
      "name": "Barcelona Convention Center"
    },
    "contact": {
      "email": "john.doe@company.com"
    }
  }
}
```

## Testing

### Test Environment

**Base URL:** `https://api-staging.venue-booking.com/v1`  
**Test API Key:** Available in developer dashboard  
**Test Cards:** Standard test data available

### Test Venues

Test venue IDs for development:
- `test_venue_001` - Barcelona test venue
- `test_venue_002` - Madrid test venue  
- `test_venue_003` - Valencia test venue

This comprehensive API documentation provides all the information needed to integrate with the venue booking platform, including detailed examples, error handling, and best practices for implementation.