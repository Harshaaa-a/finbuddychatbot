/**
 * FinBuddy Backend JavaScript Integration Examples
 * 
 * This file contains comprehensive examples for integrating with the FinBuddy Backend
 * using vanilla JavaScript. Includes error handling, retry logic, and best practices.
 */

// Configuration
const FINBUDDY_CONFIG = {
  supabaseUrl: 'https://your-project-ref.supabase.co',
  supabaseAnonKey: 'your_anon_key',
  chatEndpoint: '/functions/v1/chat',
  newsEndpoint: '/functions/v1/fetchNews',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000 // 1 second
};

/**
 * Basic FinBuddy Client Class
 */
class FinBuddyClient {
  constructor(config = FINBUDDY_CONFIG) {
    this.config = { ...FINBUDDY_CONFIG, ...config };
    this.baseUrl = this.config.supabaseUrl;
  }

  /**
   * Send a message to FinBuddy and get AI response
   * @param {string} message - User message
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response object
   */
  async sendMessage(message, options = {}) {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Message is required and must be a non-empty string');
    }

    const requestOptions = {
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
      const response = await this._fetchWithRetry(
        `${this.baseUrl}${this.config.chatEndpoint}`,
        requestOptions,
        options.retries || this.config.maxRetries
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      return {
        success: true,
        message: data.message,
        timestamp: new Date().toISOString(),
        responseTime: response.headers.get('x-response-time') || null
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw error;
    }
  }

  /**
   * Trigger manual news fetch
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response object
   */
  async fetchNews(options = {}) {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.supabaseAnonKey}`,
        ...options.headers
      },
      signal: options.signal
    };

    try {
      const response = await this._fetchWithRetry(
        `${this.baseUrl}${this.config.newsEndpoint}`,
        requestOptions,
        options.retries || this.config.maxRetries
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: data.success,
        message: data.message,
        count: data.count || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw error;
    }
  }

  /**
   * Fetch with retry logic and timeout
   * @private
   */
  async _fetchWithRetry(url, options, retries) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add timeout to the request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          signal: options.signal || controller.signal
        });

        clearTimeout(timeoutId);
        return response;

      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.name === 'AbortError' || attempt === retries) {
          throw error;
        }

        // Wait before retrying
        await this._delay(this.config.retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError;
  }

  /**
   * Delay utility for retry logic
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Simple usage examples
 */

// Example 1: Basic usage
async function basicExample() {
  const finbuddy = new FinBuddyClient();

  try {
    const response = await finbuddy.sendMessage("What is SIP investment?");
    console.log('FinBuddy:', response.message);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: With error handling and loading states
async function advancedExample() {
  const finbuddy = new FinBuddyClient();
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  const responseDiv = document.getElementById('response');
  const loadingDiv = document.getElementById('loading');

  // Show loading state
  function showLoading() {
    loadingDiv.style.display = 'block';
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
  }

  // Hide loading state
  function hideLoading() {
    loadingDiv.style.display = 'none';
    sendButton.disabled = false;
    sendButton.textContent = 'Send';
  }

  // Display response
  function displayResponse(message, isError = false) {
    responseDiv.innerHTML = `
      <div class="${isError ? 'error' : 'success'}">
        ${isError ? '❌' : '🤖'} ${message}
      </div>
    `;
  }

  sendButton.addEventListener('click', async () => {
    const message = messageInput.value.trim();
    
    if (!message) {
      displayResponse('Please enter a message', true);
      return;
    }

    showLoading();

    try {
      const response = await finbuddy.sendMessage(message);
      displayResponse(response.message);
      messageInput.value = ''; // Clear input
    } catch (error) {
      displayResponse(`Error: ${error.message}`, true);
    } finally {
      hideLoading();
    }
  });
}

// Example 3: Chat interface with conversation history
class ChatInterface {
  constructor(containerId, config = {}) {
    this.container = document.getElementById(containerId);
    this.finbuddy = new FinBuddyClient(config);
    this.conversation = [];
    this.isTyping = false;
    
    this.init();
  }

  init() {
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

    this.messagesContainer = document.getElementById('chat-messages');
    this.input = document.getElementById('chat-input');
    this.sendButton = document.getElementById('chat-send');
    this.typingIndicator = document.getElementById('typing-indicator');

    this.setupEventListeners();
  }

  setupEventListeners() {
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

  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isTyping) return;

    // Add user message to conversation
    this.addMessage(message, 'user');
    this.input.value = '';
    this.sendButton.disabled = true;
    this.isTyping = true;
    this.showTypingIndicator();

    try {
      const response = await this.finbuddy.sendMessage(message);
      this.addMessage(response.message, 'assistant');
    } catch (error) {
      this.addMessage(`Sorry, I encountered an error: ${error.message}`, 'error');
    } finally {
      this.hideTypingIndicator();
      this.isTyping = false;
      this.input.focus();
    }
  }

  addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'user' ? '👤' : type === 'error' ? '❌' : '🤖';
    
    messageDiv.innerHTML = `
      <div class="message-header">
        <span class="message-icon">${icon}</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-content">${content}</div>
    `;

    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    // Store in conversation history
    this.conversation.push({
      content,
      type,
      timestamp: new Date().toISOString()
    });
  }

  showTypingIndicator() {
    this.typingIndicator.style.display = 'block';
  }

  hideTypingIndicator() {
    this.typingIndicator.style.display = 'none';
  }

  // Export conversation history
  exportConversation() {
    return JSON.stringify(this.conversation, null, 2);
  }

  // Clear conversation
  clearConversation() {
    this.conversation = [];
    this.messagesContainer.innerHTML = '';
  }
}

// Example 4: Batch processing multiple questions
async function batchProcessingExample() {
  const finbuddy = new FinBuddyClient();
  
  const questions = [
    "What is SIP investment?",
    "How does compound interest work?",
    "What are the best mutual funds for beginners?",
    "Explain the difference between equity and debt funds",
    "What are the tax implications of mutual fund investments?"
  ];

  console.log('Processing multiple questions...');

  const results = [];
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    console.log(`\n${i + 1}. ${question}`);
    
    try {
      const response = await finbuddy.sendMessage(question);
      console.log(`✅ Response: ${response.message.substring(0, 100)}...`);
      results.push({ question, response: response.message, success: true });
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      results.push({ question, error: error.message, success: false });
    }

    // Add delay between requests to be respectful
    if (i < questions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

// Example 5: Request cancellation
function cancellationExample() {
  const finbuddy = new FinBuddyClient();
  const controller = new AbortController();

  // Start a request
  const requestPromise = finbuddy.sendMessage(
    "Explain the entire Indian financial system in detail",
    { signal: controller.signal }
  );

  // Cancel after 5 seconds
  setTimeout(() => {
    controller.abort();
    console.log('Request cancelled');
  }, 5000);

  requestPromise
    .then(response => console.log('Response:', response.message))
    .catch(error => console.log('Error:', error.message));
}

// Example 6: Custom error handling with user-friendly messages
class FinBuddyWithFriendlyErrors extends FinBuddyClient {
  async sendMessage(message, options = {}) {
    try {
      return await super.sendMessage(message, options);
    } catch (error) {
      // Convert technical errors to user-friendly messages
      const friendlyError = this._getFriendlyErrorMessage(error);
      throw new Error(friendlyError);
    }
  }

  _getFriendlyErrorMessage(error) {
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

    // Return original error if no friendly message is available
    return error.message;
  }
}

// Example 7: Performance monitoring
class FinBuddyWithMetrics extends FinBuddyClient {
  constructor(config) {
    super(config);
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
  }

  async sendMessage(message, options = {}) {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      const response = await super.sendMessage(message, options);
      
      const responseTime = performance.now() - startTime;
      this.metrics.successfulRequests++;
      this.metrics.responseTimes.push(responseTime);
      this._updateAverageResponseTime();

      return {
        ...response,
        responseTime: Math.round(responseTime)
      };

    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    }
  }

  _updateAverageResponseTime() {
    const sum = this.metrics.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = Math.round(sum / this.metrics.responseTimes.length);
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: Math.round((this.metrics.successfulRequests / this.metrics.totalRequests) * 100)
    };
  }

  resetMetrics() {
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
 * Real-world Integration Examples
 */

// Example 8: Complete HTML page integration
function createCompleteHTMLExample() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FinBuddy Chat - AI Financial Assistant</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .chat-container {
            height: 500px;
            display: flex;
            flex-direction: column;
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        .message {
            margin-bottom: 15px;
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 80%;
            word-wrap: break-word;
        }
        .user-message {
            background: #007bff;
            color: white;
            margin-left: auto;
        }
        .bot-message {
            background: #f1f3f4;
            color: #333;
        }
        .error-message {
            background: #ffebee;
            color: #c62828;
            border-left: 4px solid #f44336;
        }
        .input-area {
            padding: 20px;
            border-top: 1px solid #eee;
            display: flex;
            gap: 10px;
        }
        .message-input {
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 24px;
            outline: none;
        }
        .send-button {
            padding: 12px 24px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 24px;
            cursor: pointer;
        }
        .send-button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .typing {
            padding: 12px 16px;
            color: #666;
            font-style: italic;
        }
        .error-banner {
            background: #ffebee;
            color: #c62828;
            padding: 10px 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 FinBuddy</h1>
            <p>Your AI Financial Assistant for Indian Markets</p>
        </div>
        
        <div id="error-banner" class="error-banner" style="display: none;"></div>
        
        <div class="chat-container">
            <div id="messages" class="messages">
                <div class="message bot-message">
                    <strong>FinBuddy:</strong> Hello! I'm here to help you with investing, personal finance, and current financial news in India. What would you like to know?
                </div>
            </div>
            
            <div id="typing" class="typing" style="display: none;">
                FinBuddy is typing...
            </div>
            
            <div class="input-area">
                <input 
                    type="text" 
                    id="messageInput" 
                    class="message-input" 
                    placeholder="Ask me about investing, SIP, mutual funds, or current market conditions..."
                    maxlength="1000"
                >
                <button id="sendButton" class="send-button">Send</button>
            </div>
        </div>
    </div>

    <script>
        // Initialize FinBuddy client
        const finbuddy = new FinBuddyWithFriendlyErrors({
            supabaseUrl: 'https://your-project-ref.supabase.co',
            supabaseAnonKey: 'your_anon_key'
        });

        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const typingIndicator = document.getElementById('typing');
        const errorBanner = document.getElementById('error-banner');

        let isTyping = false;

        function addMessage(content, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}-message\`;
            messageDiv.innerHTML = \`<strong>\${type === 'user' ? 'You' : 'FinBuddy'}:</strong> \${content}\`;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function showError(message) {
            errorBanner.textContent = message;
            errorBanner.style.display = 'block';
            setTimeout(() => {
                errorBanner.style.display = 'none';
            }, 5000);
        }

        function showTyping() {
            typingIndicator.style.display = 'block';
            isTyping = true;
            sendButton.disabled = true;
        }

        function hideTyping() {
            typingIndicator.style.display = 'none';
            isTyping = false;
            sendButton.disabled = false;
        }

        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message || isTyping) return;

            addMessage(message, 'user');
            messageInput.value = '';
            showTyping();

            try {
                const response = await finbuddy.sendMessage(message);
                addMessage(response.message, 'bot');
            } catch (error) {
                addMessage(error.message, 'error');
                showError('Failed to get response from FinBuddy. Please try again.');
            } finally {
                hideTyping();
                messageInput.focus();
            }
        }

        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !isTyping) {
                sendMessage();
            }
        });

        // Auto-focus input
        messageInput.focus();
    </script>
</body>
</html>`;
}

// Example 9: Progressive Web App (PWA) integration
function createPWAExample() {
  return {
    manifest: {
      "name": "FinBuddy - AI Financial Assistant",
      "short_name": "FinBuddy",
      "description": "Your AI-powered financial assistant for Indian markets",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#007bff",
      "icons": [
        {
          "src": "/icon-192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/icon-512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    },
    serviceWorker: `
// service-worker.js
const CACHE_NAME = 'finbuddy-v1';
const urlsToCache = [
  '/',
  '/styles.css',
  '/app.js',
  '/finbuddy-client.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});
`
  };
}

// Example 10: Error recovery strategies
class ErrorRecoveryClient extends FinBuddyClient {
  constructor(config) {
    super(config);
    this.offlineQueue = [];
    this.isOnline = navigator.onLine;
    this.setupOfflineHandling();
  }

  setupOfflineHandling() {
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
      return new Promise((resolve, reject) => {
        this.offlineQueue.push({ message, options, resolve, reject });
      });
    }

    try {
      return await super.sendMessage(message, options);
    } catch (error) {
      // If it's a network error, queue for retry when online
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return new Promise((resolve, reject) => {
          this.offlineQueue.push({ message, options, resolve, reject });
        });
      }
      throw error;
    }
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

      // Add delay between queued requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  getQueueLength() {
    return this.offlineQueue.length;
  }
}

// Usage examples for the browser console or Node.js

// Initialize and use the basic client
// const finbuddy = new FinBuddyClient();
// finbuddy.sendMessage("What is mutual fund?").then(console.log).catch(console.error);

// Initialize chat interface (requires HTML container)
// const chat = new ChatInterface('chat-container');

// Use client with friendly error messages
// const friendlyFinbuddy = new FinBuddyWithFriendlyErrors();

// Use client with performance metrics
// const metricsFinbuddy = new FinBuddyWithMetrics();

// Use client with offline support
// const offlineFinbuddy = new ErrorRecoveryClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FinBuddyClient,
    ChatInterface,
    FinBuddyWithFriendlyErrors,
    FinBuddyWithMetrics,
    ErrorRecoveryClient,
    createCompleteHTMLExample,
    createPWAExample
  };
}