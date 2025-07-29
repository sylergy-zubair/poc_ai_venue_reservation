// Basic type definitions for the venue booking application

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
}

export interface DetailedHealthStatus extends HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: ServiceHealth;
    ollamaLlm: ServiceHealth;
    venueProviders: ServiceHealth;
  };
  system: SystemHealth;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: Record<string, any>;
}

export interface SystemHealth {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  disk?: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

export interface VenueSearchRequest {
  location: string;
  capacity?: number;
  date?: Date;
  eventType?: string;
  duration?: number;
  amenities?: string[];
}

export interface VenueDetails {
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
  };
  amenities: string[];
  rating: number;
  verified: boolean;
}

export interface BookingRequest {
  venueId: string;
  date: Date;
  startTime: string;
  endTime: string;
  attendeeCount: number;
  eventType: string;
  contactInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company?: string;
  };
}

export interface EntityExtractionRequest {
  query: string;
  sessionId?: string;
  context?: {
    previousQuery?: string;
    userLocation?: string;
    dateContext?: string;
    userPreferences?: Record<string, any>;
  };
}

export interface ExtractedEntities {
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
}

export interface EntityExtractionResult {
  sessionId: string;
  entities: ExtractedEntities;
  confidence: {
    overall: number;
    location: number;
    date: number;
    capacity: number;
    eventType: number;
  };
  reasoning?: string;
  suggestions: string[];
  metadata: {
    processingTime?: number;
    tokens?: number;
    timestamp?: string;
    model?: string;
    fromCache?: boolean;
    fallback?: boolean;
    totalDuration?: number;
    loadDuration?: number;
    evalDuration?: number;
  };
}