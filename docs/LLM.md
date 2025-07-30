# LLM Integration Guide - Ollama Setup (DEPRECATED)

⚠️ **IMPORTANT: This integration has been replaced with Google Gemini API**

**For current setup instructions, see: [LLM-Gemini.md](./LLM-Gemini.md)**

---

This document provides step-by-step instructions for setting up Ollama LLM integration to enable advanced natural language processing for venue search queries.

**Note**: This documentation is kept for reference only. The application now uses Google Gemini API instead of Ollama for better reliability and performance.

## Overview

The venue booking application uses **Ollama** with **Llama 3.1 8B** model for entity extraction from natural language queries. Without Ollama, the system falls back to basic pattern matching with reduced accuracy.

## LLM vs Fallback Comparison

| Feature | With Ollama LLM | Without LLM (Fallback) |
|---------|----------------|------------------------|
| **Date parsing** | ✅ "next Friday" → specific date | ❌ null |
| **Budget extraction** | ✅ "$1000-2000" → structured data | ❌ null |
| **Complex queries** | ✅ High accuracy | ❌ Basic patterns only |
| **Confidence scores** | ✅ 0.7-0.9 typical | ❌ 0.3-0.5 max |
| **Amenities detection** | ✅ "need WiFi and parking" | ❌ empty array |
| **Context understanding** | ✅ Sophisticated | ❌ Limited |

### Example Query Processing

**Query**: `"I need a venue for 100 people in Madrid next Friday for a corporate meeting with WiFi and parking"`

**With Ollama LLM**:
```json
{
  "entities": {
    "location": "Madrid",
    "date": "2024-08-02",
    "capacity": 100,
    "eventType": "corporate meeting",
    "amenities": ["WiFi", "parking"]
  },
  "confidence": { "overall": 0.85 }
}
```

**Without LLM (Fallback)**:
```json
{
  "entities": {
    "location": "Madrid",
    "date": null,
    "capacity": 100,
    "eventType": "meeting",
    "amenities": []
  },
  "confidence": { "overall": 0.3 }
}
```

## Installation Instructions

### Prerequisites

- Linux/WSL2, macOS, or Windows
- At least 8GB RAM (16GB recommended)
- 10GB free disk space for model storage
- Internet connection for initial setup

### Step 1: Install Ollama

#### Linux/WSL2 (Recommended)
```bash
# Method 1: One-liner installation (requires sudo)
curl -fsSL https://ollama.com/install.sh | sh

# Method 2: Manual binary installation
curl -L https://ollama.com/download/ollama-linux-amd64 -o ollama
chmod +x ollama
sudo mv ollama /usr/local/bin/
```

#### macOS
```bash
# Using Homebrew
brew install ollama

# Or download from https://ollama.com/download/mac
```

#### Windows
Download the installer from [https://ollama.com/download/windows](https://ollama.com/download/windows)

### Step 2: Start Ollama Service

```bash
# Start Ollama server (keep this running)
ollama serve
```

**Note**: Keep this terminal open - Ollama needs to run as a background service.

### Step 3: Download Required Model

In a **new terminal**:

```bash
# Pull Llama 3.1 8B model (~4.7GB download)
ollama pull llama3.1:8b
```

**Download time**: Expect 10-30 minutes depending on internet speed.

### Step 4: Verify Installation

```bash
# Check if Ollama is running
curl http://localhost:11434/api/health

# List available models
ollama list

# Test model directly
ollama run llama3.1:8b "Hello, how are you?"
```

## Application Configuration

The venue booking app is pre-configured to use Ollama with these environment variables:

```bash
# .env configuration (already set)
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TEMPERATURE=0.1
OLLAMA_MAX_TOKENS=500
```

## Testing LLM Integration

### 1. Check Ollama Health

```bash
# Test Ollama API endpoint
curl http://localhost:11434/api/health
# Expected: 200 OK
```

### 2. Test Entity Extraction Endpoint

```bash
# Start the backend server
cd backend
npm run dev

# In another terminal, test entity extraction
curl -X POST http://localhost:3001/api/extract \
  -H "Content-Type: application/json" \
  -d '{"query": "I need a venue for 100 people in Madrid next month for a conference"}'
```

**Expected response with LLM**:
```json
{
  "success": true,
  "data": {
    "entities": {
      "location": "Madrid",
      "date": "2024-08-29",
      "capacity": 100,
      "eventType": "conference"
    },
    "confidence": {
      "overall": 0.82,
      "location": 0.95,
      "capacity": 0.90,
      "eventType": 0.85
    },
    "reasoning": "Extracted venue requirements using Llama 3.1",
    "metadata": {
      "model": "llama3.1:8b",
      "fromCache": false,
      "processingTime": 1250
    }
  }
}
```

### 3. Compare with Fallback

Stop Ollama (`Ctrl+C` in the serve terminal) and test the same endpoint to see fallback behavior.

## Performance Optimization

### Model Preloading
```bash
# Keep model loaded in memory
ollama run llama3.1:8b ""
```

### System Resource Allocation
```bash
# Check memory usage
ollama ps

# Monitor performance
top -p $(pgrep ollama)
```

### Ollama Configuration

Create `~/.ollama/config.yaml`:
```yaml
# Performance settings
models:
  llama3.1:8b:
    keep_alive: "24h"      # Keep model loaded
    temperature: 0.1       # Consistent responses
    num_predict: 200       # Token limit
```

## Troubleshooting

### Common Issues

#### 1. "Connection refused" error
```bash
# Check if Ollama is running
ps aux | grep ollama

# Start if not running
ollama serve
```

#### 2. Model not found
```bash
# Re-pull the model
ollama pull llama3.1:8b

# Verify it's available
ollama list
```

#### 3. High memory usage
```bash
# Check RAM usage
free -h

# Restart Ollama if needed
pkill ollama
ollama serve
```

#### 4. Slow responses
- Ensure sufficient RAM (8GB minimum)
- Close other memory-intensive applications
- Consider using a smaller model: `ollama pull llama3.1:7b`

### Health Check Commands

```bash
# Full health check sequence
curl http://localhost:11434/api/health
ollama list
ollama ps
curl -X POST http://localhost:3001/api/extract -H "Content-Type: application/json" -d '{"query": "test venue search"}'
```

## API Integration Details

### Request Flow
1. User query → Entity extraction endpoint (`/api/extract`)
2. System attempts Ollama API call
3. If successful: Advanced entity extraction with high confidence
4. If failed: Automatic fallback to pattern matching
5. Response returned with extracted entities and metadata

### Caching Strategy
- Successful LLM responses cached for 1 hour
- Cache key based on query + context
- Reduces repeated API calls for similar queries

### Error Handling
- **Connection errors**: Graceful fallback to patterns
- **Timeout errors**: Cached response if available
- **Model errors**: Retry with simplified prompt

## Development Notes

### Custom Prompts
Entity extraction prompts are optimized for Llama 3.1 in:
- `backend/src/services/ollama/prompts.ts`
- System prompts emphasize JSON output format
- Context-aware extraction for better accuracy

### Model Alternatives
If Llama 3.1 8B is too resource-intensive:
```bash
# Smaller alternatives
ollama pull llama3.1:7b    # ~3.8GB
ollama pull phi3:mini      # ~2.3GB
ollama pull gemma:7b       # ~4.8GB
```

Update `OLLAMA_MODEL` in `.env` accordingly.

## Production Considerations

### Docker Deployment
For production deployment, consider using Ollama in Docker:
```dockerfile
FROM ollama/ollama:latest
RUN ollama pull llama3.1:8b
EXPOSE 11434
CMD ["ollama", "serve"]
```

### Resource Requirements
- **Development**: 8GB RAM, 2 CPU cores
- **Production**: 16GB RAM, 4 CPU cores, SSD storage
- **High traffic**: Consider GPU acceleration

### Monitoring
- Monitor response times via built-in performance metrics
- Track fallback usage rates
- Set up alerts for Ollama service downtime

## Summary

With Ollama properly installed and configured, your venue booking application will provide:
- **Advanced natural language understanding**
- **Higher accuracy entity extraction**
- **Better user experience** with complex queries
- **Automatic fallback** ensures reliability

The system is designed to work seamlessly whether Ollama is available or not, but the LLM integration provides significantly enhanced functionality for processing natural language venue search requests.