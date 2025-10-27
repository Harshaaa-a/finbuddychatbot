/**
 * FinBuddy Backend Next.js Integration Examples
 * 
 * This file contains comprehensive Next.js examples for integrating with the FinBuddy Backend,
 * including API routes, client-side integration, SSR considerations, and best practices.
 */

// ===== API ROUTES =====

/**
 * API Route: /api/finbuddy/chat
 * Server-side proxy for FinBuddy chat endpoint
 */
// pages/api/finbuddy/chat.js or app/api/finbuddy/chat/route.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` // Use service key on server
      },
      body: JSON.stringify({ message: message.trim() })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    res.status(200).json(data);

  } catch (error) {
    console.error('FinBuddy API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get response from FinBuddy',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * API Route: /api/finbuddy/news
 * Server-side proxy for news fetching
 */
// pages/api/finbuddy/news.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/fetchNews`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    res.status(200).json(data);

  } catch (error) {
    console.error('News fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch news',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// ===== APP ROUTER API ROUTES (Next.js 13+) =====

/**
 * App Router API Route: app/api/finbuddy/chat/route.js
 */
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ message: message.trim() })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('FinBuddy API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get response from FinBuddy',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ===== CLIENT-SIDE HOOKS =====

/**
 * Custom hook for FinBuddy integration
 */
// hooks/useFinBuddy.js

import { useState, useCallback, useRef, useEffect } from 'react';

export function useFinBuddy(options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState([]);
  const abortControllerRef = useRef(null);

  const { 
    apiEndpoint = '/api/finbuddy/chat',
    maxRetries = 3,
    retryDelay = 1000 
  } = options;

  const sendMessage = useCallback(async (message) => {
    if (!message?.trim()) {
      setError('Message is required');
      return null;
    }

    setLoading(true);
    setError(null);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: message.trim() }),
          signal: abortControllerRef.current.signal
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }

        // Add messages to conversation
        const userMessage = {
          id: Date.now(),
          content: message,
          type: 'user',
          timestamp: new Date().toISOString()
        };

        const assistantMessage = {
          id: Date.now() + 1,
          content: data.message,
          type: 'assistant',
          timestamp: new Date().toISOString()
        };

        setConversation(prev => [...prev, userMessage, assistantMessage]);
        return data.message;

      } catch (err) {
        if (err.name === 'AbortError') {
          return null;
        }

        attempt++;
        if (attempt <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }

        const errorMessage = err.message || 'An unexpected error occurred';
        setError(errorMessage);

        const errorMsg = {
          id: Date.now(),
          content: `Error: ${errorMessage}`,
          type: 'error',
          timestamp: new Date().toISOString()
        };

        setConversation(prev => [...prev, errorMsg]);
        return null;
      } finally {
        if (attempt > maxRetries) {
          setLoading(false);
          abortControllerRef.current = null;
        }
      }
    }
  }, [apiEndpoint, maxRetries, retryDelay]);

  const clearConversation = useCallback(() => {
    setConversation([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    sendMessage,
    clearConversation,
    cancelRequest,
    loading,
    error,
    conversation
  };
}

/**
 * Hook for news fetching
 */
// hooks/useFinBuddyNews.js

export function useFinBuddyNews(options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const { apiEndpoint = '/api/finbuddy/news' } = options;

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setLastFetch({
        timestamp: new Date().toISOString(),
        count: data.count || 0,
        message: data.message
      });

      return data;

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch news';
      setError(errorMessage);
      throw new Error(errorMessage);

    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  return {
    fetchNews,
    loading,
    error,
    lastFetch
  };
}

// ===== COMPONENTS =====

/**
 * FinBuddy Chat Component for Next.js
 */
// components/FinBuddyChat.jsx

import { useFinBuddy } from '../hooks/useFinBuddy';
import { useState, useRef, useEffect } from 'react';

export default function FinBuddyChat({ className = '', onError }) {
  const { sendMessage, clearConversation, cancelRequest, loading, error, conversation } = useFinBuddy();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      await sendMessage(input);
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`finbuddy-chat ${className}`}>
      <div className="chat-header">
        <h3>FinBuddy - Your AI Financial Assistant</h3>
        <div className="chat-actions">
          {loading && (
            <button onClick={cancelRequest} className="cancel-button">
              Cancel
            </button>
          )}
          <button onClick={clearConversation} className="clear-button">
            Clear Chat
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {conversation.length === 0 ? (
          <div className="welcome-message">
            <h4>Welcome to FinBuddy! 👋</h4>
            <p>I'm here to help you learn about investing, personal finance, and current financial news in India.</p>
            <div className="example-questions">
              <p>Try asking me:</p>
              <ul>
                <li>"What is SIP investment?"</li>
                <li>"How does compound interest work?"</li>
                <li>"What are the best investment options for beginners?"</li>
                <li>"What's the current state of the Indian stock market?"</li>
              </ul>
            </div>
          </div>
        ) : (
          conversation.map((msg) => (
            <div key={msg.id} className={`message message-${msg.type}`}>
              <div className="message-header">
                <span className="message-icon">
                  {msg.type === 'user' ? '👤' : msg.type === 'error' ? '❌' : '🤖'}
                </span>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="message-content">{msg.content}</div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>FinBuddy is thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about investing, finance, or current market conditions..."
            disabled={loading}
            rows={1}
            className="message-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="send-button"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ===== PAGES =====

/**
 * Chat Page Component
 */
// pages/chat.js or app/chat/page.js

import Head from 'next/head';
import FinBuddyChat from '../components/FinBuddyChat';
import { useState } from 'react';

export default function ChatPage() {
  const [notifications, setNotifications] = useState([]);

  const handleError = (error) => {
    setNotifications(prev => [...prev, {
      id: Date.now(),
      type: 'error',
      message: error,
      timestamp: new Date().toISOString()
    }]);

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== Date.now()));
    }, 5000);
  };

  return (
    <>
      <Head>
        <title>FinBuddy Chat - AI Financial Assistant</title>
        <meta name="description" content="Chat with FinBuddy, your AI financial assistant for investing and personal finance advice in India." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="chat-page">
        <div className="container">
          <header className="page-header">
            <h1>FinBuddy Chat</h1>
            <p>Your AI-powered financial assistant for Indian markets</p>
          </header>

          <FinBuddyChat onError={handleError} />

          {/* Notifications */}
          <div className="notifications">
            {notifications.map(notification => (
              <div key={notification.id} className={`notification notification-${notification.type}`}>
                {notification.message}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

/**
 * Server-Side Rendering Example
 */
// pages/ssr-example.js

export async function getServerSideProps(context) {
  // You could pre-fetch some data here if needed
  // For example, fetch initial news or system status
  
  try {
    // Example: Check if FinBuddy service is available
    const healthCheck = await fetch(`${process.env.SUPABASE_URL}/functions/v1/fetchNews`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });

    const serviceStatus = healthCheck.ok ? 'online' : 'offline';

    return {
      props: {
        serviceStatus,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      props: {
        serviceStatus: 'offline',
        timestamp: new Date().toISOString()
      }
    };
  }
}

export default function SSRExample({ serviceStatus, timestamp }) {
  return (
    <div>
      <h1>FinBuddy Service Status</h1>
      <p>Status: {serviceStatus}</p>
      <p>Last checked: {new Date(timestamp).toLocaleString()}</p>
      
      {serviceStatus === 'online' ? (
        <FinBuddyChat />
      ) : (
        <div className="service-offline">
          <p>FinBuddy is currently offline. Please try again later.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Static Generation Example
 */
// pages/static-example.js

export async function getStaticProps() {
  // Generate static content at build time
  return {
    props: {
      buildTime: new Date().toISOString(),
      features: [
        'AI-powered financial advice',
        'Real-time market news integration',
        'Indian market focus',
        'Free to use'
      ]
    },
    revalidate: 3600 // Revalidate every hour
  };
}

export default function StaticExample({ buildTime, features }) {
  return (
    <div>
      <h1>FinBuddy Features</h1>
      <p>Built at: {new Date(buildTime).toLocaleString()}</p>
      
      <ul>
        {features.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>

      <FinBuddyChat />
    </div>
  );
}

// ===== MIDDLEWARE =====

/**
 * Middleware for rate limiting and security
 */
// middleware.js

import { NextResponse } from 'next/server';

const rateLimitMap = new Map();

export function middleware(request) {
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/finbuddy/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 10; // 10 requests per minute

    const requestLog = rateLimitMap.get(ip) || [];
    const recentRequests = requestLog.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    recentRequests.push(now);
    rateLimitMap.set(ip, recentRequests);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/finbuddy/:path*'
};

// ===== ENVIRONMENT CONFIGURATION =====

/**
 * Environment variables configuration
 */
// .env.local

/*
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Optional: Analytics
GOOGLE_ANALYTICS_ID=your_ga_id
*/

/**
 * Next.js Configuration
 */
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables to expose to the browser
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/api/finbuddy/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://yourdomain.com' 
              : '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'POST, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/chat-old',
        destination: '/chat',
        permanent: true
      }
    ];
  }
};

module.exports = nextConfig;

// ===== TESTING =====

/**
 * Jest test example
 */
// __tests__/api/finbuddy/chat.test.js

import handler from '../../../pages/api/finbuddy/chat';
import { createMocks } from 'node-mocks-http';

describe('/api/finbuddy/chat', () => {
  it('should return error for missing message', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {}
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Message is required'
    });
  });

  it('should return error for non-POST method', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    });
  });
});

// ===== DEPLOYMENT =====

/**
 * Vercel deployment configuration
 */
// vercel.json

/*
{
  "functions": {
    "pages/api/finbuddy/chat.js": {
      "maxDuration": 30
    },
    "pages/api/finbuddy/news.js": {
      "maxDuration": 30
    }
  },
  "env": {
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_SERVICE_KEY": "@supabase-service-key"
  }
}
*/

export {
  useFinBuddy,
  useFinBuddyNews,
  FinBuddyChat
};