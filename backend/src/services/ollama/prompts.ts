// Prompt templates optimized for Llama 3.1 entity extraction

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
 * Build the full prompt for entity extraction with context
 */
export const buildEntityExtractionPrompt = (
  query: string, 
  context?: ExtractionContext
): string => {
  let contextInfo = '';
  
  if (context?.userLocation) {
    contextInfo += `User's current location: ${context.userLocation}\n`;
  }
  
  if (context?.dateContext) {
    contextInfo += `Current date: ${context.dateContext}\n`;
  }
  
  if (context?.previousQuery) {
    contextInfo += `Previous query context: "${context.previousQuery}"\n`;
  }

  const fullPrompt = `${ENTITY_EXTRACTION_SYSTEM_PROMPT}

${contextInfo ? `CONTEXT:\n${contextInfo}\n` : ''}QUERY TO ANALYZE: "${query}"

Extract venue search entities and return JSON only:`;

  return fullPrompt;
};

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
 * Fallback prompt for simple pattern-based extraction
 */
export const FALLBACK_EXTRACTION_PROMPT = `Extract basic venue information from this query as JSON:

Query: "{query}"

Return only: {
  "location": "city name or null",
  "capacity": "number or null", 
  "eventType": "event type or null"
}`;

/**
 * Validation prompt to check if extraction results make sense
 */
export const VALIDATION_PROMPT = `Review this venue search extraction for accuracy:

Original Query: "{query}"
Extracted Data: {extractedData}

Is this extraction reasonable? Return only "valid" or "invalid" with brief reason.`;

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