// API Response Types
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
    processingTime?: number;
  };
}

// Entity Extraction Types
export interface ExtractedEntities {
  location: string | null;
  date: string | null; // ISO date string
  capacity: number | null;
  eventType: string | null;
  duration: number | null; // hours
  budget: {
    min?: number;
    max?: number;
    currency?: string;
  } | null;
  amenities: string[];
}

export interface ConfidenceScores {
  overall: number;
  location: number;
  date: number;
  capacity: number;
  eventType: number;
}

export interface EntityExtractionResult {
  sessionId: string;
  entities: ExtractedEntities;
  confidence: ConfidenceScores;
  reasoning?: string;
  suggestions: string[];
  metadata: {
    processingTime?: number;
    timestamp?: string;
    model?: string;
    fromCache?: boolean;
    fallback?: boolean;
  };
}

// Venue Types
export interface VenueLocation {
  address: string;
  city: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  postalCode?: string;
  region?: string;
}

export interface VenueCapacity {
  min: number;
  max: number;
  recommended: number;
  theater?: number;
  classroom?: number;
  banquet?: number;
  cocktail?: number;
}

export interface VenueAmenity {
  id: string;
  name: string;
  category: 'tech' | 'catering' | 'accessibility' | 'parking' | 'other';
  description?: string;
  included: boolean;
  additionalCost?: number;
}

export interface VenuePricing {
  basePrice: number;
  currency: string;
  unit: 'hour' | 'day' | 'event';
  minimumBooking?: number;
  additionalFees?: Array<{
    name: string;
    amount: number;
    type: 'fixed' | 'percentage';
  }>;
}

export interface VenueAvailability {
  date: string;
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    available: boolean;
    price?: number;
  }>;
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  images: string[];
  location: VenueLocation;
  capacity: VenueCapacity;
  amenities: VenueAmenity[];
  pricing: VenuePricing;
  rating: number;
  reviewCount: number;
  categories: string[];
  features: string[];
  availability?: VenueAvailability[];
  provider: {
    id: string;
    name: string;
    logo?: string;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    verified: boolean;
    featured: boolean;
  };
}

// Search Types
export interface SearchFilters {
  location?: string;
  date?: string;
  capacity?: {
    min?: number;
    max?: number;
  };
  eventType?: string;
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  amenities?: string[];
  categories?: string[];
  rating?: number;
  sortBy?: 'relevance' | 'price' | 'rating' | 'distance';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  venues: Venue[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters: SearchFilters;
  metadata: {
    searchTime: number;
    query?: string;
    sessionId?: string;
  };
}

// Booking Types
export interface BookingContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  role?: string;
}

export interface BookingDetails {
  venueId: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeeCount: number;
  eventType: string;
  eventName?: string;
  eventDescription?: string;
  specialRequirements?: string;
  selectedAmenities?: string[];
}

export interface BookingRequest {
  contact: BookingContact;
  details: BookingDetails;
  sessionId?: string;
  source?: 'web' | 'mobile' | 'api';
}

export interface BookingResponse {
  bookingId: string;
  status: 'pending' | 'confirmed' | 'rejected';
  venue: Venue;
  details: BookingDetails;
  contact: BookingContact;
  totalPrice: number;
  currency: string;
  confirmationDeadline?: string;
  providerContact?: {
    name: string;
    email: string;
    phone: string;
  };
  nextSteps: string[];
  metadata: {
    createdAt: string;
    provider: string;
    reference?: string;
  };
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'date' | 'time';
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FormErrors {
  [key: string]: string | undefined;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
  details?: Record<string, any>;
}

// Session Types
export interface UserSession {
  sessionId: string;
  createdAt: string;
  lastActivity: string;
  searchHistory: Array<{
    query: string;
    timestamp: string;
    results?: number;
  }>;
  preferences?: {
    location?: string;
    currency?: string;
    eventTypes?: string[];
  };
}

// Analytics Types
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  sessionId?: string;
  userId?: string;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

// Environment Types
export interface EnvironmentConfig {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  analyticsId?: string;
  sentryDsn?: string;
  features: {
    analytics: boolean;
    errorReporting: boolean;
    hotReload: boolean;
  };
}