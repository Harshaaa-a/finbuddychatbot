# FinBuddy Backend Integration Guide

This comprehensive guide provides detailed examples for integrating the FinBuddy Backend into various frontend applications, with extensive error handling and best practices.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Basic Integration Patterns](#basic-integration-patterns)
4. [Error Handling Strategies](#error-handling-strategies)
5. [Framework-Specific Examples](#framework-specific-examples)
6. [Production Considerations](#production-considerations)
7. [Testing and Debugging](#testing-and-debugging)
8. [Performance Optimization](#performance-optimization)

## Quick Start

### 1. Environment Setup

Create a `.env` file in your project root:

```env
# For React/Create React App
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

# For Vite
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# For Next.js
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Basic Client Setup

```javascript
import { FinBuddyClient } from './finbuddy-client.js';

const client = new FinBuddyClient({
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
  supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY
});

// Send a message
try {
  const response = await client.sendMessage("What is SIP investment?");
  console.log(response.message);
} catch (error) {
  console.error('Error:', error.message);
}
```

## Basic Integration Patterns

### Pattern 1: Simple Chat Interface

```html
<!DOCTYPE html>
<html>
<head>
    <title>FinBuddy Chat</title>
    <style>
        .chat-container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .messages { height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; }
        .message { margin: 10px 0; padding: 8px; border-radius: 8px; }
        .user { background: #e3f2fd; text-align: right; }
        .bot { background: #f1f8e9; }
        .error { background: #ffebee; color: #c62828; }
        .input-area { display: flex; gap: 10px; margin-top: 10px; }
        .input-area input { flex: 1; padding: 10px; }
        .input-area button { padding: 10px 20px; }
    </style>
</head>
<body>
    <div class="chat-container">
        <div id="messages" class="messages"></div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Ask about investing..." />
            <button onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script>
        const client = new FinBuddyClient({
            supabaseUrl: 'https://your-project-ref.supabase.co',
            supabaseAnonKey: 'your_anon_key'
        });

        function addMessage(content, type) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            messageDiv.textContent = content;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message) return;
            
            addMessage(message, 'user');
            input.value = '';
            
            try {
                const response = await client.sendMessage(message);
                addMessage(response.message, 'bot');
            } catch (error) {
                addMessage(`Error: ${error.message}`, 'error');
            }
        }

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    </script>
</body>
</html>
```

### Pattern 2: React Hook Integration

```jsx
import { useState, useCallback } from 'react';
import { FinBuddyClient } from './finbuddy-client';

const useFinBuddy = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const client = new FinBuddyClient({
    supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
    supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY
  });

  const sendMessage = useCallback(async (message) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.sendMessage(message);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendMessage, loading, error };
};

// Usage in component
function ChatComponent() {
  const { sendMessage, loading, error } = useFinBuddy();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { content: input, type: 'user', id: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      const response = await sendMessage(input);
      const botMessage = { content: response.message, type: 'bot', id: Date.now() + 1 };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = { content: `Error: ${error.message}`, type: 'error', id: Date.now() + 1 };
      setMessages(prev => [...prev, errorMessage]);
    }
    
    setInput('');
  };

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.type}`}>
            {msg.content}
          </div>
        ))}
      </div>
      {error && <div className="error">Error: {error}</div>}
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

## Error Handling Strategies

### Strategy 1: Graceful Degradation

```javascript
class GracefulFinBuddyClient extends FinBuddyClient {
  constructor(config, fallbackResponses = {}) {
    super(config);
    this.fallbackResponses = {
      'sip': 'SIP (Systematic Investment Plan) is a method of investing in mutual funds where you invest a fixed amount regularly.',
      'mutual fund': 'Mutual funds are investment vehicles that pool money from many investors to purchase securities.',
      'compound interest': 'Compound interest is interest calculated on the initial principal and accumulated interest.',
      ...fallbackResponses
    };
  }

  async sendMessage(message, options = {}) {
    try {
      return await super.sendMessage(message, options);
    } catch (error) {
      // If it's a network error, try to provide a fallback response
      if (this.isNetworkError(error)) {
        const fallback = this.getFallbackResponse(message);
        if (fallback) {
          return {
            success: true,
            message: `${fallback} (Note: This is a cached response as I'm currently offline)`,
            timestamp: new Date().toISOString(),
            isFallback: true
          };
        }
      }
      throw error;
    }
  }

  isNetworkError(error) {
    return error.message.includes('network') || 
           error.message.includes('fetch') || 
           error.message.includes('connection');
  }

  getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    for (const [keyword, response] of Object.entries(this.fallbackResponses)) {
      if (lowerMessage.includes(keyword)) {
        return response;
      }
    }
    return null;
  }
}
```

### Strategy 2: Retry with Exponential Backoff

```javascript
class RetryFinBuddyClient extends FinBuddyClient {
  async sendMessageWithRetry(message, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.sendMessage(message);
      } catch (error) {
        lastError = error;
        
        // Don't retry on validation errors
        if (error.message.includes('required') || error.message.includes('invalid')) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}
```

### Strategy 3: Circuit Breaker Pattern

```javascript
class CircuitBreakerFinBuddyClient extends FinBuddyClient {
  constructor(config, options = {}) {
    super(config);
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async sendMessage(message, options = {}) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Service temporarily unavailable (circuit breaker open)');
      }
    }

    try {
      const response = await super.sendMessage(message, options);
      
      // Reset on success
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      
      return response;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
      }
      
      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}
```

## Framework-Specific Examples

### Vue.js Composition API

```vue
<template>
  <div class="finbuddy-chat">
    <div class="messages">
      <div v-for="msg in messages" :key="msg.id" :class="['message', msg.type]">
        {{ msg.content }}
      </div>
    </div>
    <div v-if="loading" class="loading">FinBuddy is thinking...</div>
    <div v-if="error" class="error">{{ error }}</div>
    <div class="input-area">
      <input 
        v-model="input" 
        @keyup.enter="sendMessage"
        :disabled="loading"
        placeholder="Ask about investing..."
      />
      <button @click="sendMessage" :disabled="loading || !input.trim()">
        Send
      </button>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import { FinBuddyClient } from './finbuddy-client';

export default {
  setup() {
    const messages = ref([]);
    const input = ref('');
    const loading = ref(false);
    const error = ref(null);
    
    const client = new FinBuddyClient({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    });

    const sendMessage = async () => {
      if (!input.value.trim() || loading.value) return;
      
      const userMessage = {
        id: Date.now(),
        content: input.value,
        type: 'user'
      };
      
      messages.value.push(userMessage);
      const messageText = input.value;
      input.value = '';
      loading.value = true;
      error.value = null;
      
      try {
        const response = await client.sendMessage(messageText);
        messages.value.push({
          id: Date.now() + 1,
          content: response.message,
          type: 'bot'
        });
      } catch (err) {
        error.value = err.message;
        messages.value.push({
          id: Date.now() + 1,
          content: `Error: ${err.message}`,
          type: 'error'
        });
      } finally {
        loading.value = false;
      }
    };

    return {
      messages,
      input,
      loading,
      error,
      sendMessage
    };
  }
};
</script>
```

### Angular Service

```typescript
// finbuddy.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { FinBuddyClient } from './finbuddy-client';

export interface Message {
  id: number;
  content: string;
  type: 'user' | 'bot' | 'error';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FinBuddyService {
  private client: FinBuddyClient;
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public messages$ = this.messagesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor() {
    this.client = new FinBuddyClient({
      supabaseUrl: environment.supabaseUrl,
      supabaseAnonKey: environment.supabaseAnonKey
    });
  }

  async sendMessage(content: string): Promise<void> {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      content,
      type: 'user',
      timestamp: new Date()
    };

    this.addMessage(userMessage);
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const response = await this.client.sendMessage(content);
      
      const botMessage: Message = {
        id: Date.now() + 1,
        content: response.message,
        type: 'bot',
        timestamp: new Date()
      };
      
      this.addMessage(botMessage);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        content: `Error: ${error.message}`,
        type: 'error',
        timestamp: new Date()
      };
      
      this.addMessage(errorMessage);
      this.errorSubject.next(error.message);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  private addMessage(message: Message): void {
    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, message]);
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
    this.errorSubject.next(null);
  }
}
```

## Production Considerations

### 1. Rate Limiting

```javascript
class RateLimitedFinBuddyClient extends FinBuddyClient {
  constructor(config, rateLimit = { requests: 10, window: 60000 }) {
    super(config);
    this.rateLimit = rateLimit;
    this.requests = [];
  }

  async sendMessage(message, options = {}) {
    // Check rate limit
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.rateLimit.window);
    
    if (this.requests.length >= this.rateLimit.requests) {
      throw new Error('Rate limit exceeded. Please wait before sending another message.');
    }
    
    this.requests.push(now);
    return await super.sendMessage(message, options);
  }

  getRemainingRequests() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.rateLimit.window);
    return Math.max(0, this.rateLimit.requests - this.requests.length);
  }
}
```

### 2. Request Deduplication

```javascript
class DeduplicatedFinBuddyClient extends FinBuddyClient {
  constructor(config) {
    super(config);
    this.pendingRequests = new Map();
  }

  async sendMessage(message, options = {}) {
    const messageKey = message.trim().toLowerCase();
    
    // If the same message is already being processed, return the existing promise
    if (this.pendingRequests.has(messageKey)) {
      return await this.pendingRequests.get(messageKey);
    }
    
    // Create new request
    const requestPromise = super.sendMessage(message, options)
      .finally(() => {
        // Clean up after request completes
        this.pendingRequests.delete(messageKey);
      });
    
    this.pendingRequests.set(messageKey, requestPromise);
    return await requestPromise;
  }
}
```

### 3. Caching Responses

```javascript
class CachedFinBuddyClient extends FinBuddyClient {
  constructor(config, cacheOptions = { ttl: 300000, maxSize: 100 }) {
    super(config);
    this.cache = new Map();
    this.cacheOptions = cacheOptions;
  }

  async sendMessage(message, options = {}) {
    const cacheKey = message.trim().toLowerCase();
    const cached = this.cache.get(cacheKey);
    
    // Return cached response if valid
    if (cached && Date.now() - cached.timestamp < this.cacheOptions.ttl) {
      return {
        ...cached.response,
        fromCache: true
      };
    }
    
    // Get fresh response
    const response = await super.sendMessage(message, options);
    
    // Cache the response
    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    // Cleanup old cache entries
    if (this.cache.size > this.cacheOptions.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    return response;
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cacheOptions.maxSize,
      ttl: this.cacheOptions.ttl
    };
  }
}
```

## Testing and Debugging

### Unit Testing Example (Jest)

```javascript
// finbuddy-client.test.js
import { FinBuddyClient } from './finbuddy-client';

// Mock fetch
global.fetch = jest.fn();

describe('FinBuddyClient', () => {
  let client;

  beforeEach(() => {
    client = new FinBuddyClient({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-key'
    });
    fetch.mockClear();
  });

  test('should send message successfully', async () => {
    const mockResponse = {
      success: true,
      message: 'Test response'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      headers: new Map()
    });

    const result = await client.sendMessage('Test message');
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Test response');
    expect(fetch).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key'
        }),
        body: JSON.stringify({ message: 'Test message' })
      })
    );
  });

  test('should handle validation errors', async () => {
    await expect(client.sendMessage('')).rejects.toThrow('Message is required');
    await expect(client.sendMessage(null)).rejects.toThrow('Message is required');
  });

  test('should handle API errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request' })
    });

    await expect(client.sendMessage('Test')).rejects.toThrow('Bad request');
  });
});
```

### Integration Testing

```javascript
// integration.test.js
describe('FinBuddy Integration Tests', () => {
  let client;

  beforeAll(() => {
    client = new FinBuddyClient({
      supabaseUrl: process.env.TEST_SUPABASE_URL,
      supabaseAnonKey: process.env.TEST_SUPABASE_ANON_KEY
    });
  });

  test('should handle real API calls', async () => {
    const response = await client.sendMessage('What is SIP?');
    
    expect(response.success).toBe(true);
    expect(response.message).toBeTruthy();
    expect(typeof response.message).toBe('string');
  }, 30000); // 30 second timeout for real API calls

  test('should handle news fetching', async () => {
    const response = await client.fetchNews();
    
    expect(response.success).toBeTruthy();
    expect(typeof response.count).toBe('number');
  }, 30000);
});
```

## Performance Optimization

### 1. Request Batching

```javascript
class BatchedFinBuddyClient extends FinBuddyClient {
  constructor(config, batchOptions = { size: 5, delay: 1000 }) {
    super(config);
    this.batchOptions = batchOptions;
    this.batch = [];
    this.batchTimer = null;
  }

  async sendMessage(message, options = {}) {
    return new Promise((resolve, reject) => {
      this.batch.push({ message, options, resolve, reject });
      
      if (this.batch.length >= this.batchOptions.size) {
        this.processBatch();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.batchOptions.delay);
      }
    });
  }

  async processBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const currentBatch = this.batch.splice(0);
    
    // Process each request in the batch
    for (const { message, options, resolve, reject } of currentBatch) {
      try {
        const response = await super.sendMessage(message, options);
        resolve(response);
      } catch (error) {
        reject(error);
      }
      
      // Add small delay between requests in batch
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

### 2. Connection Pooling

```javascript
class PooledFinBuddyClient extends FinBuddyClient {
  constructor(config, poolSize = 3) {
    super(config);
    this.poolSize = poolSize;
    this.activeRequests = 0;
    this.requestQueue = [];
  }

  async sendMessage(message, options = {}) {
    return new Promise((resolve, reject) => {
      const request = { message, options, resolve, reject };
      
      if (this.activeRequests < this.poolSize) {
        this.processRequest(request);
      } else {
        this.requestQueue.push(request);
      }
    });
  }

  async processRequest({ message, options, resolve, reject }) {
    this.activeRequests++;
    
    try {
      const response = await super.sendMessage(message, options);
      resolve(response);
    } catch (error) {
      reject(error);
    } finally {
      this.activeRequests--;
      
      // Process next request in queue
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        this.processRequest(nextRequest);
      }
    }
  }

  getPoolStats() {
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      poolSize: this.poolSize
    };
  }
}
```

This integration guide provides comprehensive examples for implementing FinBuddy in various scenarios with robust error handling and production-ready patterns.