import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import type {
  ApiResponse,
  EntityExtractionResult,
  SearchResult,
  SearchFilters,
  BookingRequest,
  BookingResponse,
} from '../types';

// Create axios instance with default configuration
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Add session ID if available
      const sessionId = getSessionId();
      if (sessionId) {
        config.headers['X-Session-ID'] = sessionId;
      }

      // Add request timestamp
      config.headers['X-Request-Time'] = new Date().toISOString();

      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });

      return config;
    },
    (error) => {
      console.error('❌ Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      const { data } = response;
      
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: data.data,
        processingTime: data.metadata?.processingTime,
      });

      // Handle successful responses with error flag
      if (!data.success && data.error) {
        throw new ApiError(data.error.message, data.error.code, response.status);
      }

      return response;
    },
    (error: AxiosError<ApiResponse>) => {
      const { response } = error;
      
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: response?.status,
        message: error.message,
        data: response?.data,
      });

      // Handle different error scenarios
      if (response?.data?.error) {
        throw new ApiError(
          response.data.error.message,
          response.data.error.code,
          response.status
        );
      }

      if (error.code === 'ECONNABORTED') {
        throw new ApiError('Request timeout', 'TIMEOUT', 408);
      }

      if (!response) {
        throw new ApiError('Network error', 'NETWORK_ERROR', 0);
      }

      throw new ApiError(
        response.statusText || 'Unknown error',
        'UNKNOWN_ERROR',
        response.status
      );
    }
  );

  return client;
};

// Custom error class
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Session management
const getSessionId = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  let sessionId = localStorage.getItem('venue-booking-session');
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('venue-booking-session', sessionId);
  }
  return sessionId;
};

const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// API client instance
const apiClient = createApiClient();

// API service class
export class ApiService {
  // Health check
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await apiClient.get<ApiResponse<{ status: string; timestamp: string }>>('/health');
      return response.data.data!;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Entity extraction
  static async extractEntities(
    query: string,
    context?: {
      previousQuery?: string;
      userLocation?: string;
      dateContext?: string;
    }
  ): Promise<EntityExtractionResult> {
    try {
      const response = await apiClient.post<ApiResponse<EntityExtractionResult>>('/api/extract', {
        query,
        context,
      });

      return response.data.data!;
    } catch (error) {
      console.error('Entity extraction failed:', error);
      
      // Show user-friendly error message
      if (error instanceof ApiError) {
        toast.error(`Entity extraction failed: ${error.message}`);
      } else {
        toast.error('Failed to process your search query. Please try again.');
      }
      
      throw error;
    }
  }

  // Venue search
  static async searchVenues(
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult> {
    try {
      const response = await apiClient.post<ApiResponse<SearchResult>>('/api/venues/search', {
        filters,
        page,
        limit,
      });

      return response.data.data!;
    } catch (error) {
      console.error('Venue search failed:', error);
      
      if (error instanceof ApiError) {
        toast.error(`Search failed: ${error.message}`);
      } else {
        toast.error('Failed to search venues. Please try again.');
      }
      
      throw error;
    }
  }

  // Get venue details
  static async getVenueDetails(venueId: string): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse>(`/api/venues/${venueId}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get venue details:', error);
      
      if (error instanceof ApiError) {
        toast.error(`Failed to load venue: ${error.message}`);
      } else {
        toast.error('Failed to load venue details. Please try again.');
      }
      
      throw error;
    }
  }

  // Create booking request
  static async createBooking(booking: BookingRequest): Promise<BookingResponse> {
    try {
      const response = await apiClient.post<ApiResponse<BookingResponse>>('/api/venues/book', booking);
      
      toast.success('Booking request submitted successfully!');
      return response.data.data!;
    } catch (error) {
      console.error('Booking creation failed:', error);
      
      if (error instanceof ApiError) {
        toast.error(`Booking failed: ${error.message}`);
      } else {
        toast.error('Failed to submit booking request. Please try again.');
      }
      
      throw error;
    }
  }

  // Get booking status
  static async getBookingStatus(bookingId: string): Promise<BookingResponse> {
    try {
      const response = await apiClient.get<ApiResponse<BookingResponse>>(`/api/bookings/${bookingId}`);
      return response.data.data!;
    } catch (error) {
      console.error('Failed to get booking status:', error);
      throw error;
    }
  }

  // Analytics tracking
  static async trackEvent(eventName: string, properties: Record<string, any> = {}): Promise<void> {
    try {
      await apiClient.post('/api/analytics/track', {
        event: eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          sessionId: getSessionId(),
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        },
      });
    } catch (error) {
      // Don't show error to user for analytics failures
      console.warn('Analytics tracking failed:', error);
    }
  }
}

// Utility functions for common API patterns
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      console.warn(`Attempt ${attempt} failed, retrying in ${backoffDelay}ms...`, error);
    }
  }

  throw lastError!;
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Export configured axios instance for custom requests
export { apiClient };
export default ApiService;