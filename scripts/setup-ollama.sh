#!/bin/bash

# Setup script for Ollama model downloading
# This script ensures Llama 3.1 8B is available for the application

set -e

OLLAMA_URL=${OLLAMA_API_URL:-"http://ollama:11434"}
MODEL_NAME="llama3.1:8b"
MAX_RETRIES=30
RETRY_DELAY=10

echo "🦙 Setting up Ollama with Llama 3.1 8B model..."

# Wait for Ollama service to be ready
echo "⏳ Waiting for Ollama service to be ready..."
for i in $(seq 1 $MAX_RETRIES); do
    if curl -f "$OLLAMA_URL/api/health" > /dev/null 2>&1; then
        echo "✅ Ollama service is ready!"
        break
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        echo "❌ Ollama service failed to start after $MAX_RETRIES attempts"
        exit 1
    fi
    
    echo "   Attempt $i/$MAX_RETRIES - waiting ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
done

# Check if model is already available
echo "🔍 Checking if Llama 3.1 8B model is available..."
if curl -s "$OLLAMA_URL/api/tags" | grep -q "$MODEL_NAME"; then
    echo "✅ Llama 3.1 8B model is already available!"
else
    echo "📥 Downloading Llama 3.1 8B model (this may take several minutes)..."
    
    # Pull the model
    curl -X POST "$OLLAMA_URL/api/pull" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$MODEL_NAME\"}" \
        --max-time 1800  # 30 minute timeout for download
    
    if [ $? -eq 0 ]; then
        echo "✅ Llama 3.1 8B model downloaded successfully!"
    else
        echo "❌ Failed to download Llama 3.1 8B model"
        exit 1
    fi
fi

# Test the model with a simple entity extraction
echo "🧪 Testing model with sample entity extraction..."
TEST_RESPONSE=$(curl -s -X POST "$OLLAMA_URL/api/generate" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "'$MODEL_NAME'",
        "prompt": "Extract entities from: \"I need a venue for 100 people in Madrid tomorrow\" Return JSON only: {\"location\": \"\", \"capacity\": 0, \"date\": \"\"}",
        "stream": false,
        "options": {
            "temperature": 0.1,
            "num_predict": 100
        }
    }')

if echo "$TEST_RESPONSE" | grep -q "Madrid"; then
    echo "✅ Model test successful - entity extraction working!"
else
    echo "⚠️  Model test completed but results unclear. Manual verification recommended."
fi

echo ""
echo "🎉 Ollama setup complete!"
echo "   Model: $MODEL_NAME"
echo "   API URL: $OLLAMA_URL"
echo "   Status: Ready for entity extraction"
echo ""