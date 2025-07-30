import axios, { AxiosInstance } from 'axios';
import logger from '../../utils/logger';

export interface SimplyBookAuthConfig {
  companyLogin: string;
  apiKey: string;
  baseUrl?: string;
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
  companyLogin: string;
}

export class SimplyBookAuthError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'SimplyBookAuthError';
  }
}

/**
 * SimplyBook.me authentication service
 * Handles token generation and management with automatic refresh
 */
export class SimplyBookAuth {
  private config: SimplyBookAuthConfig;
  private httpClient: AxiosInstance;
  private currentToken?: AuthToken;
  private readonly TOKEN_BUFFER_MINUTES = 5; // Refresh token 5 minutes before expiry

  constructor(config: SimplyBookAuthConfig) {
    this.config = {
      baseUrl: 'https://user-api.simplybook.me',
      ...config,
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VenueBooking-API/1.0',
      },
    });

    // Add request/response interceptors for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug('SimplyBook auth request', {
          url: config.url,
          method: config.method,
        });
        return config;
      },
      (error) => {
        logger.error('SimplyBook auth request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug('SimplyBook auth response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('SimplyBook auth response error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get valid authentication token, refreshing if necessary
   */
  async getValidToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.currentToken!.token;
    }

    return this.refreshToken();
  }

  /**
   * Get authentication headers for API calls
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    
    return {
      'X-Company-Login': this.config.companyLogin,
      'X-Token': token,
    };
  }

  /**
   * Generate new authentication token
   */
  private async refreshToken(): Promise<string> {
    const startTime = Date.now();

    try {
      logger.info('Requesting new SimplyBook authentication token', {
        companyLogin: this.config.companyLogin,
      });

      // Prepare JSON-RPC 2.0 request
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'getToken',
        params: [this.config.companyLogin, this.config.apiKey],
        id: Date.now(),
      };

      const response = await this.httpClient.post('/login', rpcRequest);

      // Validate response
      if (!response.data || response.data.error) {
        throw new SimplyBookAuthError(
          `Authentication failed: ${response.data?.error?.message || 'Unknown error'}`,
          response.status,
          response.data
        );
      }

      const token = response.data.result;
      if (!token || typeof token !== 'string') {
        throw new SimplyBookAuthError(
          'Invalid token received from SimplyBook API',
          response.status,
          response.data
        );
      }

      // Calculate expiry time (tokens are valid for 1 hour)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      this.currentToken = {
        token,
        expiresAt,
        companyLogin: this.config.companyLogin,
      };

      logger.info('SimplyBook authentication token obtained successfully', {
        companyLogin: this.config.companyLogin,
        expiresAt: expiresAt.toISOString(),
        processingTime: Date.now() - startTime,
      });

      return token;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      if (error instanceof SimplyBookAuthError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        
        logger.error('SimplyBook authentication request failed', {
          error: message,
          statusCode,
          processingTime,
          companyLogin: this.config.companyLogin,
        });

        throw new SimplyBookAuthError(
          `Authentication request failed: ${message}`,
          statusCode,
          error.response?.data
        );
      }

      logger.error('Unexpected SimplyBook authentication error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        companyLogin: this.config.companyLogin,
      });

      throw new SimplyBookAuthError(
        `Unexpected authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if current token is valid and not expiring soon
   */
  private isTokenValid(): boolean {
    if (!this.currentToken) {
      return false;
    }

    const bufferTime = this.TOKEN_BUFFER_MINUTES * 60 * 1000;
    const expiryWithBuffer = new Date(this.currentToken.expiresAt.getTime() - bufferTime);
    
    return new Date() < expiryWithBuffer;
  }

  /**
   * Get current token info (for debugging)
   */
  getTokenInfo(): AuthToken | null {
    return this.currentToken ? { ...this.currentToken } : null;
  }

  /**
   * Force token refresh (for testing)
   */
  async forceRefresh(): Promise<string> {
    this.currentToken = undefined;
    return this.refreshToken();
  }

  /**
   * Clear current token (useful for logout or testing)
   */
  clearToken(): void {
    this.currentToken = undefined;
    logger.debug('SimplyBook authentication token cleared');
  }
}

// Export factory function for easy instantiation
export function createSimplyBookAuth(config: SimplyBookAuthConfig): SimplyBookAuth {
  return new SimplyBookAuth(config);
}