/**
 * FinBuddy Backend TypeScript Integration Examples
 * 
 * This file contains comprehensive TypeScript examples with proper typing,
 * error handling, and best practices for integrating with the FinBuddy Backend.
 */

// Type definitions
interface FinBuddyConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  chatEndpoint?: string;
  newsEndpoint?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

interface ChatResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  responseTime?: number | null;
}

interface NewsResponse {
  success: boolean;
  message: string;
  count?: number;
  timestamp?: string;
}

interface ErrorResponse {
  success: false;
  error: string;
}

interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  retries?: number;
}

interface ConversationMessage {
  content: string;
  type: 'user' | 'assistant' | 'error';
  timestamp: string;
}

interface ClientMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  responseTimes: number[];
  successRate?: number;
}

// Custom error classes
class FinBuddyError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'FinBuddyError';
  }
}

class NetworkError extends FinBuddyError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

class ValidationError extends FinBuddyError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

class TimeoutError extends FinBuddyError {
  constructor(message: string) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

// Default configuration
const DEFAULT_CONFIG: Required<Omit<FinBuddyConfig, 'supabaseUrl' | 'supabaseAnonKey'>> = {
  chatEndpoint: '/functions/v1/chat',
  newsEndpoint: '/functions/v1/fetchNews',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000
};

/**
 * Main FinBuddy Client Class with TypeScript support
 */
export class FinBuddyClient {
  private readonly config: Required<FinBuddyConfig>;
  private readonly baseUrl: string;

  constructor(config: FinBuddyConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseUrl = this.config.supabaseUrl;
    
    this.validateConfig();
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.supabaseUrl) {
      throw new ValidationError('supabaseUrl is required');
    }
    
    if (!this.config.supabaseAnonKey) {
      throw new ValidationError('supabaseAnonKey is required');
    }

    try {
      new URL(this.config.supabaseUrl);
    } catch {
      throw new ValidationError('supabaseUrl must be a valid URL');
    }
  }

  /**
   * Send a message to FinBuddy and get AI response
   */
  async sendMessage(message: string, options: RequestOptions = {}): Promise<ChatResponse> {
    this.validateMessage(message);

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.supabaseAnonKey}`,
        ...options.headers
      },
      body: JSON.stringify({ message: message.trim() }),
      signal: options.signal
    };

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}${this.config.chatEndpoint}`,
        requestOptions,
        options.retries ?? this.config.maxRetries
      );

      const data = await response.json() as ChatResponse | ErrorResponse;

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        throw new FinBuddyError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR',
          response.status
        );
      }

      if (!data.success) {
        const errorData = data as ErrorResponse;
        throw new FinBuddyError(errorData.error || 'Unknown error occurred', 'API_ERROR');
      }

      const successData = data as ChatResponse;
      return {
        success: true,
        message: successData.message,
        timestamp: new Date().toISOString(),
        responseTime: this.parseResponseTime(response.headers.get('x-response-time'))
      };

    } catch (error) {
      if (error instanceof FinBuddyError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError('Request was cancelled');
        }
        throw new NetworkError(`Network error: ${error.message}`);
      }
      
      throw new FinBuddyError('Unknown error occurred');
    }
  }

  /**
   * Trigger manual news fetch
   */
  async fetchNews(options: RequestOptions = {}): Promise<NewsResponse> {
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.supabaseAnonKey}`,
        ...options.headers
      },
      signal: options.signal
    };

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}${this.config.newsEndpoint}`,
        requestOptions,
        options.retries ?? this.config.maxRetries
      );

      const data = await response.json() as NewsResponse | ErrorResponse;

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        throw new FinBuddyError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR',
          response.status
        );
      }

      const successData = data as NewsResponse;
      return {
        success: successData.success,
        message: successData.message,
        count: successData.count || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      if (error instanceof FinBuddyError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError('Request was cancelled');
        }
        throw new NetworkError(`Network error: ${error.message}`);
      }
      
      throw new FinBuddyError('Unknown error occurred');
    }
  }

  /**
   * Validate message input
   */
  private validateMessage(message: string): void {
    if (typeof message !== 'string') {
      throw new ValidationError('Message must be a string');
    }
    
    if (!message || message.trim().length === 0) {
      throw new ValidationError('Message is required and cannot be empty');
    }

    if (message.length > 1000) {
      throw new ValidationError('Message is too long (max 1000 characters)');
    }
  }

  /**
   * Parse response time from headers
   */
  private parseResponseTime(responseTime: string | null): number | null {
    if (!responseTime) return null;
    const parsed = parseFloat(responseTime);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Fetch with retry logic and timeout
   */
  private async fetchWithRetry(
    url: string, 
    options: RequestInit, 
    retries: number
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          signal: options.signal || controller.signal
        });

        clearTimeout(timeoutId);
        return response;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain errors
        if (lastError.name === 'AbortError' || attempt === retries) {
          throw lastError;
        }

        // Wait before retrying with exponential backoff
        await this.delay(this.config.retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Enhanced client with metrics tracking
 */
export class FinBuddyClientWithMetrics extends FinBuddyClient {
  private metrics: ClientMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    responseTimes: []
  };

  async sendMessage(message: string, options: RequestOptions = {}): Promise<ChatResponse> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      const response = await super.sendMessage(message, options);
      
      const responseTime = performance.now() - startTime;
      this.metrics.successfulRequests++;
      this.metrics.responseTimes.push(responseTime);
      this.updateAverageResponseTime();

      return {
        ...response,
        responseTime: Math.round(responseTime)
      };

    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    }
  }

  private updateAverageResponseTime(): void {
    const sum = this.metrics.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = Math.round(sum / this.metrics.responseTimes.length);
  }

  getMetrics(): ClientMetrics & { successRate: number } {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 
        ? Math.round((this.metrics.successfulRequests / this.metrics.totalRequests) * 100)
        : 0
    };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
  }
}

/**
 * Chat interface class with TypeScript support
 */
export class TypedChatInterface {
  private finbuddy: FinBuddyClient;
  private conversation: ConversationMessage[] = [];
  private isTyping = false;
  private container: HTMLElement;
  private messagesContainer!: HTMLElement;
  private input!: HTMLInputElement;
  private sendButton!: HTMLButtonElement;
  private typingIndicator!: HTMLElement;

  constructor(containerId: string, config: FinBuddyConfig) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    
    this.container = container;
    this.finbuddy = new FinBuddyClient(config);
    this.init();
  }

  private init(): void {
    this.container.innerHTML = `
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input-container">
        <input type="text" id="chat-input" placeholder="Ask me about investing, finance, or current market conditions..." />
        <button id="chat-send" disabled>Send</button>
      </div>
      <div class="typing-indicator" id="typing-indicator" style="display: none;">
        FinBuddy is thinking...
      </div>
    `;

    this.messagesContainer = this.getElementById('chat-messages');
    this.input = this.getElementById('chat-input') as HTMLInputElement;
    this.sendButton = this.getElementById('chat-send') as HTMLButtonElement;
    this.typingIndicator = this.getElementById('typing-indicator');

    this.setupEventListeners();
  }

  private getElementById(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }
    return element;
  }

  private setupEventListeners(): void {
    this.input.addEventListener('input', () => {
      this.sendButton.disabled = !this.input.value.trim();
    });

    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !this.isTyping) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.sendButton.addEventListener('click', () => {
      if (!this.isTyping) {
        this.sendMessage();
      }
    });
  }

  async sendMessage(): Promise<void> {
    const message = this.input.value.trim();
    if (!message || this.isTyping) return;

    this.addMessage(message, 'user');
    this.input.value = '';
    this.sendButton.disabled = true;
    this.isTyping = true;
    this.showTypingIndicator();

    try {
      const response = await this.finbuddy.sendMessage(message);
      this.addMessage(response.message, 'assistant');
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred';
      this.addMessage(`Sorry, I encountered an error: ${errorMessage}`, 'error');
    } finally {
      this.hideTypingIndicator();
      this.isTyping = false;
      this.input.focus();
    }
  }

  private addMessage(content: string, type: ConversationMessage['type']): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'user' ? '👤' : type === 'error' ? '❌' : '🤖';
    
    messageDiv.innerHTML = `
      <div class="message-header">
        <span class="message-icon">${icon}</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-content">${this.escapeHtml(content)}</div>
    `;

    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    this.conversation.push({
      content,
      type,
      timestamp: new Date().toISOString()
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private showTypingIndicator(): void {
    this.typingIndicator.style.display = 'block';
  }

  private hideTypingIndicator(): void {
    this.typingIndicator.style.display = 'none';
  }

  getConversation(): ConversationMessage[] {
    return [...this.conversation];
  }

  exportConversation(): string {
    return JSON.stringify(this.conversation, null, 2);
  }

  clearConversation(): void {
    this.conversation = [];
    this.messagesContainer.innerHTML = '';
  }
}

/**
 * Utility functions for common use cases
 */
export class FinBuddyUtils {
  /**
   * Batch process multiple questions with rate limiting
   */
  static async batchProcess(
    client: FinBuddyClient,
    questions: string[],
    delayMs = 2000
  ): Promise<Array<{ question: string; response?: string; error?: string }>> {
    const results: Array<{ question: string; response?: string; error?: string }> = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      try {
        const response = await client.sendMessage(question);
        results.push({ question, response: response.message });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ question, error: errorMessage });
      }

      // Add delay between requests (except for the last one)
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Create a client with custom error handling
   */
  static createClientWithErrorHandler(
    config: FinBuddyConfig,
    errorHandler: (error: Error) => string
  ): FinBuddyClient {
    return new (class extends FinBuddyClient {
      async sendMessage(message: string, options: RequestOptions = {}): Promise<ChatResponse> {
        try {
          return await super.sendMessage(message, options);
        } catch (error) {
          const friendlyMessage = errorHandler(error instanceof Error ? error : new Error('Unknown error'));
          throw new FinBuddyError(friendlyMessage);
        }
      }
    })(config);
  }

  /**
   * Get user-friendly error messages
   */
  static getFriendlyErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'Unable to connect to FinBuddy. Please check your internet connection and try again.';
    }

    if (message.includes('timeout') || message.includes('aborted')) {
      return 'The request is taking longer than expected. Please try again with a shorter question.';
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return 'Too many requests. Please wait a moment before asking another question.';
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Authentication error. Please check your API configuration.';
    }

    if (message.includes('message is required')) {
      return 'Please enter a question or message.';
    }

    if (message.includes('server error') || message.includes('500')) {
      return 'FinBuddy is temporarily unavailable. Please try again in a few minutes.';
    }

    return error.message;
  }
}

/**
 * Example usage and demonstrations
 */

// Example 1: Basic usage with proper typing
export async function basicTypedExample(): Promise<void> {
  const config: FinBuddyConfig = {
    supabaseUrl: 'https://your-project-ref.supabase.co',
    supabaseAnonKey: 'your_anon_key'
  };

  const finbuddy = new FinBuddyClient(config);

  try {
    const response: ChatResponse = await finbuddy.sendMessage("What is SIP investment?");
    console.log('FinBuddy:', response.message);
    console.log('Response time:', response.responseTime, 'ms');
  } catch (error) {
    if (error instanceof FinBuddyError) {
      console.error('FinBuddy Error:', error.message, 'Code:', error.code);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Example 2: Using metrics client
export async function metricsExample(): Promise<void> {
  const config: FinBuddyConfig = {
    supabaseUrl: 'https://your-project-ref.supabase.co',
    supabaseAnonKey: 'your_anon_key'
  };

  const client = new FinBuddyClientWithMetrics(config);

  // Send multiple messages
  const questions = [
    "What is mutual fund?",
    "How does SIP work?",
    "What are equity funds?"
  ];

  for (const question of questions) {
    try {
      await client.sendMessage(question);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Get performance metrics
  const metrics = client.getMetrics();
  console.log('Performance Metrics:', metrics);
}

// Example 3: Batch processing with error handling
export async function batchProcessingExample(): Promise<void> {
  const config: FinBuddyConfig = {
    supabaseUrl: 'https://your-project-ref.supabase.co',
    supabaseAnonKey: 'your_anon_key'
  };

  const client = new FinBuddyClient(config);
  
  const questions = [
    "What is SIP investment?",
    "How does compound interest work?",
    "What are the best mutual funds for beginners?"
  ];

  const results = await FinBuddyUtils.batchProcess(client, questions);
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.question}`);
    if (result.response) {
      console.log(`✅ ${result.response.substring(0, 100)}...`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  });
}

// Example 4: Custom error handling
export function customErrorHandlingExample(): FinBuddyClient {
  const config: FinBuddyConfig = {
    supabaseUrl: 'https://your-project-ref.supabase.co',
    supabaseAnonKey: 'your_anon_key'
  };

  return FinBuddyUtils.createClientWithErrorHandler(
    config,
    FinBuddyUtils.getFriendlyErrorMessage
  );
}

// Export all classes and utilities
export {
  FinBuddyError,
  NetworkError,
  ValidationError,
  TimeoutError
};