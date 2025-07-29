# Data Models and Database Schema

## Database Design Principles

### MongoDB Schema Design
- Document-oriented data modeling
- Embedded documents for related data
- Indexing strategy for performance optimization
- TTL (Time To Live) for temporary data
- Flexible schema for evolving requirements

### Data Consistency Strategy
- Session data: Eventually consistent (temporary storage)
- Audit logs: Strong consistency required
- User queries: Eventually consistent (analytics data)
- System metrics: Eventually consistent (monitoring data)

## Core Data Models

### 1. User Sessions Collection

**Collection Name**: `sessions`

**Purpose**: Store temporary user session data including search queries, extracted entities, and search results for debugging and user experience continuity.

**TTL**: 24 hours (automatically deleted)

```typescript
interface UserSession {
  _id: ObjectId;
  sessionId: string;           // Unique session identifier
  createdAt: Date;             // Auto-expire after 24 hours
  updatedAt: Date;
  
  // User Query Information
  queries: {
    queryId: string;           // Unique query identifier
    rawQuery: string;          // Original user input
    timestamp: Date;
    
    // Entity Extraction Results
    extraction: {
      entities: {
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
      };
      confidence: {
        overall: number;
        location: number;
        date: number;
        capacity: number;
        eventType: number;
      };
      processingTime: number;    // In milliseconds
      claudeTokens: number;
      claudeResponse: any;       // Raw Claude API response
    };
    
    // Search Results
    search?: {
      searchId: string;
      criteria: any;             // Search criteria used
      results: {
        venueId: string;
        ranking: number;
        relevanceScore: number;
      }[];
      totalResults: number;
      searchTime: number;
      providers: string[];
    };
  }[];
  
  // User Interactions
  interactions: {
    type: 'entity_edit' | 'venue_view' | 'booking_attempt';
    timestamp: Date;
    data: any;                   // Interaction-specific data
  }[];
  
  // Session Metadata
  metadata: {
    userAgent: string;
    ipAddress: string;          // Hashed for privacy
    referrer?: string;
    language: string;
    timezone: string;
  };
}
```

**MongoDB Schema:**
```javascript
const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // 24 hours TTL
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  queries: [{
    queryId: { type: String, required: true },
    rawQuery: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    extraction: {
      entities: {
        location: String,
        date: Date,
        capacity: Number,
        eventType: String,
        duration: Number,
        budget: {
          min: Number,
          max: Number,
          currency: String
        },
        amenities: [String]
      },
      confidence: {
        overall: { type: Number, min: 0, max: 1 },
        location: { type: Number, min: 0, max: 1 },
        date: { type: Number, min: 0, max: 1 },
        capacity: { type: Number, min: 0, max: 1 },
        eventType: { type: Number, min: 0, max: 1 }
      },
      processingTime: Number,
      claudeTokens: Number,
      claudeResponse: mongoose.Schema.Types.Mixed
    },
    search: {
      searchId: String,
      criteria: mongoose.Schema.Types.Mixed,
      results: [{
        venueId: String,
        ranking: Number,
        relevanceScore: Number
      }],
      totalResults: Number,
      searchTime: Number,
      providers: [String]
    }
  }],
  interactions: [{
    type: {
      type: String,
      enum: ['entity_edit', 'venue_view', 'booking_attempt'],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    data: mongoose.Schema.Types.Mixed
  }],
  metadata: {
    userAgent: String,
    ipAddress: String, // Hashed
    referrer: String,
    language: String,
    timezone: String
  }
});

// Indexes
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ createdAt: 1 });
sessionSchema.index({ 'queries.queryId': 1 });
```

### 2. Audit Logs Collection

**Collection Name**: `audit_logs`

**Purpose**: Track all API calls, performance metrics, and system events for monitoring and debugging.

**Retention**: 90 days

```typescript
interface AuditLog {
  _id: ObjectId;
  timestamp: Date;
  
  // Request Information
  request: {
    method: string;              // HTTP method
    path: string;                // Request path
    endpoint: string;            // API endpoint name
    headers: Record<string, string>;
    body?: any;                  // Request body (sanitized)
    queryParams?: Record<string, string>;
    sessionId?: string;
    requestId: string;           // Unique request identifier
  };
  
  // Response Information
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body?: any;                  // Response body (truncated if large)
    size: number;                // Response size in bytes
  };
  
  // Performance Metrics
  performance: {
    totalTime: number;           // Total request time in ms
    databaseTime?: number;       // Database query time
    externalApiTime?: number;    // External API call time
    processingTime: number;      // Business logic processing time
  };
  
  // External API Calls
  externalCalls?: {
    service: string;             // 'claude' | 'venue_api'
    method: string;
    url: string;
    duration: number;
    statusCode: number;
    tokens?: number;             // For Claude API
  }[];
  
  // Error Information (if applicable)
  error?: {
    code: string;
    message: string;
    stack?: string;              // Stack trace (sanitized)
    context?: any;
  };
  
  // System Information
  system: {
    nodeVersion: string;
    memoryUsage: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    cpuUsage: {
      user: number;
      system: number;
    };
  };
}
```

**MongoDB Schema:**
```javascript
const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 7776000 // 90 days TTL
  },
  request: {
    method: { type: String, required: true },
    path: { type: String, required: true },
    endpoint: { type: String, required: true, index: true },
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    queryParams: mongoose.Schema.Types.Mixed,
    sessionId: String,
    requestId: { type: String, required: true, unique: true }
  },
  response: {
    statusCode: { type: Number, required: true, index: true },
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    size: Number
  },
  performance: {
    totalTime: { type: Number, required: true },
    databaseTime: Number,
    externalApiTime: Number,
    processingTime: { type: Number, required: true }
  },
  externalCalls: [{
    service: { type: String, enum: ['claude', 'venue_api'] },
    method: String,
    url: String,
    duration: Number,
    statusCode: Number,
    tokens: Number
  }],
  error: {
    code: String,
    message: String,
    stack: String,
    context: mongoose.Schema.Types.Mixed
  },
  system: {
    nodeVersion: String,
    memoryUsage: {
      heapUsed: Number,
      heapTotal: Number,
      external: Number
    },
    cpuUsage: {
      user: Number,
      system: Number
    }
  }
});

// Compound indexes for common queries
auditLogSchema.index({ endpoint: 1, timestamp: -1 });
auditLogSchema.index({ 'response.statusCode': 1, timestamp: -1 });
auditLogSchema.index({ 'performance.totalTime': 1 });
auditLogSchema.index({ sessionId: 1, timestamp: -1 });
```

### 3. User Queries Collection

**Collection Name**: `user_queries`

**Purpose**: Store aggregated query data for analytics and improving entity extraction.

**Retention**: 1 year

```typescript
interface UserQuery {
  _id: ObjectId;
  queryId: string;             // Unique query identifier
  timestamp: Date;
  
  // Query Information
  query: {
    raw: string;               // Original user input
    normalized: string;        // Cleaned/normalized version
    language: string;          // Detected language
    length: number;            // Character count
    wordCount: number;
  };
  
  // Extraction Results
  extraction: {
    success: boolean;
    entities: {
      location: {
        value: string | null;
        confidence: number;
        variants?: string[];     // Alternative extractions
      };
      date: {
        value: Date | null;
        confidence: number;
        originalText?: string;   // Original date text
      };
      capacity: {
        value: number | null;
        confidence: number;
        originalText?: string;
      };
      eventType: {
        value: string | null;
        confidence: number;
        category?: string;       // Categorized event type
      };
      duration: {
        value: number | null;
        confidence: number;
      };
      amenities: {
        values: string[];
        confidence: number[];
      };
    };
    overallConfidence: number;
    processingTime: number;
    claudeTokens: number;
  };
  
  // Search Results Performance
  searchResults?: {
    totalFound: number;
    relevantResults: number;   // Results clicked/viewed
    avgRelevanceScore: number;
    searchTime: number;
  };
  
  // User Feedback (if provided)
  feedback?: {
    entityAccuracy: number;    // 1-5 rating
    resultRelevance: number;   // 1-5 rating
    overallSatisfaction: number; // 1-5 rating
    comments?: string;
  };
  
  // Session Context
  session: {
    sessionId: string;
    isFirstQuery: boolean;
    querySequence: number;     // Query number in session
    previousQuery?: string;
  };
  
  // Analytics Metadata
  metadata: {
    source: string;            // 'web' | 'mobile' | 'api'
    userAgent: string;
    location?: {
      country: string;
      city: string;
    };
    timezone: string;
  };
}
```

**MongoDB Schema:**
```javascript
const userQuerySchema = new mongoose.Schema({
  queryId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 31536000 // 1 year TTL
  },
  query: {
    raw: { type: String, required: true },
    normalized: String,
    language: { type: String, default: 'en' },
    length: Number,
    wordCount: Number
  },
  extraction: {
    success: { type: Boolean, required: true },
    entities: {
      location: {
        value: String,
        confidence: { type: Number, min: 0, max: 1 },
        variants: [String]
      },
      date: {
        value: Date,
        confidence: { type: Number, min: 0, max: 1 },
        originalText: String
      },
      capacity: {
        value: Number,
        confidence: { type: Number, min: 0, max: 1 },
        originalText: String
      },
      eventType: {
        value: String,
        confidence: { type: Number, min: 0, max: 1 },
        category: String
      },
      duration: {
        value: Number,
        confidence: { type: Number, min: 0, max: 1 }
      },
      amenities: {
        values: [String],
        confidence: [Number]
      }
    },
    overallConfidence: { type: Number, min: 0, max: 1 },
    processingTime: Number,
    claudeTokens: Number
  },
  searchResults: {
    totalFound: Number,
    relevantResults: Number,
    avgRelevanceScore: Number,
    searchTime: Number
  },
  feedback: {
    entityAccuracy: { type: Number, min: 1, max: 5 },
    resultRelevance: { type: Number, min: 1, max: 5 },
    overallSatisfaction: { type: Number, min: 1, max: 5 },
    comments: String
  },
  session: {
    sessionId: { type: String, index: true },
    isFirstQuery: Boolean,
    querySequence: Number,
    previousQuery: String
  },
  metadata: {
    source: { type: String, enum: ['web', 'mobile', 'api'], default: 'web' },
    userAgent: String,
    location: {
      country: String,
      city: String
    },
    timezone: String
  }
});

// Analytics indexes
userQuerySchema.index({ timestamp: -1, 'extraction.success': 1 });
userQuerySchema.index({ 'extraction.entities.location.value': 1 });
userQuerySchema.index({ 'extraction.entities.eventType.value': 1 });
userQuerySchema.index({ 'extraction.overallConfidence': 1 });
```

### 4. System Metrics Collection

**Collection Name**: `system_metrics`

**Purpose**: Store system performance metrics and health data.

**Retention**: 30 days

```typescript
interface SystemMetrics {
  _id: ObjectId;
  timestamp: Date;
  metricType: 'performance' | 'health' | 'usage';
  
  // Performance Metrics
  performance?: {
    endpoint: string;
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestCount: number;
    errorRate: number;
    timeWindow: number;        // Metrics window in seconds
  };
  
  // Health Metrics
  health?: {
    component: string;         // 'database' | 'claude_api' | 'venue_api' | 'system'
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    errorCount: number;
    successRate: number;
    details?: any;
  };
  
  // Usage Metrics
  usage?: {
    activeUsers: number;
    totalQueries: number;
    successfulQueries: number;
    totalSearches: number;
    totalBookings: number;
    claudeTokensUsed: number;
    avgSessionDuration: number;
  };
  
  // System Resources
  system?: {
    cpu: {
      usage: number;           // Percentage
      loadAverage: number[];   // 1min, 5min, 15min
    };
    memory: {
      used: number;            // Bytes
      total: number;           // Bytes
      percentage: number;
    };
    disk: {
      used: number;            // Bytes
      total: number;           // Bytes
      percentage: number;
    };
    uptime: number;            // Seconds
  };
}
```

**MongoDB Schema:**
```javascript
const systemMetricsSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 2592000 // 30 days TTL
  },
  metricType: {
    type: String,
    enum: ['performance', 'health', 'usage'],
    required: true,
    index: true
  },
  performance: {
    endpoint: String,
    avgResponseTime: Number,
    p50ResponseTime: Number,
    p95ResponseTime: Number,
    p99ResponseTime: Number,
    requestCount: Number,
    errorRate: Number,
    timeWindow: Number
  },
  health: {
    component: {
      type: String,
      enum: ['database', 'claude_api', 'venue_api', 'system']
    },
    status: {
      type: String,
      enum: ['healthy', 'degraded', 'unhealthy']
    },
    responseTime: Number,
    errorCount: Number,
    successRate: Number,
    details: mongoose.Schema.Types.Mixed
  },
  usage: {
    activeUsers: Number,
    totalQueries: Number,
    successfulQueries: Number,
    totalSearches: Number,
    totalBookings: Number,
    claudeTokensUsed: Number,
    avgSessionDuration: Number
  },
  system: {
    cpu: {
      usage: Number,
      loadAverage: [Number]
    },
    memory: {
      used: Number,
      total: Number,
      percentage: Number
    },
    disk: {
      used: Number,
      total: Number,
      percentage: Number
    },
    uptime: Number
  }
});

// Time-series indexes
systemMetricsSchema.index({ metricType: 1, timestamp: -1 });
systemMetricsSchema.index({ 'performance.endpoint': 1, timestamp: -1 });
systemMetricsSchema.index({ 'health.component': 1, timestamp: -1 });
```

## Indexing Strategy

### Primary Indexes

```javascript
// Sessions Collection
db.sessions.createIndex({ sessionId: 1 }, { unique: true });
db.sessions.createIndex({ createdAt: 1 });
db.sessions.createIndex({ 'queries.queryId': 1 });

// Audit Logs Collection
db.audit_logs.createIndex({ timestamp: -1 });
db.audit_logs.createIndex({ 'request.endpoint': 1, timestamp: -1 });
db.audit_logs.createIndex({ 'response.statusCode': 1, timestamp: -1 });
db.audit_logs.createIndex({ 'request.sessionId': 1, timestamp: -1 });
db.audit_logs.createIndex({ 'performance.totalTime': 1 });

// User Queries Collection
db.user_queries.createIndex({ queryId: 1 }, { unique: true });
db.user_queries.createIndex({ timestamp: -1 });
db.user_queries.createIndex({ 'extraction.success': 1, timestamp: -1 });
db.user_queries.createIndex({ 'extraction.entities.location.value': 1 });
db.user_queries.createIndex({ 'extraction.entities.eventType.value': 1 });
db.user_queries.createIndex({ 'session.sessionId': 1 });

// System Metrics Collection
db.system_metrics.createIndex({ timestamp: -1 });
db.system_metrics.createIndex({ metricType: 1, timestamp: -1 });
db.system_metrics.createIndex({ 'performance.endpoint': 1, timestamp: -1 });
db.system_metrics.createIndex({ 'health.component': 1, timestamp: -1 });
```

### Compound Indexes for Common Queries

```javascript
// Performance monitoring queries
db.audit_logs.createIndex({ 
  'request.endpoint': 1, 
  'response.statusCode': 1, 
  timestamp: -1 
});

// Analytics queries
db.user_queries.createIndex({ 
  'extraction.entities.location.value': 1, 
  'extraction.entities.eventType.value': 1, 
  timestamp: -1 
});

// Session analysis
db.sessions.createIndex({ 
  'metadata.language': 1, 
  'metadata.timezone': 1, 
  createdAt: -1 
});
```

## Data Validation Rules

### Field Validation

```javascript
// Session validation
const sessionValidation = {
  sessionId: {
    type: 'string',
    minLength: 10,
    maxLength: 50,
    pattern: '^sess_[a-zA-Z0-9]+$'
  },
  'queries.rawQuery': {
    type: 'string',
    minLength: 5,
    maxLength: 1000
  },
  'extraction.confidence.overall': {
    type: 'number',
    minimum: 0,
    maximum: 1
  }
};

// Audit log validation
const auditLogValidation = {
  'request.method': {
    type: 'string',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  'response.statusCode': {
    type: 'number',
    minimum: 100,
    maximum: 599
  },
  'performance.totalTime': {
    type: 'number',
    minimum: 0
  }
};
```

## Data Migration Scripts

### Initial Setup

```javascript
// Create collections with validation
db.createCollection('sessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sessionId', 'createdAt'],
      properties: {
        sessionId: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        queries: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['queryId', 'rawQuery', 'timestamp']
          }
        }
      }
    }
  }
});

// Set up TTL indexes
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
db.audit_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
db.user_queries.createIndex({ timestamp: 1 }, { expireAfterSeconds: 31536000 });
db.system_metrics.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 });
```

## Query Patterns and Performance

### Common Query Examples

```javascript
// Find session by ID
db.sessions.findOne({ sessionId: 'sess_abc123' });

// Get recent audit logs for endpoint
db.audit_logs.find({
  'request.endpoint': '/api/extract',
  timestamp: { $gte: new Date(Date.now() - 3600000) }
}).sort({ timestamp: -1 });

// Analytics: Popular locations
db.user_queries.aggregate([
  {
    $match: {
      'extraction.entities.location.value': { $ne: null },
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 3600000) }
    }
  },
  {
    $group: {
      _id: '$extraction.entities.location.value',
      count: { $sum: 1 },
      avgConfidence: { $avg: '$extraction.entities.location.confidence' }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 10 }
]);

// Performance monitoring
db.system_metrics.find({
  metricType: 'performance',
  'performance.endpoint': '/api/venues/search',
  timestamp: { $gte: new Date(Date.now() - 3600000) }
}).sort({ timestamp: -1 });
```

This data model design provides comprehensive tracking and analytics capabilities while maintaining performance through strategic indexing and TTL policies for automatic data cleanup.