import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import logger from '../../utils/logger';

export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface GeminiGenerateRequest {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GeminiGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface GeminiChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GeminiChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class GeminiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'GeminiError';
  }
}

export class GeminiConnectionError extends GeminiError {
  constructor(message: string) {
    super(message, 503);
    this.name = 'GeminiConnectionError';
  }
}

export class GeminiModelError extends GeminiError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'GeminiModelError';
  }
}

export class GeminiApiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: GeminiConfig;
  private chatSession?: ChatSession;

  constructor(config: GeminiConfig) {
    this.config = {
      temperature: 0.1,
      maxOutputTokens: 500,
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };

    try {
      this.genAI = new GoogleGenerativeAI(this.config.apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: this.config.model,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxOutputTokens,
        },
      });
    } catch (error) {
      logger.error('Failed to initialize Gemini client', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: this.config.model,
      });
      throw new GeminiConnectionError('Failed to initialize Gemini client');
    }
  }

  /**
   * Generate text using Gemini's generate endpoint
   */
  async generate(request: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
    const startTime = Date.now();

    try {
      logger.debug('Gemini API generate request', {
        model: this.config.model,
        prompt: request.prompt.substring(0, 100) + '...',
      });

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: request.temperature ?? this.config.temperature,
          maxOutputTokens: request.maxOutputTokens ?? this.config.maxOutputTokens,
        },
      });

      const response = await result.response;
      const text = response.text();
      const totalDuration = Date.now() - startTime;

      logger.debug('Gemini API generate response received', {
        model: this.config.model,
        duration: totalDuration,
        responseLength: text.length,
      });

      return {
        model: this.config.model,
        created_at: new Date().toISOString(),
        response: text,
        done: true,
        total_duration: totalDuration,
        prompt_eval_count: request.prompt.split(' ').length,
        eval_count: text.split(' ').length,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Gemini generate request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: this.config.model,
        prompt: request.prompt.substring(0, 100) + '...',
        duration,
      });

      throw this.handleApiError(error);
    }
  }

  /**
   * Chat using Gemini's chat endpoint (preferred for conversations)
   */
  async chat(request: GeminiChatRequest): Promise<GeminiChatResponse> {
    const startTime = Date.now();

    try {
      logger.debug('Gemini API chat request', {
        model: this.config.model,
        messages: request.messages.length,
      });

      // Convert messages to Gemini format
      const contents = this.convertMessages(request.messages);

      const result = await this.model.generateContent({
        contents,
        generationConfig: {
          temperature: request.temperature ?? this.config.temperature,
          maxOutputTokens: request.maxOutputTokens ?? this.config.maxOutputTokens,
        },
      });

      const response = await result.response;
      const text = response.text();
      const totalDuration = Date.now() - startTime;

      logger.debug('Gemini API chat response received', {
        model: this.config.model,
        duration: totalDuration,
        responseLength: text.length,
      });

      return {
        model: this.config.model,
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: text,
        },
        done: true,
        total_duration: totalDuration,
        prompt_eval_count: this.estimateTokenCount(request.messages),
        eval_count: text.split(' ').length,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Gemini chat request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: this.config.model,
        messages: request.messages.length,
        duration,
      });

      throw this.handleApiError(error);
    }
  }

  /**
   * Check if the model is available
   */
  async checkModel(): Promise<boolean> {
    try {
      // Test with a simple prompt to verify model availability
      const testResult = await this.model.generateContent('Hello');
      const response = await testResult.response;
      return !!response.text();
    } catch (error) {
      logger.error('Failed to check model availability', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: this.config.model,
      });
      return false;
    }
  }

  /**
   * Health check for Gemini service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    modelAvailable: boolean;
    details?: any;
  }> {
    const startTime = Date.now();

    try {
      // Check model availability with a simple test
      const modelAvailable = await this.checkModel();
      const responseTime = Date.now() - startTime;

      return {
        status: modelAvailable ? 'healthy' : 'unhealthy',
        responseTime,
        modelAvailable,
        details: {
          model: this.config.model,
          service: 'Google Gemini API',
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
          service: 'Google Gemini API',
        },
      };
    }
  }

  /**
   * Convert chat messages to Gemini format
   */
  private convertMessages(messages: Array<{ role: string; content: string }>) {
    const contents: any[] = [];
    
    for (const message of messages) {
      if (message.role === 'system') {
        // Gemini doesn't have a separate system role, so we prepend it to the first user message
        // or create a user message with system instructions
        contents.push({
          role: 'user',
          parts: [{ text: `[SYSTEM INSTRUCTIONS]\n${message.content}\n\n[USER REQUEST]` }]
        });
      } else if (message.role === 'user') {
        // If there's a pending system message, combine it
        const lastContent = contents[contents.length - 1];
        if (lastContent && lastContent.parts[0].text.includes('[USER REQUEST]')) {
          lastContent.parts[0].text = lastContent.parts[0].text.replace('[USER REQUEST]', `[USER REQUEST]\n${message.content}`);
        } else {
          contents.push({
            role: 'user',
            parts: [{ text: message.content }]
          });
        }
      } else if (message.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: message.content }]
        });
      }
    }

    return contents;
  }

  /**
   * Estimate token count for messages
   */
  private estimateTokenCount(messages: Array<{ role: string; content: string }>): number {
    return messages.reduce((total, message) => {
      return total + message.content.split(' ').length;
    }, 0);
  }

  /**
   * Handle API errors and convert them to appropriate error types
   */
  private handleApiError(error: any): GeminiError {
    if (error.message?.includes('API key')) {
      return new GeminiConnectionError('Invalid or missing Gemini API key');
    }

    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return new GeminiError('Gemini API quota exceeded or rate limited', 429);
    }

    if (error.message?.includes('model')) {
      return new GeminiModelError(`Gemini model ${this.config.model} not available`);
    }

    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return new GeminiConnectionError('Cannot connect to Gemini service');
    }

    return new GeminiError(
      error.message || 'Unknown Gemini error',
      error.status || 500
    );
  }

  /**
   * Get current configuration
   */
  getConfig(): GeminiConfig {
    return { ...this.config };
  }
}