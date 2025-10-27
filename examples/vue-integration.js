/**
 * FinBuddy Backend Vue.js Integration Examples
 * 
 * This file contains comprehensive Vue.js examples using Composition API
 * for integrating with the FinBuddy Backend API.
 */

import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { createClient } from '@supabase/supabase-js';

// Configuration
const FINBUDDY_CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://your-project-ref.supabase.co',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'your_anon_key'
};

// Initialize Supabase client
const supabase = createClient(FINBUDDY_CONFIG.supabaseUrl, FINBUDDY_CONFIG.supabaseAnonKey);

/**
 * Composable for FinBuddy chat functionality
 */
export function useFinBuddy() {
  const loading = ref(false);
  const error = ref(null);
  const conversation = ref([]);
  const abortController = ref(null);

  const sendMessage = async (message) => {
    if (!message?.trim()) {
      error.value = 'Message is required';
      return null;
    }

    loading.value = true;
    error.value = null;

    // Cancel previous request if still pending
    if (abortController.value) {
      abortController.value.abort();
    }

    // Create new abort controller
    abortController.value = new AbortController();

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('chat', {
        body: { message: message.trim() },
        signal: abortController.value.signal
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

      conversation.value.push(userMessage, assistantMessage);
      return data.message;

    } catch (err) {
      if (err.name === 'AbortError') {
        return null; // Request was cancelled
      }
      
      const errorMessage = err.message || 'An unexpected error occurred';
      error.value = errorMessage;
      
      // Add error message to conversation
      const errorMsg = {
        id: Date.now(),
        content: `Error: ${errorMessage}`,
        type: 'error',
        timestamp: new Date().toISOString()
      };
      
      conversation.value.push(errorMsg);
      return null;

    } finally {
      loading.value = false;
      abortController.value = null;
    }
  };

  const clearConversation = () => {
    conversation.value = [];
    error.value = null;
  };

  const cancelRequest = () => {
    if (abortController.value) {
      abortController.value.abort();
    }
  };

  // Cleanup on unmount
  onUnmounted(() => {
    if (abortController.value) {
      abortController.value.abort();
    }
  });

  return {
    sendMessage,
    clearConversation,
    cancelRequest,
    loading: readonly(loading),
    error: readonly(error),
    conversation: readonly(conversation)
  };
}

/**
 * Composable for news fetching functionality
 */
export function useFinBuddyNews() {
  const loading = ref(false);
  const error = ref(null);
  const lastFetch = ref(null);

  const fetchNews = async () => {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('fetchNews');

      if (supabaseError) {
        throw new Error(supabaseError.message || 'Failed to fetch news');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error occurred');
      }

      lastFetch.value = {
        timestamp: new Date().toISOString(),
        count: data.count || 0,
        message: data.message
      };

      return data;

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch news';
      error.value = errorMessage;
      throw new Error(errorMessage);

    } finally {
      loading.value = false;
    }
  };

  return {
    fetchNews,
    loading: readonly(loading),
    error: readonly(error),
    lastFetch: readonly(lastFetch)
  };
}

/**
 * Simple Chat Input Component
 */
export const ChatInput = {
  props: {
    loading: Boolean,
    disabled: Boolean
  },
  emits: ['send-message'],
  setup(props, { emit }) {
    const message = ref('');

    const handleSubmit = () => {
      if (message.value.trim() && !props.loading && !props.disabled) {
        emit('send-message', message.value);
        message.value = '';
      }
    };

    const handleKeyPress = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    };

    return {
      message,
      handleSubmit,
      handleKeyPress
    };
  },
  template: `
    <form @submit.prevent="handleSubmit" class="chat-input-form">
      <div class="input-container">
        <textarea
          v-model="message"
          @keypress="handleKeyPress"
          placeholder="Ask me about investing, finance, or current market conditions..."
          :disabled="loading || disabled"
          rows="1"
          class="message-input"
        ></textarea>
        <button
          type="submit"
          :disabled="!message.trim() || loading || disabled"
          class="send-button"
        >
          {{ loading ? 'Sending...' : 'Send' }}
        </button>
      </div>
    </form>
  `
};

/**
 * Message Component
 */
export const Message = {
  props: {
    message: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const getIcon = () => {
      switch (props.message.type) {
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

    return {
      getIcon,
      formatTime
    };
  },
  template: `
    <div :class="['message', \`message-\${message.type}\`]">
      <div class="message-header">
        <span class="message-icon">{{ getIcon() }}</span>
        <span class="message-time">{{ formatTime(message.timestamp) }}</span>
      </div>
      <div class="message-content">
        {{ message.content }}
      </div>
    </div>
  `
};

/**
 * Complete FinBuddy Chat Component
 */
export const FinBuddyChat = {
  components: {
    ChatInput,
    Message
  },
  props: {
    className: {
      type: String,
      default: ''
    }
  },
  emits: ['error'],
  setup(props, { emit }) {
    const { sendMessage, clearConversation, cancelRequest, loading, error, conversation } = useFinBuddy();
    const messagesContainer = ref(null);

    // Auto-scroll to bottom when new messages arrive
    watch(conversation, () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    });

    // Handle errors
    watch(error, (newError) => {
      if (newError) {
        emit('error', newError);
      }
    });

    const handleSendMessage = async (message) => {
      await sendMessage(message);
    };

    return {
      sendMessage: handleSendMessage,
      clearConversation,
      cancelRequest,
      loading,
      error,
      conversation,
      messagesContainer
    };
  },
  template: `
    <div :class="['finbuddy-chat', className]">
      <div class="chat-header">
        <h3>FinBuddy - Your AI Financial Assistant</h3>
        <div class="chat-actions">
          <button v-if="loading" @click="cancelRequest" class="cancel-button">
            Cancel
          </button>
          <button @click="clearConversation" class="clear-button">
            Clear Chat
          </button>
        </div>
      </div>

      <div ref="messagesContainer" class="chat-messages">
        <div v-if="conversation.length === 0" class="welcome-message">
          <h4>Welcome to FinBuddy! 👋</h4>
          <p>I'm here to help you learn about investing, personal finance, and current financial news in India.</p>
          <div class="example-questions">
            <p>Try asking me:</p>
            <ul>
              <li>"What is SIP investment?"</li>
              <li>"How does compound interest work?"</li>
              <li>"What are the best investment options for beginners?"</li>
              <li>"What's the current state of the Indian stock market?"</li>
            </ul>
          </div>
        </div>
        
        <Message
          v-for="msg in conversation"
          :key="msg.id"
          :message="msg"
        />
        
        <div v-if="loading" class="typing-indicator">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>FinBuddy is thinking...</span>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        <span>⚠️ {{ error }}</span>
        <button @click="() => window.location.reload()" class="retry-button">
          Retry
        </button>
      </div>

      <ChatInput
        :loading="loading"
        :disabled="!!error"
        @send-message="handleSendMessage"
      />
    </div>
  `
};

/**
 * News Manager Component
 */
export const NewsManager = {
  setup() {
    const { fetchNews, loading, error, lastFetch } = useFinBuddyNews();
    const autoFetch = ref(false);
    let intervalId = null;

    // Auto-fetch news every 6 hours if enabled
    watch(autoFetch, (enabled) => {
      if (enabled) {
        intervalId = setInterval(() => {
          fetchNews().catch(console.error);
        }, 6 * 60 * 60 * 1000); // 6 hours
      } else if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    });

    const handleManualFetch = async () => {
      try {
        await fetchNews();
      } catch (err) {
        console.error('Manual news fetch failed:', err);
      }
    };

    // Cleanup on unmount
    onUnmounted(() => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    });

    return {
      fetchNews: handleManualFetch,
      loading,
      error,
      lastFetch,
      autoFetch
    };
  },
  template: `
    <div class="news-manager">
      <h4>News Management</h4>
      
      <div class="news-controls">
        <button
          @click="fetchNews"
          :disabled="loading"
          class="fetch-button"
        >
          {{ loading ? 'Fetching...' : 'Fetch Latest News' }}
        </button>
        
        <label class="auto-fetch-toggle">
          <input
            type="checkbox"
            v-model="autoFetch"
          />
          Auto-fetch every 6 hours
        </label>
      </div>

      <div v-if="error" class="error-message">
        ❌ {{ error }}
      </div>

      <div v-if="lastFetch" class="last-fetch-info">
        <h5>Last Fetch:</h5>
        <p>Time: {{ new Date(lastFetch.timestamp).toLocaleString() }}</p>
        <p>Articles: {{ lastFetch.count }}</p>
        <p>Status: {{ lastFetch.message }}</p>
      </div>
    </div>
  `
};

/**
 * Advanced Chat Component with Features
 */
export const AdvancedFinBuddyChat = {
  components: {
    FinBuddyChat,
    NewsManager
  },
  setup() {
    const showNews = ref(false);
    const exportFormat = ref('json');
    const chatRef = ref(null);

    const handleError = (error) => {
      console.error('FinBuddy Error:', error);
      // You could show a toast notification here
    };

    const exportConversation = () => {
      if (!chatRef.value?.conversation) return;
      
      const conversation = chatRef.value.conversation;
      const data = conversation.map(msg => ({
        content: msg.content,
        type: msg.type,
        timestamp: msg.timestamp
      }));

      let content, filename, mimeType;

      if (exportFormat.value === 'json') {
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

    return {
      showNews,
      exportFormat,
      chatRef,
      handleError,
      exportConversation
    };
  },
  template: `
    <div class="advanced-finbuddy-chat">
      <div class="chat-sidebar">
        <div class="sidebar-section">
          <h4>Settings</h4>
          <label>
            <input
              type="checkbox"
              v-model="showNews"
            />
            Show News Manager
          </label>
        </div>

        <div class="sidebar-section">
          <h4>Export</h4>
          <select v-model="exportFormat">
            <option value="json">JSON</option>
            <option value="txt">Text</option>
          </select>
          <button @click="exportConversation" class="export-button">
            Export Conversation
          </button>
        </div>

        <NewsManager v-if="showNews" />
      </div>

      <div class="chat-main">
        <FinBuddy-Chat
          ref="chatRef"
          class="main-chat"
          @error="handleError"
        />
      </div>
    </div>
  `
};

/**
 * Vue 3 App Example
 */
export const createFinBuddyApp = () => {
  return {
    components: {
      FinBuddyChat,
      AdvancedFinBuddyChat,
      NewsManager
    },
    setup() {
      const activeTab = ref('simple');
      const { sendMessage, loading, error, conversation } = useFinBuddy();

      // Example of using the composable directly
      const testMessage = ref('');
      
      const handleTestSend = async () => {
        if (testMessage.value.trim()) {
          await sendMessage(testMessage.value);
          testMessage.value = '';
        }
      };

      return {
        activeTab,
        testMessage,
        handleTestSend,
        loading,
        error,
        conversation
      };
    },
    template: `
      <div class="finbuddy-app">
        <div class="tab-navigation">
          <button
            :class="{ active: activeTab === 'simple' }"
            @click="activeTab = 'simple'"
          >
            Simple Chat
          </button>
          <button
            :class="{ active: activeTab === 'advanced' }"
            @click="activeTab = 'advanced'"
          >
            Advanced Chat
          </button>
          <button
            :class="{ active: activeTab === 'composable' }"
            @click="activeTab = 'composable'"
          >
            Composable Example
          </button>
        </div>

        <div class="tab-content">
          <FinBuddy-Chat v-if="activeTab === 'simple'" />
          
          <Advanced-FinBuddy-Chat v-if="activeTab === 'advanced'" />
          
          <div v-if="activeTab === 'composable'" class="composable-example">
            <h3>Direct Composable Usage</h3>
            
            <div class="conversation-display">
              <div
                v-for="msg in conversation"
                :key="msg.id"
                :class="['msg', \`msg-\${msg.type}\`]"
              >
                <strong>{{ msg.type }}:</strong> {{ msg.content }}
              </div>
            </div>

            <div v-if="error" class="error">Error: {{ error }}</div>

            <div class="input-section">
              <input
                v-model="testMessage"
                type="text"
                placeholder="Enter your message..."
                :disabled="loading"
                @keypress.enter="handleTestSend"
              />
              <button
                @click="handleTestSend"
                :disabled="loading || !testMessage.trim()"
              >
                {{ loading ? 'Sending...' : 'Send' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    `
  };
};

/**
 * Pinia Store for FinBuddy (if using Pinia for state management)
 */
export const useFinBuddyStore = () => {
  return defineStore('finbuddy', () => {
    const conversation = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const client = createClient(FINBUDDY_CONFIG.supabaseUrl, FINBUDDY_CONFIG.supabaseAnonKey);

    const sendMessage = async (message) => {
      if (!message?.trim()) {
        error.value = 'Message is required';
        return;
      }

      loading.value = true;
      error.value = null;

      try {
        const { data, error: supabaseError } = await client.functions.invoke('chat', {
          body: { message: message.trim() }
        });

        if (supabaseError) throw new Error(supabaseError.message);
        if (!data?.success) throw new Error(data?.error || 'Unknown error');

        // Add messages to conversation
        conversation.value.push(
          {
            id: Date.now(),
            content: message,
            type: 'user',
            timestamp: new Date().toISOString()
          },
          {
            id: Date.now() + 1,
            content: data.message,
            type: 'assistant',
            timestamp: new Date().toISOString()
          }
        );

      } catch (err) {
        error.value = err.message;
        conversation.value.push({
          id: Date.now(),
          content: `Error: ${err.message}`,
          type: 'error',
          timestamp: new Date().toISOString()
        });
      } finally {
        loading.value = false;
      }
    };

    const clearConversation = () => {
      conversation.value = [];
      error.value = null;
    };

    return {
      conversation: readonly(conversation),
      loading: readonly(loading),
      error: readonly(error),
      sendMessage,
      clearConversation
    };
  });
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

.tab-navigation {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab-navigation button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: #f8f9fa;
  cursor: pointer;
  border-radius: 4px;
}

.tab-navigation button.active {
  background: #007bff;
  color: white;
}
`;

export default {
  useFinBuddy,
  useFinBuddyNews,
  ChatInput,
  Message,
  FinBuddyChat,
  NewsManager,
  AdvancedFinBuddyChat,
  createFinBuddyApp,
  useFinBuddyStore
};