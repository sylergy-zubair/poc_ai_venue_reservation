import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../../utils/logger';

export interface OllamaConfig {
  apiUrl: string;
  model: string;
  timeout?: number;
  maxRetries?: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
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
    num_predict?: number;
    top_p?: number;
    top_k?: number;
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

export class OllamaError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'OllamaError';
  }
}

export class OllamaConnectionError extends OllamaError {
  constructor(message: string) {
    super(message, 503);
    this.name = 'OllamaConnectionError';
  }
}

export class OllamaModelError extends OllamaError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'OllamaModelError';
  }
}

export class OllamaApiClient {
  private client: AxiosInstance;
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Ollama API request', {
          url: config.url,
          method: config.method,
          model: this.config.model,
        });
        return config;
      },
      (error) => {
        logger.error('Ollama API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Ollama API response received', {
          status: response.status,
          model: this.config.model,
          duration: response.headers['x-response-time'],
        });
        return response;
      },
      (error) => {
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Generate text using Ollama's generate endpoint
   */
  async generate(request: Omit<OllamaGenerateRequest, 'model'>): Promise<OllamaGenerateResponse> {
    try {
      const response: AxiosResponse<OllamaGenerateResponse> = await this.client.post('/api/generate', {
        model: this.config.model,
        stream: false,
        ...request,
      });

      return response.data;
    } catch (error) {
      logger.error('Ollama generate request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: this.config.model,
        prompt: request.prompt?.substring(0, 100) + '...',
      });
      throw error;
    }
  }

  /**
   * Chat using Ollama's chat endpoint (preferred for conversations)
   */
  async chat(request: Omit<OllamaChatRequest, 'model'>): Promise<OllamaChatResponse> {
    try {
      const response: AxiosResponse<OllamaChatResponse> = await this.client.post('/api/chat', {
        model: this.config.model,
        stream: false,
        ...request,
      });

      return response.data;
    } catch (error) {
      logger.error('Ollama chat request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: this.config.model,
        messages: request.messages?.length || 0,
      });
      throw error;
    }
  }

  /**
   * Check if the model is available
   */
  async checkModel(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      return models.some((model: any) => model.name === this.config.model);
    } catch (error) {
      logger.error('Failed to check model availability', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: this.config.model,
      });
      return false;
    }
  }

  /**
   * Pull/download a model
   */
  async pullModel(): Promise<void> {
    try {
      logger.info('Pulling Ollama model', { model: this.config.model });
      
      await this.client.post('/api/pull', {
        name: this.config.model,
      });

      logger.info('Model pulled successfully', { model: this.config.model });
    } catch (error) {
      logger.error('Failed to pull model', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: this.config.model,
      });
      throw new OllamaModelError(`Failed to pull model ${this.config.model}`);
    }
  }

  /**
   * Health check for Ollama service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    modelAvailable: boolean;
    details?: any;
  }> {
    const startTime = Date.now();

    try {
      // Check basic connectivity
      await this.client.get('/api/health');
      
      // Check model availability
      const modelAvailable = await this.checkModel();
      
      const responseTime = Date.now() - startTime;

      return {
        status: modelAvailable ? 'healthy' : 'unhealthy',
        responseTime,
        modelAvailable,
        details: {
          model: this.config.model,
          apiUrl: this.config.apiUrl,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        modelAvailable: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          model: this.config.model,
          apiUrl: this.config.apiUrl,
        },
      };
    }
  }

  /**
   * Handle API errors and convert them to appropriate error types
   */
  private handleApiError(error: any): OllamaError {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new OllamaConnectionError('Cannot connect to Ollama service');
    }

    if (error.response?.status === 404) {
      return new OllamaModelError(`Model ${this.config.model} not found`);
    }

    if (error.response?.status >= 500) {
      return new OllamaError('Ollama service error', error.response.status);
    }

    if (error.response?.status === 400) {
      return new OllamaError(
        error.response.data?.error || 'Invalid request to Ollama',
        400
      );
    }

    return new OllamaError(
      error.message || 'Unknown Ollama error',
      error.response?.status
    );
  }

  /**
   * Get current configuration
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
  }
}