# FinBuddy Error Handling Scenarios

This document provides comprehensive examples for handling different error scenarios when integrating with the FinBuddy Backend API.

## Common Error Scenarios

### 1. Network Connectivity Issues

#### Scenario: User loses internet connection

```javascript
class NetworkAwareFinBuddyClient extends FinBuddyClient {
  constructor(config) {
    super(config);
    this.isOnline = navigator.onLine;
    this.offlineQueue = [];
    this.setupNetworkListeners();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async sendMessage(message, options = {}) {
    if (!this.isOnline) {
      return this.queueForLater(message, options);
    }

    try {
      return await super.sendMessage(message, options);
    } catch (error) {
      if (this.isNetworkError(error)) {
        return this.queueForLater(message, options);
      }
      throw error;
    }
  }

  queueForLater(message, options) {
    return new Promise((resolve, reject) => {
      this.offlineQueue.push({ message, options, resolve, reject });
    });
  }

  async processOfflineQueue() {
    while (this.offlineQueue.length > 0 && this.isOnline) {
      const { message, options, resolve, reject } = this.offlineQueue.shift();
      
      try {
        const response = await super.sendMessage(message, options);
        resolve(response);
      } catch (error) {
        reject(error);
      }
      
      // Rate limit queued requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  isNetworkError(error) {
    return error.message.includes('network') || 
           error.message.includes('fetch') || 
           error.name === 'TypeError';
  }
}

// Usage example
const client = new NetworkAwareFinBuddyClient(config);

// This will work even when offline - messages are queued
client.sendMessage("What is SIP?")
  .then(response => console.log("Response:", response.message))
  .catch(error => console.error("Error:", error.message));
```

### 2. API Rate Limiting

#### Scenario: Too many requests in a short time

```javascript
class RateLimitHandlingClient extends FinBuddyClient {
  constructor(config) {
    super(config);
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minInterval = 1000; // Minimum 1 second between requests
  }

  async sendMessage(message, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ message, options, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const { message, options, resolve, reject } = this.requestQueue.shift();
      
      try {
        // Ensure minimum interval between requests
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.minInterval) {
          await new Promise(resolve => 
            setTimeout(resolve, this.minInterval - timeSinceLastRequest)
          );
        }

        const response = await super.sendMessage(message, options);
        this.lastRequestTime = Date.now();
        resolve(response);

      } catch (error) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          // Re-queue the request with exponential backoff
          const delay = Math.min(30000, 1000 * Math.pow(2, this.requestQueue.length));
          setTimeout(() => {
            this.requestQueue.unshift({ message, options, resolve, reject });
            this.processQueue();
          }, delay);
          break; // Stop processing queue temporarily
        } else {
          reject(error);
        }
      }
    }

    this.isProcessing = false;
  }
}

// Usage with rate limit handling
const client = new RateLimitHandlingClient(config);

// These requests will be automatically queued and rate-limited
Promise.all([
  client.sendMessage("What is SIP?"),
  client.sendMessage("How does compound interest work?"),
  client.sendMessage("What are mutual funds?")
]).then(responses => {
  responses.forEach((response, index) => {
    console.log(`Response ${index + 1}:`, response.message);
  });
});
```

### 3. Server Errors and Timeouts

#### Scenario: Backend service is temporarily unavailable

```javascript
class ResilientFinBuddyClient extends FinBuddyClient {
  constructor(config) {
    super(config);
    this.circuitBreaker = {
      failures: 0,
      threshold: 5,
      timeout: 60000, // 1 minute
      lastFailureTime: 0,
      state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    };
  }

  async sendMessage(message, options = {}) {
    // Check circuit breaker
    if (this.circuitBreaker.state === 'OPEN') {
      if (Date.now() - this.circuitBreaker.lastFailureTime > this.circuitBreaker.timeout) {
        this.circuitBreaker.state = 'HALF_OPEN';
      } else {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
    }

    try {
      const response = await this.sendWithRetry(message, options);
      
      // Reset circuit breaker on success
      if (this.circuitBreaker.state === 'HALF_OPEN') {
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failures = 0;
      }
      
      return response;
    } catch (error) {
      this.handleFailure(error);
      throw error;
    }
  }

  async sendWithRetry(message, options, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await super.sendMessage(message, {
          ...options,
          timeout: 10000 // 10 second timeout
        });
      } catch (error) {
        lastError = error;
        
        // Don't retry on validation errors
        if (this.isValidationError(error)) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  handleFailure(error) {
    if (this.isServerError(error)) {
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailureTime = Date.now();
      
      if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
        this.circuitBreaker.state = 'OPEN';
      }
    }
  }

  isValidationError(error) {
    return error.message.includes('required') || 
           error.message.includes('invalid') ||
           error.message.includes('400');
  }

  isServerError(error) {
    return error.message.includes('500') || 
           error.message.includes('502') || 
           error.message.includes('503') ||
           error.message.includes('timeout');
  }

  getCircuitBreakerState() {
    return { ...this.circuitBreaker };
  }
}
```

### 4. Authentication and Authorization Errors

#### Scenario: Invalid or expired API keys

```javascript
class AuthAwareFinBuddyClient extends FinBuddyClient {
  constructor(config) {
    super(config);
    this.authRetryCount = 0;
    this.maxAuthRetries = 1;
  }

  async sendMessage(message, options = {}) {
    try {
      return await super.sendMessage(message, options);
    } catch (error) {
      if (this.isAuthError(error) && this.authRetryCount < this.maxAuthRetries) {
        this.authRetryCount++;
        
        // Try to refresh credentials
        await this.refreshCredentials();
        
        // Retry the request
        return await super.sendMessage(message, options);
      }
      
      throw error;
    }
  }

  isAuthError(error) {
    return error.message.includes('401') || 
           error.message.includes('unauthorized') ||
           error.message.includes('authentication');
  }

  async refreshCredentials() {
    // In a real app, this might refresh tokens or re-authenticate
    console.warn('Authentication failed. Please check your API keys.');
    
    // You could implement token refresh logic here
    // For example, if using JWT tokens:
    // const newToken = await this.getNewToken();
    // this.config.supabaseAnonKey = newToken;
  }
}
```

### 5. Input Validation Errors

#### Scenario: Invalid user input

```javascript
class ValidatingFinBuddyClient extends FinBuddyClient {
  constructor(config) {
    super(config);
    this.validationRules = {
      minLength: 1,
      maxLength: 1000,
      allowedChars: /^[a-zA-Z0-9\s\.,\?!'-]+$/,
      blockedWords: ['spam', 'test123', 'admin']
    };
  }

  async sendMessage(message, options = {}) {
    const validationResult = this.validateMessage(message);
    
    if (!validationResult.isValid) {
      throw new Error(`Validation error: ${validationResult.error}`);
    }

    try {
      return await super.sendMessage(message, options);
    } catch (error) {
      // Provide user-friendly error messages
      throw new Error(this.getUserFriendlyError(error));
    }
  }

  validateMessage(message) {
    if (!message || typeof message !== 'string') {
      return { isValid: false, error: 'Message must be a non-empty string' };
    }

    const trimmed = message.trim();
    
    if (trimmed.length < this.validationRules.minLength) {
      return { isValid: false, error: 'Message is too short' };
    }
    
    if (trimmed.length > this.validationRules.maxLength) {
      return { isValid: false, error: `Message is too long (max ${this.validationRules.maxLength} characters)` };
    }
    
    if (!this.validationRules.allowedChars.test(trimmed)) {
      return { isValid: false, error: 'Message contains invalid characters' };
    }
    
    const lowerMessage = trimmed.toLowerCase();
    for (const blockedWord of this.validationRules.blockedWords) {
      if (lowerMessage.includes(blockedWord)) {
        return { isValid: false, error: 'Message contains inappropriate content' };
      }
    }
    
    return { isValid: true };
  }

  getUserFriendlyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connection')) {
      return 'Unable to connect to FinBuddy. Please check your internet connection.';
    }
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    if (message.includes('rate limit')) {
      return 'You\'re sending messages too quickly. Please wait a moment.';
    }
    
    if (message.includes('500') || message.includes('server')) {
      return 'FinBuddy is temporarily unavailable. Please try again in a few minutes.';
    }
    
    return 'Something went wrong. Please try again.';
  }
}
```

## UI Error Handling Patterns

### 1. Toast Notifications

```javascript
class ToastNotificationHandler {
  constructor() {
    this.createToastContainer();
  }

  createToastContainer() {
    if (document.getElementById('toast-container')) return;
    
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  showToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${this.getBackgroundColor(type)};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
      word-wrap: break-word;
    `;
    
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>${this.getIcon(type)}</span>
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; color: white; cursor: pointer; margin-left: auto;">×</button>
      </div>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  getBackgroundColor(type) {
    const colors = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3'
    };
    return colors[type] || colors.info;
  }

  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }
}

// Usage with FinBuddy client
class UIFinBuddyClient extends FinBuddyClient {
  constructor(config) {
    super(config);
    this.toastHandler = new ToastNotificationHandler();
  }

  async sendMessage(message, options = {}) {
    try {
      this.toastHandler.showToast('Sending message to FinBuddy...', 'info', 2000);
      
      const response = await super.sendMessage(message, options);
      
      this.toastHandler.showToast('Message sent successfully!', 'success', 3000);
      return response;
      
    } catch (error) {
      this.toastHandler.showToast(
        this.getUserFriendlyError(error), 
        'error', 
        5000
      );
      throw error;
    }
  }

  getUserFriendlyError(error) {
    // Same logic as ValidatingFinBuddyClient
    const message = error.message.toLowerCase();
    
    if (message.includes('network')) {
      return 'Connection failed. Check your internet.';
    }
    if (message.includes('timeout')) {
      return 'Request timed out. Try again.';
    }
    if (message.includes('rate limit')) {
      return 'Too many requests. Please wait.';
    }
    
    return 'Something went wrong. Please try again.';
  }
}
```

### 2. Modal Error Dialogs

```javascript
class ModalErrorHandler {
  showErrorModal(error, onRetry = null) {
    // Remove existing modal if any
    const existingModal = document.getElementById('error-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'error-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const errorType = this.categorizeError(error);
    const { title, message, actions } = this.getErrorContent(errorType, error);

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      ">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <span style="font-size: 24px;">${this.getErrorIcon(errorType)}</span>
          <h3 style="margin: 0; color: #333;">${title}</h3>
        </div>
        
        <p style="color: #666; line-height: 1.5; margin-bottom: 20px;">
          ${message}
        </p>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          ${actions.map(action => `
            <button onclick="${action.onclick}" style="
              padding: 8px 16px;
              border: ${action.primary ? 'none' : '1px solid #ddd'};
              background: ${action.primary ? '#007bff' : 'white'};
              color: ${action.primary ? 'white' : '#333'};
              border-radius: 6px;
              cursor: pointer;
            ">
              ${action.text}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('rate limit')) {
      return 'rateLimit';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('500') || message.includes('server')) {
      return 'server';
    }
    
    return 'unknown';
  }

  getErrorContent(errorType, error) {
    const contents = {
      network: {
        title: 'Connection Error',
        message: 'Unable to connect to FinBuddy. Please check your internet connection and try again.',
        actions: [
          { text: 'Cancel', onclick: 'document.getElementById("error-modal").remove()' },
          { text: 'Retry', onclick: 'this.handleRetry()', primary: true }
        ]
      },
      timeout: {
        title: 'Request Timeout',
        message: 'The request is taking longer than expected. This might be due to high server load.',
        actions: [
          { text: 'Cancel', onclick: 'document.getElementById("error-modal").remove()' },
          { text: 'Try Again', onclick: 'this.handleRetry()', primary: true }
        ]
      },
      rateLimit: {
        title: 'Too Many Requests',
        message: 'You\'re sending requests too quickly. Please wait a moment before trying again.',
        actions: [
          { text: 'OK', onclick: 'document.getElementById("error-modal").remove()', primary: true }
        ]
      },
      validation: {
        title: 'Invalid Input',
        message: error.message || 'Please check your input and try again.',
        actions: [
          { text: 'OK', onclick: 'document.getElementById("error-modal").remove()', primary: true }
        ]
      },
      server: {
        title: 'Service Unavailable',
        message: 'FinBuddy is temporarily unavailable. Please try again in a few minutes.',
        actions: [
          { text: 'Cancel', onclick: 'document.getElementById("error-modal").remove()' },
          { text: 'Try Again Later', onclick: 'this.handleRetryLater()', primary: true }
        ]
      },
      unknown: {
        title: 'Unexpected Error',
        message: 'Something went wrong. Please try again or contact support if the problem persists.',
        actions: [
          { text: 'Cancel', onclick: 'document.getElementById("error-modal").remove()' },
          { text: 'Retry', onclick: 'this.handleRetry()', primary: true }
        ]
      }
    };

    return contents[errorType] || contents.unknown;
  }

  getErrorIcon(errorType) {
    const icons = {
      network: '🌐',
      timeout: '⏱️',
      rateLimit: '🚦',
      validation: '⚠️',
      server: '🔧',
      unknown: '❌'
    };
    return icons[errorType] || icons.unknown;
  }
}
```

## Complete Error Handling Example

```javascript
// Complete implementation combining all error handling strategies
class ComprehensiveFinBuddyClient extends FinBuddyClient {
  constructor(config) {
    super(config);
    this.errorHandler = new ModalErrorHandler();
    this.toastHandler = new ToastNotificationHandler();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    // Global error handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.toastHandler.showToast(
        'An unexpected error occurred. Please try again.',
        'error'
      );
    });
  }

  async sendMessage(message, options = {}) {
    const showProgress = options.showProgress !== false;
    
    if (showProgress) {
      this.toastHandler.showToast('Sending message...', 'info', 2000);
    }

    try {
      const response = await super.sendMessage(message, options);
      
      if (showProgress) {
        this.toastHandler.showToast('Message sent successfully!', 'success');
      }
      
      return response;
      
    } catch (error) {
      console.error('FinBuddy error:', error);
      
      // Show appropriate error UI based on error type
      if (this.shouldShowModal(error)) {
        this.errorHandler.showErrorModal(error, () => {
          // Retry logic
          this.sendMessage(message, { ...options, showProgress: false });
        });
      } else {
        this.toastHandler.showToast(
          this.getUserFriendlyError(error),
          'error'
        );
      }
      
      throw error;
    }
  }

  shouldShowModal(error) {
    // Show modal for critical errors that need user attention
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('server') || 
           message.includes('timeout');
  }

  getUserFriendlyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network')) {
      return 'Connection failed. Please check your internet.';
    }
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (message.includes('rate limit')) {
      return 'Too many requests. Please wait a moment.';
    }
    if (message.includes('validation')) {
      return 'Please check your input and try again.';
    }
    if (message.includes('server')) {
      return 'Service temporarily unavailable.';
    }
    
    return 'Something went wrong. Please try again.';
  }
}

// Usage example
const client = new ComprehensiveFinBuddyClient({
  supabaseUrl: 'https://your-project-ref.supabase.co',
  supabaseAnonKey: 'your_anon_key'
});

// This will handle all error scenarios gracefully
client.sendMessage("What is the best investment strategy for beginners?")
  .then(response => {
    console.log("FinBuddy says:", response.message);
  })
  .catch(error => {
    // Error is already handled by the client
    console.log("Error was handled gracefully");
  });
```

This comprehensive error handling approach ensures that users always receive appropriate feedback and the application remains stable even when errors occur.