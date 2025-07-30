import axios, { AxiosInstance } from 'axios';
import { SimplyBookAuth, SimplyBookAuthConfig, SimplyBookAuthError } from './auth';
import logger from '../../utils/logger';

export interface SimplyBookConfig extends SimplyBookAuthConfig {
  apiUrl?: string;
  timeout?: number;
  rateLimitDelay?: number;
}

export interface SimplyBookService {
  id: number;
  name: string;
  description?: string;
  duration?: number;
  price?: number;
  currency?: string;
  category_id?: number;
}

export interface SimplyBookUnit {
  id: number;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
}

export interface SimplyBookTimeSlot {
  time: string;
  datetime: string;
  available: boolean;
}

export interface SimplyBookBookingData {
  event_id: number;
  unit_id: number;
  datetime: string;
  client: {
    name: string;
    email: string;
    phone: string;
  };
  additional_fields?: Record<string, any>;
}

export interface SimplyBookBookingResult {
  booking_id: number;
  booking_hash: string;
  status: string;
  datetime: string;
  client: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

export class SimplyBookError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public response?: any
  ) {
    super(message);
    this.name = 'SimplyBookError';
  }
}

export class SimplyBookRateLimitError extends SimplyBookError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'SimplyBookRateLimitError';
  }
}

/**
 * SimplyBook.me API client
 * Handles all API interactions with proper authentication and error handling
 */
export class SimplyBookClient {
  private config: SimplyBookConfig;
  private auth: SimplyBookAuth;
  private httpClient: AxiosInstance;
  private lastRequestTime = 0;
  private requestCounter = 0;

  constructor(config: SimplyBookConfig) {
    this.config = {
      apiUrl: 'https://user-api.simplybook.me',
      timeout: 30000,
      rateLimitDelay: 200, // 200ms between requests (5 req/sec max)
      ...config,
    };

    this.auth = new SimplyBookAuth(config);

    this.httpClient = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VenueBooking-API/1.0',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for authentication and rate limiting
    this.httpClient.interceptors.request.use(
      async (config) => {
        // Apply rate limiting
        await this.enforceRateLimit();

        // Add authentication headers
        const authHeaders = await this.auth.getAuthHeaders();
        Object.assign(config.headers!, authHeaders);

        logger.debug('SimplyBook API request', {
          url: config.url,
          method: config.method,
          requestId: ++this.requestCounter,
        });

        return config;
      },
      (error) => {
        logger.error('SimplyBook API request setup error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug('SimplyBook API response', {
          status: response.status,
          url: response.config.url,
          hasData: !!response.data,
        });
        return response;
      },
      (error) => {
        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status;
          const errorData = error.response?.data;

          logger.error('SimplyBook API response error', {
            status: statusCode,
            message: error.message,
            url: error.config?.url,
            errorData,
          });

          // Handle specific error cases
          if (statusCode === 429) {
            const retryAfter = parseInt(error.response?.headers['retry-after'] || '60');
            throw new SimplyBookRateLimitError(
              'Rate limit exceeded',
              retryAfter
            );
          }

          throw new SimplyBookError(
            errorData?.error?.message || error.message,
            statusCode,
            errorData?.error?.code,
            errorData
          );
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Enforce rate limiting between API calls
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.config.rateLimitDelay!) {
      const delay = this.config.rateLimitDelay! - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Make JSON-RPC 2.0 API call
   */
  private async makeRpcCall<T = any>(
    method: string,
    params: any[] = [],
    endpoint = ''
  ): Promise<T> {
    const rpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    };

    try {
      const response = await this.httpClient.post(endpoint, rpcRequest);

      if (response.data.error) {
        throw new SimplyBookError(
          response.data.error.message || 'API call failed',
          response.status,
          response.data.error.code,
          response.data.error
        );
      }

      return response.data.result;
    } catch (error) {
      if (error instanceof SimplyBookError || error instanceof SimplyBookRateLimitError) {
        throw error;
      }

      throw new SimplyBookError(
        `RPC call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'RPC_CALL_FAILED'
      );
    }
  }

  /**
   * Get list of available services (venues/event types)
   */
  async getServices(): Promise<SimplyBookService[]> {
    logger.info('Fetching SimplyBook services');
    
    try {
      const services = await this.makeRpcCall<SimplyBookService[]>('getEventList');
      
      logger.info('SimplyBook services fetched successfully', {
        count: services.length,
      });
      
      return services;
    } catch (error) {
      logger.error('Failed to fetch SimplyBook services', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get list of units (venues/locations/staff)
   */
  async getUnits(): Promise<SimplyBookUnit[]> {
    logger.info('Fetching SimplyBook units');
    
    try {
      const units = await this.makeRpcCall<SimplyBookUnit[]>('getUnitList');
      
      logger.info('SimplyBook units fetched successfully', {
        count: units.length,
      });
      
      return units;
    } catch (error) {
      logger.error('Failed to fetch SimplyBook units', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get available time slots for a specific date and service
   */
  async getAvailableTimeSlots(
    serviceId: number,
    unitId: number,
    date: string
  ): Promise<SimplyBookTimeSlot[]> {
    logger.info('Fetching available time slots', {
      serviceId,
      unitId,
      date,
    });
    
    try {
      const timeMatrix = await this.makeRpcCall<string[]>(
        'getStartTimeMatrix',
        [date, serviceId, unitId]
      );
      
      // Convert time strings to structured time slots
      const timeSlots: SimplyBookTimeSlot[] = timeMatrix.map(time => ({
        time,
        datetime: `${date} ${time}`,
        available: true, // If returned by API, it's available
      }));
      
      logger.info('Time slots fetched successfully', {
        serviceId,
        unitId,
        date,
        count: timeSlots.length,
      });
      
      return timeSlots;
    } catch (error) {
      logger.error('Failed to fetch time slots', {
        serviceId,
        unitId,
        date,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData: SimplyBookBookingData): Promise<SimplyBookBookingResult> {
    logger.info('Creating SimplyBook booking', {
      eventId: bookingData.event_id,
      unitId: bookingData.unit_id,
      datetime: bookingData.datetime,
      clientEmail: bookingData.client.email,
    });
    
    try {
      const result = await this.makeRpcCall<any>(
        'book',
        [
          bookingData.event_id,
          bookingData.unit_id,
          bookingData.datetime,
          bookingData.client,
          bookingData.additional_fields || {}
        ]
      );
      
      // Transform result to standardized format
      const bookingResult: SimplyBookBookingResult = {
        booking_id: result.booking_id || result.id,
        booking_hash: result.booking_hash || result.hash,
        status: result.status || 'confirmed',
        datetime: bookingData.datetime,
        client: {
          id: result.client_id || result.client?.id,
          name: bookingData.client.name,
          email: bookingData.client.email,
          phone: bookingData.client.phone,
        },
      };
      
      logger.info('SimplyBook booking created successfully', {
        bookingId: bookingResult.booking_id,
        bookingHash: bookingResult.booking_hash,
        status: bookingResult.status,
      });
      
      return bookingResult;
    } catch (error) {
      logger.error('Failed to create SimplyBook booking', {
        eventId: bookingData.event_id,
        unitId: bookingData.unit_id,
        datetime: bookingData.datetime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get booking details by ID
   */
  async getBooking(bookingId: number): Promise<any> {
    logger.info('Fetching booking details', { bookingId });
    
    try {
      const booking = await this.makeRpcCall('getBookingDetails', [bookingId]);
      
      logger.info('Booking details fetched successfully', { bookingId });
      
      return booking;
    } catch (error) {
      logger.error('Failed to fetch booking details', {
        bookingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: number, bookingHash: string): Promise<boolean> {
    logger.info('Cancelling booking', { bookingId, bookingHash });
    
    try {
      const result = await this.makeRpcCall('cancelBooking', [bookingId, bookingHash]);
      
      logger.info('Booking cancelled successfully', { bookingId, result });
      
      return !!result;
    } catch (error) {
      logger.error('Failed to cancel booking', {
        bookingId,
        bookingHash,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Test API connection and authentication
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const tokenInfo = this.auth.getTokenInfo();
      const services = await this.getServices();
      
      return {
        status: 'healthy',
        details: {
          authenticated: !!tokenInfo,
          tokenExpiry: tokenInfo?.expiresAt,
          servicesCount: services.length,
          companyLogin: this.config.companyLogin,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          authenticated: false,
        },
      };
    }
  }

  /**
   * Get configuration info
   */
  getConfig() {
    return {
      companyLogin: this.config.companyLogin,
      apiUrl: this.config.apiUrl,
      timeout: this.config.timeout,
      rateLimitDelay: this.config.rateLimitDelay,
    };
  }
}

// Export factory function
export function createSimplyBookClient(config: SimplyBookConfig): SimplyBookClient {
  return new SimplyBookClient(config);
}