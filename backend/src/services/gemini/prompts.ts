// Prompt templates optimized for Google Gemini entity extraction

export interface ExtractionContext {
  previousQuery?: string;
  userLocation?: string;
  dateContext?: string;
  userPreferences?: Record<string, any>;
}

/**
 * System prompt for Gemini entity extraction
 * Optimized for Gemini's instruction following capabilities
 */
export const ENTITY_EXTRACTION_SYSTEM_PROMPT = `You are an expert venue booking assistant specializing in extracting structured data from natural language queries. Your task is to analyze venue search requests and extract precise booking parameters.

**CORE INSTRUCTIONS:**
1. Extract ONLY information that is explicitly stated or clearly implied
2. Use null for any missing or unclear information
3. Normalize location names to proper city format
4. Convert relative dates (like "tomorrow", "next Friday") to specific YYYY-MM-DD format
5. Return ONLY valid JSON in the exact format specified below
6. Do not include any explanations, markdown, or additional text outside the JSON

**EXTRACTION RULES:**
- Location: Extract city names, normalize common abbreviations (e.g., "NYC" → "New York")
- Date: Convert relative dates using current context, format as YYYY-MM-DD
- Capacity: Extract number of people/attendees/guests
- Event Type: Identify event category (meeting, conference, wedding, party, etc.)
- Duration: Extract event length in hours (e.g., "half day" → 4, "full day" → 8)
- Budget: Extract price ranges with currency
- Amenities: List specific requirements (WiFi, parking, catering, AV equipment, etc.)

**REQUIRED JSON OUTPUT FORMAT:**
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
    "overall": "number between 0-1",
    "location": "number between 0-1",
    "date": "number between 0-1", 
    "capacity": "number between 0-1",
    "eventType": "number between 0-1"
  },
  "reasoning": "Brief explanation of extractions made"
}

**EXAMPLE EXTRACTION:**
Query: "Need a conference room for 50 people in Madrid next Wednesday with WiFi and projector, budget around 800 euros"

Response:
{
  "entities": {
    "location": "Madrid",
    "date": "2024-02-21",
    "capacity": 50,
    "eventType": "conference",
    "duration": null,
    "budget": {
      "min": 700,
      "max": 900,
      "currency": "EUR"
    },
    "amenities": ["WiFi", "projector"]
  },
  "confidence": {
    "overall": 0.92,
    "location": 0.95,
    "date": 0.85,
    "capacity": 0.98,
    "eventType": 0.90
  },
  "reasoning": "Clear location (Madrid), specific capacity (50), relative date converted, event type inferred from 'conference room', budget range estimated from 'around 800', amenities explicitly listed"
}

**IMPORTANT:** Return ONLY the JSON object. No markdown formatting, no explanations, no additional text.`;

/**
 * Build optimized messages for Gemini API
 * Gemini works best with clear system instructions combined with user queries
 */
export const buildEntityExtractionMessages = (
  query: string,
  context?: ExtractionContext
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> => {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: ENTITY_EXTRACTION_SYSTEM_PROMPT,
    },
  ];

  // Build user message with context
  let userMessage = `Extract venue booking entities from this query: "${query}"`;
  
  if (context) {
    let contextInfo = '';
    
    if (context.dateContext) {
      contextInfo += `\nCurrent date: ${context.dateContext}`;
    }
    
    if (context.userLocation) {
      contextInfo += `\nUser's current location: ${context.userLocation}`;
    }
    
    if (context.previousQuery) {
      contextInfo += `\nPrevious query context: "${context.previousQuery}"`;
    }
    
    if (context.userPreferences) {
      contextInfo += `\nUser preferences: ${JSON.stringify(context.userPreferences)}`;
    }
    
    if (contextInfo) {
      userMessage += `\n\nADDITIONAL CONTEXT:${contextInfo}`;
    }
  }
  
  userMessage += '\n\nProvide the JSON response in the exact format specified in the system instructions.';
  
  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
};

/**
 * Generate contextual suggestions based on extracted entities and confidence scores
 */
export const generateSuggestions = (
  entities: any,
  confidence: any
): string[] => {
  const suggestions: string[] = [];
  
  // Location suggestions
  if (!entities.location || confidence.location < 0.7) {
    suggestions.push('Consider specifying a city or location for better venue matches');
  }
  
  // Date suggestions
  if (!entities.date || confidence.date < 0.7) {
    suggestions.push('Adding a specific date helps find available venues');
  }
  
  // Capacity suggestions
  if (!entities.capacity || confidence.capacity < 0.7) {
    suggestions.push('Specifying the number of attendees improves recommendations');
  }
  
  // Event type suggestions
  if (!entities.eventType || confidence.eventType < 0.7) {
    suggestions.push('Mentioning the event type (meeting, conference, wedding) helps find suitable venues');
  }
  
  // Budget suggestions
  if (!entities.budget || (!entities.budget.min && !entities.budget.max)) {
    suggestions.push('Including your budget range helps filter appropriate venues');
  }
  
  // Amenities suggestions
  if (!entities.amenities || entities.amenities.length === 0) {
    suggestions.push('Mentioning required amenities (WiFi, parking, catering) helps narrow down options');
  }
  
  // Overall confidence suggestions
  if (confidence.overall < 0.6) {
    suggestions.push('Try providing more specific details for more accurate venue matching');
    suggestions.push('Example: "I need a conference room for 30 people in downtown Seattle on March 15th with WiFi and catering"');
  }
  
  return suggestions;
};

/**
 * Validation prompt for Gemini to verify extraction quality
 */
export const buildValidationPrompt = (query: string, extractedData: any): string => {
  return `Review this venue search extraction for accuracy and completeness:

Original Query: "${query}"

Extracted Data:
${JSON.stringify(extractedData, null, 2)}

Validate:
1. Are the extracted entities accurate based on the query?
2. Are the confidence scores reasonable?
3. Are there any obvious mistakes or missing information?

Respond with JSON only:
{
  "isValid": true/false,
  "issues": ["list of any issues found"],
  "suggestions": ["list of improvements"]
}`;
};

/**
 * Common venue-related keywords and patterns for Gemini context
 */
export const VENUE_KEYWORDS = {
  eventTypes: [
    'conference', 'meeting', 'business meeting', 'corporate meeting',
    'wedding', 'wedding reception', 'ceremony', 
    'party', 'birthday party', 'celebration', 'anniversary',
    'seminar', 'workshop', 'training session', 'training',
    'presentation', 'pitch', 'demo',
    'networking', 'networking event', 'mixer',
    'reception', 'cocktail reception', 'gala',
    'exhibition', 'trade show', 'expo', 'fair',
    'concert', 'performance', 'show',
    'graduation', 'ceremony', 'award ceremony'
  ],
  
  amenities: [
    'wifi', 'wi-fi', 'internet', 'wireless',
    'parking', 'parking space', 'valet parking',
    'catering', 'food', 'refreshments', 'lunch', 'dinner', 'breakfast',
    'av equipment', 'audio visual', 'projector', 'screen', 'microphone',
    'sound system', 'speakers', 'lighting',
    'stage', 'platform', 'podium',
    'dance floor', 'dancing',
    'bar', 'open bar', 'cash bar',
    'kitchen', 'prep kitchen', 'warming kitchen',
    'outdoor space', 'terrace', 'garden', 'patio',
    'accessibility', 'wheelchair accessible', 'ada compliant',
    'air conditioning', 'heating', 'climate control',
    'security', 'coat check', 'registration desk'
  ],
  
  capacityTerms: [
    'people', 'persons', 'attendees', 'guests', 'participants', 
    'delegates', 'individuals', 'pax', 'seats', 'seated'
  ],
  
  timeTerms: [
    'today', 'tomorrow', 'day after tomorrow',
    'this week', 'next week', 'this weekend', 'next weekend',
    'this month', 'next month',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'morning', 'afternoon', 'evening', 'night',
    'am', 'pm', 'noon', 'midnight'
  ],
  
  budgetTerms: [
    'budget', 'cost', 'price', 'rate', 'fee', 'charge',
    'under', 'over', 'around', 'approximately', 'about',
    'up to', 'maximum', 'max', 'minimum', 'min',
    'per hour', 'per day', 'total', 'all in'
  ],
  
  locationTypes: [
    'downtown', 'city center', 'uptown', 'midtown',
    'near airport', 'airport', 'near station', 'train station',
    'business district', 'financial district',
    'hotel', 'conference center', 'convention center',
    'restaurant', 'banquet hall', 'ballroom',
    'office building', 'coworking space',
    'outdoor', 'indoor', 'rooftop', 'waterfront'
  ]
};

/**
 * Date parsing helper for Gemini context
 */
export const getCurrentDateContext = (): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  };
  
  return `Today is ${now.toLocaleDateString('en-US', options)} (${now.toISOString().split('T')[0]})`;
};

/**
 * Build enhanced prompt with date context for better relative date parsing
 */
export const buildEntityExtractionPrompt = (
  query: string,
  context?: ExtractionContext
): string => {
  let fullPrompt = ENTITY_EXTRACTION_SYSTEM_PROMPT;
  
  // Add current date context for relative date parsing
  fullPrompt += `\n\n**CURRENT DATE CONTEXT:**\n${getCurrentDateContext()}`;
  
  if (context?.userLocation) {
    fullPrompt += `\n**USER LOCATION:** ${context.userLocation}`;
  }
  
  if (context?.previousQuery) {
    fullPrompt += `\n**PREVIOUS QUERY:** "${context.previousQuery}"`;
  }
  
  fullPrompt += `\n\n**QUERY TO ANALYZE:** "${query}"`;
  
  return fullPrompt;
};