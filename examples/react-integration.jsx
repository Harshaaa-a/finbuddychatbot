/**
 * FinBuddy Backend React Integration Examples
 * 
 * This file contains comprehensive React examples for integrating with the FinBuddy Backend,
 * including hooks, components, error handling, and best practices.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuration
const FINBUDDY_CONFIG = {
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL || 'https://your-project-ref.supabase.co',
  supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY || 'your_anon_key'
};

// Initialize Supabase client
const supabase = createClient(FINBUDDY_CONFIG.supabaseUrl, FINBUDDY_CONFIG.supabaseAnonKey);

/**
 * Custom hook for FinBuddy chat functionality
 */
export const useFinBuddy = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState([]);
  const abortControllerRef = useRef(null);

  const sendMessage = useCallback(async (message) => {
    if (!message?.trim()) {
      setError('Message is required');
      return null;
    }

    setLoading(true);
    setError(null);

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('chat', {
        body: { message: message.trim() },
        signal: abortControllerRef.current.signal
      });

      if (supabaseError) {
        throw new Error(supabaseError.message || 'Failed to send message');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error occurred');
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
        return null; // Request was cancelled
      }
      
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      
      // Add error message to conversation
      const errorMsg = {
        id: Date.now(),
        content: `Error: ${errorMessage}`,
        type: 'error',
        timestamp: new Date().toISOString()
      };
      
      setConversation(prev => [...prev, errorMsg]);
      return null;

    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const clearConversation = useCallback(() => {
    setConversation([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
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
};

/**
 * Simple chat input component
 */
export const ChatInput = ({ onSendMessage, loading, disabled }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !loading && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      <div className="input-container">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me about investing, finance, or current market conditions..."
          disabled={loading || disabled}
          rows={1}
          className="message-input"
        />
        <button
          type="submit"
          disabled={!message.trim() || loading || disabled}
          className="send-button"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
};

/**
 * Message component for displaying individual messages
 */
export const Message = ({ message }) => {
  const { content, type, timestamp } = message;
  
  const getIcon = () => {
    switch (type) {
      case 'user': return '👤';
      case 'assistant': return '🤖';
      case 'error': return '❌';
      default: return '💬';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`message message-${type}`}>
      <div className="message-header">
        <span className="message-icon">{getIcon()}</span>
        <span className="message-time">{formatTime(timestamp)}</span>
      </div>
      <div className="message-content">
        {content}
      </div>
    </div>
  );
};

/**
 * Complete chat interface component
 */
export const FinBuddyChat = ({ className = '', onError }) => {
  const { sendMessage, clearConversation, cancelRequest, loading, error, conversation } = useFinBuddy();
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

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
            <Message key={msg.id} message={msg} />
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

      <ChatInput
        onSendMessage={sendMessage}
        loading={loading}
        disabled={!!error}
      />
    </div>
  );
};

/**
 * Hook for news fetching functionality
 */
export const useFinBuddyNews = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('fetchNews');

      if (supabaseError) {
        throw new Error(supabaseError.message || 'Failed to fetch news');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error occurred');
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
  }, []);

  return {
    fetchNews,
    loading,
    error,
    lastFetch
  };
};

/**
 * News management component
 */
export const NewsManager = () => {
  const { fetchNews, loading, error, lastFetch } = useFinBuddyNews();
  const [autoFetch, setAutoFetch] = useState(false);

  // Auto-fetch news every 6 hours if enabled
  useEffect(() => {
    if (!autoFetch) return;

    const interval = setInterval(() => {
      fetchNews().catch(console.error);
    }, 6 * 60 * 60 * 1000); // 6 hours

    return () => clearInterval(interval);
  }, [autoFetch, fetchNews]);

  const handleManualFetch = async () => {
    try {
      await fetchNews();
    } catch (err) {
      console.error('Manual news fetch failed:', err);
    }
  };

  return (
    <div className="news-manager">
      <h4>News Management</h4>
      
      <div className="news-controls">
        <button
          onClick={handleManualFetch}
          disabled={loading}
          className="fetch-button"
        >
          {loading ? 'Fetching...' : 'Fetch Latest News'}
        </button>
        
        <label className="auto-fetch-toggle">
          <input
            type="checkbox"
            checked={autoFetch}
            onChange={(e) => setAutoFetch(e.target.checked)}
          />
          Auto-fetch every 6 hours
        </label>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {lastFetch && (
        <div className="last-fetch-info">
          <h5>Last Fetch:</h5>
          <p>Time: {new Date(lastFetch.timestamp).toLocaleString()}</p>
          <p>Articles: {lastFetch.count}</p>
          <p>Status: {lastFetch.message}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Advanced chat component with features
 */
export const AdvancedFinBuddyChat = () => {
  const [showNews, setShowNews] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [exportFormat, setExportFormat] = useState('json');

  const handleError = (error) => {
    console.error('FinBuddy Error:', error);
    // You could show a toast notification here
  };

  const exportConversation = (conversation) => {
    const data = conversation.map(msg => ({
      content: msg.content,
      type: msg.type,
      timestamp: msg.timestamp
    }));

    let content, filename, mimeType;

    if (exportFormat === 'json') {
      content = JSON.stringify(data, null, 2);
      filename = 'finbuddy-conversation.json';
      mimeType = 'application/json';
    } else {
      content = data.map(msg => 
        `[${new Date(msg.timestamp).toLocaleString()}] ${msg.type.toUpperCase()}: ${msg.content}`
      ).join('\n\n');
      filename = 'finbuddy-conversation.txt';
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="advanced-finbuddy-chat">
      <div className="chat-sidebar">
        <div className="sidebar-section">
          <h4>Settings</h4>
          <label>
            <input
              type="checkbox"
              checked={showNews}
              onChange={(e) => setShowNews(e.target.checked)}
            />
            Show News Manager
          </label>
        </div>

        <div className="sidebar-section">
          <h4>Export</h4>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            <option value="json">JSON</option>
            <option value="txt">Text</option>
          </select>
        </div>

        {showNews && <NewsManager />}
      </div>

      <div className="chat-main">
        <FinBuddyChat
          className="main-chat"
          onError={handleError}
        />
      </div>
    </div>
  );
};

/**
 * Example usage component
 */
export const FinBuddyExample = () => {
  const [activeTab, setActiveTab] = useState('simple');

  return (
    <div className="finbuddy-example">
      <div className="tab-navigation">
        <button
          className={activeTab === 'simple' ? 'active' : ''}
          onClick={() => setActiveTab('simple')}
        >
          Simple Chat
        </button>
        <button
          className={activeTab === 'advanced' ? 'active' : ''}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced Chat
        </button>
        <button
          className={activeTab === 'hook' ? 'active' : ''}
          onClick={() => setActiveTab('hook')}
        >
          Custom Hook
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'simple' && <FinBuddyChat />}
        {activeTab === 'advanced' && <AdvancedFinBuddyChat />}
        {activeTab === 'hook' && <CustomHookExample />}
      </div>
    </div>
  );
};

/**
 * Example of using the hook directly
 */
const CustomHookExample = () => {
  const { sendMessage, loading, error, conversation } = useFinBuddy();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (input.trim()) {
      await sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="custom-hook-example">
      <h3>Custom Hook Usage Example</h3>
      
      <div className="conversation-display">
        {conversation.map((msg) => (
          <div key={msg.id} className={`msg-${msg.type}`}>
            <strong>{msg.type}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {error && <div className="error">Error: {error}</div>}

      <div className="input-section">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your message..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

// CSS styles (you can move this to a separate CSS file)
export const finbuddyStyles = `
.finbuddy-chat {
  display: flex;
  flex-direction: column;
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
}

.chat-header h3 {
  margin: 0;
  color: #333;
}

.chat-actions {
  display: flex;
  gap: 0.5rem;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #fff;
}

.message {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
}

.message-user {
  background: #e3f2fd;
  margin-left: 2rem;
}

.message-assistant {
  background: #f1f8e9;
  margin-right: 2rem;
}

.message-error {
  background: #ffebee;
  border-left: 4px solid #f44336;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.message-content {
  line-height: 1.5;
  white-space: pre-wrap;
}

.welcome-message {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.example-questions ul {
  text-align: left;
  display: inline-block;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: #666;
  font-style: italic;
}

.typing-dots {
  display: flex;
  gap: 0.25rem;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: #666;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.chat-input-form {
  border-top: 1px solid #ddd;
  padding: 1rem;
  background: #f8f9fa;
}

.input-container {
  display: flex;
  gap: 0.5rem;
}

.message-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  min-height: 40px;
  max-height: 120px;
}

.send-button {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #ffebee;
  border-top: 1px solid #ddd;
  color: #d32f2f;
}

.advanced-finbuddy-chat {
  display: flex;
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.chat-sidebar {
  width: 250px;
  background: #f8f9fa;
  border-right: 1px solid #ddd;
  padding: 1rem;
  overflow-y: auto;
}

.sidebar-section {
  margin-bottom: 1.5rem;
}

.sidebar-section h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.chat-main {
  flex: 1;
}

.main-chat {
  height: 100%;
  border: none;
  border-radius: 0;
}
`;

export default FinBuddyChat;