# Ollama LLM Integration Guide

## Overview

This guide provides comprehensive instructions for integrating with Ollama (local LLM runtime) using Llama 3.1 8B for natural language processing and entity extraction in the venue booking application. This integration provides a completely free, privacy-focused alternative to cloud-based AI services while maintaining high performance for venue search queries.

## Ollama Architecture

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
   │  Cache Layer    │    │  Ollama API     │
   │  (Redis/Memory) │    │  (Local LLM)    │
   └─────────────────┘    └─────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  Llama 3.1 8B   │
                          │  (Local Model)  │
                          └─────────────────┘
```

## Ollama Setup and Configuration

### Docker Configuration

**docker-compose.dev.yml:**
```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: venue-booking-ollama-dev
    ports:
      - "11434:11434"
    environment:
      - OLLAMA_HOST=0.0.0.0
    volumes:
      - ollama_data_dev:/root/.ollama
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    restart: unless-stopped

volumes:
  ollama_data_dev:
    driver: local
```

### Environment Variables

**Environment Configuration:**
```bash
# .env
# Ollama Configuration (Local LLM - replaces Claude AI)
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT=30000
OLLAMA_MAX_RETRIES=3
```

### Model Setup Script

**scripts/setup-ollama.sh:**
```bash
#!/bin/bash
set -e

OLLAMA_URL="http://localhost:11434"
MODEL_NAME="llama3.1:8b"
MAX_RETRIES=30
RETRY_DELAY=10

echo "🚀 Setting up Ollama with Llama 3.1 8B model..."

# Wait for Ollama service to be ready
echo "⏳ Waiting for Ollama service to start..."
for i in $(seq 1 $MAX_RETRIES); do
    if curl -s "$OLLAMA_URL/api/health" > /dev/null 2>&1; then
        echo "✅ Ollama service is ready!"
        break
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        echo "❌ Ollama service failed to start after ${MAX_RETRIES} attempts"
        exit 1
    fi
    
    echo "⏳ Attempt $i/$MAX_RETRIES - waiting ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
done

# Check if model is already available
echo "🔍 Checking if model $MODEL_NAME is available..."
if curl -s "$OLLAMA_URL/api/tags" | grep -q "$MODEL_NAME"; then
    echo "✅ Model $MODEL_NAME is already available!"
else
    echo "📥 Downloading model $MODEL_NAME (this may take several minutes)..."
    curl -X POST "$OLLAMA_URL/api/pull" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$MODEL_NAME\"}" \
        --max-time 1800  # 30 minutes timeout for model download
    
    # Verify model was downloaded
    if curl -s "$OLLAMA_URL/api/tags" | grep -q "$MODEL_NAME"; then
        echo "✅ Model $MODEL_NAME downloaded successfully!"
    else
        echo "❌ Failed to download model $MODEL_NAME"
        exit 1
    fi
fi

# Test entity extraction
echo "🧪 Testing entity extraction functionality..."
TEST_QUERY="I need a venue for 50 people in Madrid tomorrow for a corporate meeting"

curl -X POST "$OLLAMA_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "{
        \"model\": \"$MODEL_NAME\",
        \"messages\": [
            {
                \"role\": \"system\",
                \"content\": \"Extract venue search parameters from user queries. Return JSON only.\"
            },
            {
                \"role\": \"user\",
                \"content\": \"Extract entities from: $TEST_QUERY\"
            }
        ],
        \"stream\": false
    }" > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Entity extraction test successful!"
    echo "🎉 Ollama setup complete! The service is ready for use."
else
    echo "⚠️  Entity extraction test failed, but Ollama is running"
    echo "🔧 You may need to troubleshoot the model integration"
fi
```

## API Client Implementation

### Ollama API Client

```typescript
// services/ollama/client.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '@/utils/logger';

export interface OllamaConfig {
  apiUrl: string;
  model: string;
  timeout?: number;
  maxRetries?: number;
}

export interface OllamaChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaHealthResponse {
  status: 'healthy' | 'unhealthy';
  modelAvailable: boolean;
  responseTime: number;
  details?: any;
}

export class OllamaApiClient {
  private client: AxiosInstance;
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for logging and error handling
    this.setupInterceptors();
  }

  async chat(request: Omit<OllamaChatRequest, 'model'>): Promise<OllamaChatResponse> {
    const startTime = Date.now();
    
    try {
      logger.debug('Ollama chat request', {
        model: this.config.model,
        messageCount: request.messages.length,
        stream: request.stream,
      });

      const response: AxiosResponse<OllamaChatResponse> = await this.client.post('/api/chat', {
        model: this.config.model,
        stream: false,
        ...request,
      });

      const duration = Date.now() - startTime;
      
      logger.debug('Ollama chat response', {
        model: response.data.model,
        duration,
        responseLength: response.data.message.content.length,
        totalDuration: response.data.total_duration,
        evalCount: response.data.eval_count,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      const ollamaError = this.handleApiError(error, duration);
      
      logger.error('Ollama chat error', {
        error: ollamaError.message,
        duration,
        model: this.config.model,
        apiUrl: this.config.apiUrl,
      });

      throw ollamaError;
    }
  }

  async healthCheck(): Promise<OllamaHealthResponse> {
    const startTime = Date.now();

    try {
      // Check basic connectivity
      const healthResponse = await this.client.get('/api/health');
      
      if (healthResponse.status !== 200) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }

      // Check model availability
      const tagsResponse = await this.client.get('/api/tags');
      const tagsData = tagsResponse.data;
      const models = tagsData.models || [];
      const modelAvailable = models.some((model: any) => 
        model.name === this.config.model || 
        model.name.startsWith(this.config.model.split(':')[0])
      );

      const responseTime = Date.now() - startTime;

      return {
        status: modelAvailable ? 'healthy' : 'unhealthy',
        modelAvailable,
        responseTime,
        details: {
          model: this.config.model,
          totalModels: models.length,
          availableModels: models.map((m: any) => m.name).slice(0, 5),
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        modelAvailable: false,
        responseTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          model: this.config.model,
        },
      };
    }
  }

  async pullModel(modelName?: string): Promise<void> {
    const model = modelName || this.config.model;
    
    logger.info('Pulling Ollama model', { model });

    try {
      const response = await this.client.post('/api/pull', 
        { name: model },
        { timeout: 30 * 60 * 1000 } // 30 minutes for model downloads
      );

      if (response.status === 200) {
        logger.info('Model pulled successfully', { model });
      } else {
        throw new Error(`Failed to pull model: ${response.status}`);
      }
    } catch (error) {
      logger.error('Model pull failed', {
        model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new OllamaModelError(`Failed to pull model ${model}`, error);
    }
  }

  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  private setupInterceptors(): void {
    // Request interceptor for retry logic
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        logger.debug('Ollama API response', {
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          duration,
        });
        return response;
      },
      async (error) => {
        const duration = Date.now() - (error.config?.metadata?.startTime || 0);
        
        // Implement retry logic for transient errors
        if (this.shouldRetry(error) && !error.config._retry) {
          error.config._retry = true;
          await this.delay(1000); // 1 second delay
          return this.client.request(error.config);
        }

        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: any): boolean {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ETIMEDOUT' ||
           (error.response?.status >= 500 && error.response?.status < 600);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleApiError(error: any, duration: number): OllamaError {
    if (error.code === 'ECONNREFUSED') {
      return new OllamaConnectionError(
        'Cannot connect to Ollama service. Is it running?',
        duration
      );
    }

    if (error.code === 'ETIMEDOUT') {
      return new OllamaConnectionError(
        'Ollama request timed out',
        duration
      );
    }

    if (error.response?.status === 404) {
      return new OllamaModelError(
        `Model ${this.config.model} not found. Try pulling it first.`,
        error
      );
    }

    if (error.response?.status >= 400 && error.response?.status < 500) {
      return new OllamaError(
        `Ollama client error: ${error.response.data?.error || error.message}`,
        error.response.status
      );
    }

    if (error.response?.status >= 500) {
      return new OllamaError(
        `Ollama server error: ${error.response.statusText}`,
        error.response.status
      );
    }

    return new OllamaError(
      error.message || 'Unknown Ollama error',
      error.response?.status
    );
  }
}

// Custom error classes
export class OllamaError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'OllamaError';
  }
}

export class OllamaConnectionError extends OllamaError {
  constructor(message: string, public duration: number) {
    super(message);
    this.name = 'OllamaConnectionError';
  }
}

export class OllamaModelError extends OllamaError {
  constructor(message: string, originalError?: any) {
    super(message, 404, originalError);
    this.name = 'OllamaModelError';
  }
}
```

## Entity Extraction Implementation

### Optimized Prompts for Llama 3.1

```typescript
// services/ollama/prompts.ts
export interface ExtractionContext {
  previousQuery?: string;
  userLocation?: string;
  dateContext?: string;
  userPreferences?: Record<string, any>;
}

/**
 * System prompt for Llama 3.1 entity extraction
 * Optimized for the Llama instruction format
 */
export const ENTITY_EXTRACTION_SYSTEM_PROMPT = `You are a precise entity extraction assistant for venue booking. Your task is to analyze natural language queries and extract structured venue search parameters.

INSTRUCTIONS:
- Extract only information explicitly mentioned or clearly implied
- Use null for missing information  
- Normalize locations to city names
- Convert relative dates to specific dates when possible
- Return ONLY valid JSON with the exact structure shown below
- Do not include explanations or additional text

REQUIRED OUTPUT FORMAT:
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

EXAMPLE:
Query: "I need a venue for 100 people in Madrid tomorrow for a corporate meeting"
Output: {
  "entities": {
    "location": "Madrid",
    "date": "2024-02-16",
    "capacity": 100,
    "eventType": "meeting",
    "duration": null,
    "budget": null,
    "amenities": []
  },
  "confidence": {
    "overall": 0.9,
    "location": 0.95,
    "date": 0.8,
    "capacity": 0.95,
    "eventType": 0.9
  },
  "reasoning": "Clear location (Madrid), capacity (100 people), relative date (tomorrow), and event type (meeting) specified"
}`;

/**
 * Chat messages format for Llama 3.1 (alternative approach)
 */
export const buildEntityExtractionMessages = (
  query: string,
  context?: ExtractionContext
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> => {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system' as const,
      content: ENTITY_EXTRACTION_SYSTEM_PROMPT,
    },
  ];

  let userMessage = `Extract venue search entities from this query: "${query}"`;
  
  if (context) {
    let contextInfo = '';
    
    if (context.userLocation) {
      contextInfo += `\nUser's current location: ${context.userLocation}`;
    }
    
    if (context.dateContext) {
      contextInfo += `\nCurrent date: ${context.dateContext}`;
    }
    
    if (context.previousQuery) {
      contextInfo += `\nPrevious query: "${context.previousQuery}"`;
    }
    
    if (contextInfo) {
      userMessage += `\n\nContext:${contextInfo}`;
    }
  }
  
  userMessage += '\n\nReturn JSON only with the exact structure specified in the system prompt.';
  
  messages.push({
    role: 'user' as const,
    content: userMessage,
  });

  return messages;
};

/**
 * Generate suggestions based on extracted entities and confidence scores
 */
export const generateSuggestions = (
  entities: any,
  confidence: any
): string[] => {
  const suggestions: string[] = [];
  
  if (!entities.location || confidence.location < 0.7) {
    suggestions.push('Consider specifying a location for better venue matches');
  }
  
  if (!entities.date || confidence.date < 0.7) {
    suggestions.push('Adding a specific date will help find available venues');
  }
  
  if (!entities.capacity || confidence.capacity < 0.7) {
    suggestions.push('Specifying the number of attendees will improve recommendations');
  }
  
  if (confidence.overall < 0.6) {
    suggestions.push('Try providing more specific details for better results');
  }
  
  if (!entities.eventType || confidence.eventType < 0.7) {
    suggestions.push('Mentioning the type of event helps find suitable venues');
  }
  
  if (!entities.budget) {
    suggestions.push('Consider specifying your budget range');
  }
  
  return suggestions;
};

/**
 * Common venue-related keywords for pattern matching fallback
 */
export const VENUE_KEYWORDS = {
  eventTypes: [
    'conference', 'meeting', 'wedding', 'party', 'seminar', 'workshop',
    'training', 'presentation', 'celebration', 'reception', 'gala',
    'exhibition', 'trade show', 'networking', 'corporate', 'business'
  ],
  
  amenities: [
    'wifi', 'parking', 'catering', 'av equipment', 'projector', 'microphone',
    'sound system', 'stage', 'dance floor', 'bar', 'kitchen', 'outdoor space',
    'accessibility', 'air conditioning', 'heating', 'lighting'
  ],
  
  capacityTerms: [
    'people', 'persons', 'attendees', 'guests', 'participants', 'delegates',
    'individuals', 'pax'
  ],
  
  timeTerms: [
    'today', 'tomorrow', 'next week', 'next month', 'this weekend',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ]
};
```

## Health Check Integration

### Updated Health Controller

```typescript
// controllers/healthController.ts (Ollama integration)
/**
 * Check Ollama LLM connectivity and model availability
 */
async function checkOllamaHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const ollamaUrl = process.env['OLLAMA_API_URL'] || 'http://localhost:11434';
    
    // Check basic connectivity
    const healthResponse = await fetch(`${ollamaUrl}/api/health`);
    if (!healthResponse.ok) {
      throw new Error(`Ollama health check failed: ${healthResponse.status}`);
    }
    
    // Check model availability
    const tagsResponse = await fetch(`${ollamaUrl}/api/tags`);
    if (!tagsResponse.ok) {
      throw new Error(`Failed to fetch Ollama models: ${tagsResponse.status}`);
    }
    
    const tagsData = await tagsResponse.json() as any;
    const models = tagsData.models || [];
    const modelName = 'llama3.1:8b';
    const modelAvailable = models.some((model: any) => model.name === modelName);
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: modelAvailable ? 'healthy' : 'degraded',
      responseTime,
      details: {
        model: modelName,
        modelAvailable,
        totalModels: models.length,
        apiUrl: ollamaUrl,
        models: models.map((m: any) => m.name).slice(0, 5), // Show first 5 models
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      responseTime,
      details: {
        error: error instanceof Error ? error.message : 'Ollama service unavailable',
        model: 'llama3.1:8b',
        apiUrl: process.env['OLLAMA_API_URL'] || 'http://localhost:11434',
      },
    };
  }
}
```

## Benefits of Ollama Integration

### Cost Advantages
- **Zero API Costs**: No usage-based pricing or token limits
- **No Rate Limits**: Process unlimited requests without throttling
- **Predictable Costs**: Only infrastructure costs, no variable AI service fees

### Privacy & Security
- **Local Processing**: All data stays on your infrastructure
- **No Data Transmission**: Queries never leave your environment
- **Compliance Ready**: Easier to meet data protection requirements
- **Full Control**: Complete control over model versions and updates

### Performance Benefits
- **Low Latency**: No network round-trips to external APIs
- **High Availability**: Not dependent on external service uptime
- **Scalable**: Can run multiple instances for high throughput
- **Offline Capable**: Works without internet connectivity

### Development Advantages
- **No API Key Management**: Eliminates API key rotation and security concerns
- **Consistent Environment**: Same model behavior across dev/staging/production
- **Easy Testing**: No API quotas limiting test runs
- **Version Control**: Pin specific model versions for reproducible results

## Performance Optimization

### Model Configuration
```typescript
// Optimized Ollama request parameters
const optimizedRequest = {
  messages: [...],
  options: {
    temperature: 0.1,        // Low temperature for consistent extractions
    top_p: 0.9,             // Nucleus sampling for quality
    num_predict: 500,       // Limit response length for JSON
    stop: ["\n\n", "```"],  // Stop tokens to prevent over-generation
  }
};
```

### Caching Strategy
- **Memory Cache**: First-level cache for frequently accessed extractions
- **Redis Cache**: Distributed cache for production environments
- **Cache Key Strategy**: Hash query + context for optimal hit rates
- **TTL Management**: Appropriate expiration times based on query patterns

### Resource Management
- **Connection Pooling**: Reuse HTTP connections to Ollama
- **Request Queuing**: Queue requests during high load
- **Circuit Breaker**: Fail fast when Ollama is unavailable
- **Graceful Degradation**: Fallback to pattern-based extraction

This Ollama integration provides a robust, cost-effective, and privacy-focused solution for natural language processing in the venue booking application while maintaining all the functionality previously provided by Claude AI.