/**
 * FinBuddy Backend Error Handling Examples
 * 
 * This file demonstrates comprehensive error handling patterns for different
 * scenarios when integrating with the FinBuddy Backend API.
 */

// Configuration
const FINBUDDY_CONFIG = {
  supabaseUrl: 'https://your-project-ref.supabase.co',
  supabaseAnonKey: 'your_anon_key',
  chatEndpoint: '/functions/v1/chat',
  newsEndpoint: '/functions/v1/fetchNews'
};

/**
 * Custom Error Classes for Better Error Handling
 */
class FinBuddyError extends Error {
  constructor(message, code, statusCode, originalError) {
    super(message);
    this.name = 'FinBuddyError';
    this.code = code;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

class NetworkError extends FinBuddyError {
  constructor(message, originalError) {
    super(message, 'NETWORK_ERROR', null, originalError);
    this.name = 'NetworkError';
  }
}

class ValidationError extends FinBuddyError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

class APIError extends FinBuddyError {
  constructor(message, statusCode, originalError) {
    super(message, 'API_ERROR', statusCode, originalError);
    this.name = 'APIError';
  }
}

class TimeoutError extends FinBuddyError {
  constructor(message) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

class RateLimitError extends FinBuddyError {
  constructor(message, retryAfter) {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Error Handler Utility Class
 */
class ErrorHandler {
  static categorizeError(error) {
    if (error instanceof FinBuddyError) {
      return error;
    }

    const message = error.message?.toLowerCase() || '';

    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection') || error.name === 'TypeError') {
      return new NetworkError('Network connection failed. Please check your internet connection.', error);
    }

    // Timeout errors
    if (message.includes('timeout') || error.name === 'AbortError') {
      return new TimeoutError('Request timed out. Please try again.');
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429')) {
      return new RateLimitError('Too many requests. Please wait before trying again.');
    }

    // Validation errors
    if (message.includes('required') || message.includes('invalid') || 
        message.includes('missing')) {
      return new ValidationError(error.message || 'Invalid request data.');
    }

    // Server errors
    if (message.includes('500') || message.includes('server error')) {
      return new APIError('Server error. Please try again later.', 500, error);
    }

    // Authentication errors
    if (message.includes('401') || message.includes('unauthorized')) {
      return new APIError('Authentication failed. Please check your API keys.', 401, error);
    }

    // Generic API error
    return new APIError(error.message || 'An unexpected error occurred.', null, error);
  }

  static getUserFriendlyMessage(error) {
    const categorizedError = this.categorizeError(error);

    switch (categorizedError.name) {
      case 'NetworkError':
        return 'Unable to connect to FinBuddy. Please check your internet connection and try again.';
      
      case 'TimeoutError':
        return 'The request is taking longer than expected. Please try again.';
      
      case 'RateLimitError':
        return 'You\'re sending requests too quickly. Please wait a moment before trying again.';
      
      case 'ValidationError':
        return 'Please check your input and try again.';
      
      case 'APIError':
        if (categorizedError.statusCode === 401) {
          return 'Authentication error. Please refresh the page and try again.';
        }
        if (categorizedError.statusCode === 500) {
          return 'FinBuddy is temporarily unavailable. Please try again in a few minutes.';
        }
        return 'Something went wrong. Please try again.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  static shouldRetry(error) {
    const categorizedError = this.categorizeError(error);
    
    // Retry on network errors and server errors, but not on validation or auth errors
    return categorizedError.name === 'NetworkError' || 
           categorizedError.name === 'TimeoutError' ||
           (categorizedError.name === 'APIError' && categorizedError.statusCode >= 500);
  }

  static getRetryDelay(attempt, error) {
    const categorizedError = this.categorizeError(error);
    
    if (categorizedError.name === 'RateLimitError' && categorizedError.retryAfter) {
      return categorizedError.retryAfter * 1000; // Convert to milliseconds
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  }
}

/**
 * Enhanced FinBuddy Client with Comprehensive Error Handling
 */
class RobustFinBuddyClient {
  constructor(config = FINBUDDY_CONFIG) {
    this.config = config;
    this.baseUrl = config.supabaseUrl;
    this.maxRetries = 3;
    this.timeout = 30000;
  }

  async sendMessage(message, options = {}) {
    // Input validation
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new ValidationError('Message is required and must be a non-empty string');
    }

    if (message.length > 1000) {
      throw new ValidationError('Message is too long (maximum 1000 characters)');
    }

    const maxRetries = options.maxRetries ?? this.maxRetries;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this._makeRequest(
          `${this.baseUrl}${this.config.chatEndpoint}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.config.supabaseAnonKey}`,
              ...options.headers
            },
            body: JSON.stringify({ message: message.trim() })
          },
          options.signal
        );

        const data = await response.json();

        if (!response.ok) {
          throw new APIError(
            data.error || `HTTP ${response.status}: ${response.statusText}`,
            response.status
          );
        }

        if (!data.success) {
          throw new APIError(data.error || 'Unknown API error');
        }

        return {
          success: true,
          message: data.message,
          timestamp: new Date().toISOString(),
          attempt: attempt + 1
        };

      } catch (error) {
        lastError = ErrorHandler.categorizeError(error);
        
        // Don't retry on certain errors or if it's the last attempt
        if (!ErrorHandler.shouldRetry(lastError) || attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retrying
        const delay = ErrorHandler.getRetryDelay(attempt, lastError);
        await this._delay(delay);
      }
    }

    throw lastError;
  }

  async fetchNews(options = {}) {
    const maxRetries = options.maxRetries ?? this.maxRetries;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this._makeRequest(
          `${this.baseUrl}${this.config.newsEndpoint}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.supabaseAnonKey}`,
              ...options.headers
            }
          },
          options.signal
        );

        const data = await response.json();

        if (!response.ok) {
          throw new APIError(
            data.error || `HTTP ${response.status}: ${response.statusText}`,
            response.status
          );
        }

        return {
          success: data.success,
          message: data.message,
          count: data.count || 0,
          timestamp: new Date().toISOString(),
          attempt: attempt + 1
        };

      } catch (error) {
        lastError = ErrorHandler.categorizeError(error);
        
        if (!ErrorHandler.shouldRetry(lastError) || attempt === maxRetries) {
          throw lastError;
        }

        const delay = ErrorHandler.getRetryDelay(attempt, lastError);
        await this._delay(delay);
      }
    }

    throw lastError;
  }

  async _makeRequest(url, options, signal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: signal || controller.signal
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error Handling Examples and Patterns
 */

// Example 1: Basic error handling with user-friendly messages
async function basicErrorHandlingExample() {
  const client = new RobustFinBuddyClient();

  try {
    const response = await client.sendMessage("What is SIP investment?");
    console.log('Success:', response.message);
  } catch (error) {
    const friendlyMessage = ErrorHandler.getUserFriendlyMessage(error);
    console.error('User-friendly error:', friendlyMessage);
    console.error('Technical error:', error);
  }
}

// Example 2: Error handling with retry logic
async function retryErrorHandlingExample() {
  const client = new RobustFinBuddyClient();

  try {
    const response = await client.sendMessage("How does compound interest work?", {
      maxRetries: 5 // Override default retry count
    });
    console.log('Success after retries:', response);
  } catch (error) {
    console.error('Failed after all retries:', ErrorHandler.getUserFriendlyMessage(error));
  }
}

// Example 3: Error handling with cancellation
async function cancellationErrorHandlingExample() {
  const client = new RobustFinBuddyClient();
  const controller = new AbortController();

  // Cancel request after 5 seconds
  setTimeout(() => {
    controller.abort();
    console.log('Request cancelled by user');
  }, 5000);

  try {
    const response = await client.sendMessage(
      "Explain the entire Indian financial system in detail",
      { signal: controller.signal }
    );
    console.log('Response:', response.message);
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.log('Request was cancelled or timed out');
    } else {
      console.error('Other error:', ErrorHandler.getUserFriendlyMessage(error));
    }
  }
}

// Example 4: Error handling in a UI context
class UIErrorHandler {
  constructor(notificationSystem) {
    this.notifications = notificationSystem;
    this.client = new RobustFinBuddyClient();
  }

  async sendMessageWithUI(message, onSuccess, onError) {
    try {
      this.notifications.showLoading('Sending message to FinBuddy...');
      
      const response = await this.client.sendMessage(message);
      
      this.notifications.hideLoading();
      this.notifications.showSuccess('Message sent successfully!');
      
      if (onSuccess) onSuccess(response);
      
    } catch (error) {
      this.notifications.hideLoading();
      
      const friendlyMessage = ErrorHandler.getUserFriendlyMessage(error);
      this.notifications.showError(friendlyMessage);
      
      // Log technical details for debugging
      console.error('Technical error details:', {
        name: error.name,
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
        timestamp: error.timestamp
      });
      
      if (onError) onError(error, friendlyMessage);
    }
  }
}

// Example 5: Error handling with fallback strategies
class FallbackFinBuddyClient extends RobustFinBuddyClient {
  constructor(config, fallbackResponses = {}) {
    super(config);
    this.fallbackResponses = fallbackResponses;
  }

  async sendMessage(message, options = {}) {
    try {
      return await super.sendMessage(message, options);
    } catch (error) {
      // If it's a network error and we have fallback responses, use them
      if (error instanceof NetworkError && this.fallbackResponses) {
        const fallbackResponse = this.getFallbackResponse(message);
        if (fallbackResponse) {
          return {
            success: true,
            message: fallbackResponse,
            timestamp: new Date().toISOString(),
            isFallback: true
          };
        }
      }
      
      throw error;
    }
  }

  getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Simple keyword matching for fallback responses
    for (const [keyword, response] of Object.entries(this.fallbackResponses)) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return response;
      }
    }
    
    return null;
  }
}

// Example 6: Error monitoring and analytics
class MonitoredFinBuddyClient extends RobustFinBuddyClient {
  constructor(config, analytics) {
    super(config);
    this.analytics = analytics;
    this.errorCounts = new Map();
  }

  async sendMessage(message, options = {}) {
    const startTime = Date.now();
    
    try {
      const response = await super.sendMessage(message, options);
      
      // Track successful requests
      this.analytics.track('finbuddy_message_success', {
        responseTime: Date.now() - startTime,
        messageLength: message.length,
        attempt: response.attempt
      });
      
      return response;
      
    } catch (error) {
      // Track errors
      const errorType = error.name || 'UnknownError';
      this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);
      
      this.analytics.track('finbuddy_message_error', {
        errorType,
        errorCode: error.code,
        statusCode: error.statusCode,
        messageLength: message.length,
        responseTime: Date.now() - startTime
      });
      
      throw error;
    }
  }

  getErrorStats() {
    return Object.fromEntries(this.errorCounts);
  }
}

// Example 7: Error handling patterns for different scenarios
const ErrorHandlingPatterns = {
  // Pattern 1: Graceful degradation
  async gracefulDegradation(client, message) {
    try {
      return await client.sendMessage(message);
    } catch (error) {
      if (error instanceof NetworkError) {
        return {
          success: false,
          message: "I'm currently offline, but here are some general financial tips: Always diversify your investments, start investing early, and never invest money you can't afford to lose.",
          isOffline: true
        };
      }
      throw error;
    }
  },

  // Pattern 2: Circuit breaker
  createCircuitBreaker(client, failureThreshold = 5, resetTimeout = 60000) {
    let failures = 0;
    let lastFailureTime = 0;
    let isOpen = false;

    return async function(message, options = {}) {
      // If circuit is open, check if we should try again
      if (isOpen) {
        if (Date.now() - lastFailureTime > resetTimeout) {
          isOpen = false;
          failures = 0;
        } else {
          throw new Error('Service temporarily unavailable (circuit breaker open)');
        }
      }

      try {
        const response = await client.sendMessage(message, options);
        failures = 0; // Reset on success
        return response;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= failureThreshold) {
          isOpen = true;
        }
        
        throw error;
      }
    };
  },

  // Pattern 3: Bulkhead isolation
  async bulkheadPattern(client, message, priority = 'normal') {
    const queues = {
      high: [],
      normal: [],
      low: []
    };

    // Add request to appropriate queue based on priority
    return new Promise((resolve, reject) => {
      queues[priority].push({ message, resolve, reject });
      this.processQueue(client, queues);
    });
  },

  async processQueue(client, queues) {
    // Process high priority first, then normal, then low
    for (const priority of ['high', 'normal', 'low']) {
      while (queues[priority].length > 0) {
        const { message, resolve, reject } = queues[priority].shift();
        
        try {
          const response = await client.sendMessage(message);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      }
    }
  }
};

// Example usage of error handling patterns
async function demonstrateErrorHandling() {
  const client = new RobustFinBuddyClient();

  console.log('=== Error Handling Examples ===\n');

  // Test different error scenarios
  const testCases = [
    { message: "", description: "Empty message (validation error)" },
    { message: "What is SIP?", description: "Valid message" },
    { message: "x".repeat(1001), description: "Too long message (validation error)" }
  ];

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.description}`);
    
    try {
      const response = await client.sendMessage(testCase.message);
      console.log(`✅ Success: ${response.message.substring(0, 50)}...`);
    } catch (error) {
      console.log(`❌ Error: ${ErrorHandler.getUserFriendlyMessage(error)}`);
      console.log(`   Technical: ${error.name} - ${error.message}`);
    }
    
    console.log('');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FinBuddyError,
    NetworkError,
    ValidationError,
    APIError,
    TimeoutError,
    RateLimitError,
    ErrorHandler,
    RobustFinBuddyClient,
    UIErrorHandler,
    FallbackFinBuddyClient,
    MonitoredFinBuddyClient,
    ErrorHandlingPatterns
  };
}

// Example of how to use in a real application
/*
// Initialize client with error handling
const client = new RobustFinBuddyClient({
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
  supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY
});

// Use with proper error handling
async function handleUserMessage(message) {
  try {
    const response = await client.sendMessage(message);
    displayResponse(response.message);
  } catch (error) {
    const friendlyMessage = ErrorHandler.getUserFriendlyMessage(error);
    displayError(friendlyMessage);
    
    // Log for debugging
    console.error('FinBuddy Error:', {
      type: error.name,
      code: error.code,
      message: error.message,
      timestamp: error.timestamp
    });
  }
}
*/