/**
 * FinBuddy Backend Testing Examples
 * 
 * This file contains comprehensive testing examples for the FinBuddy Backend integration,
 * including unit tests, integration tests, mocking strategies, and testing utilities.
 */

// ===== TESTING UTILITIES =====

/**
 * Mock FinBuddy Client for Testing
 */
class MockFinBuddyClient {
  constructor(options = {}) {
    this.mockResponses = options.mockResponses || {};
    this.shouldFail = options.shouldFail || false;
    this.delay = options.delay || 0;
    this.callHistory = [];
  }

  async sendMessage(message) {
    this.callHistory.push({ method: 'sendMessage', message, timestamp: Date.now() });

    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    if (this.shouldFail) {
      throw new Error('Mock error for testing');
    }

    const response = this.mockResponses[message] || 
      `Mock response for: ${message.substring(0, 50)}...`;

    return {
      success: true,
      message: response,
      timestamp: new Date().toISOString()
    };
  }

  async fetchNews() {
    this.callHistory.push({ method: 'fetchNews', timestamp: Date.now() });

    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    if (this.shouldFail) {
      throw new Error('Mock news fetch error');
    }

    return {
      success: true,
      message: 'Successfully fetched 10 news articles',
      count: 10,
      timestamp: new Date().toISOString()
    };
  }

  getCallHistory() {
    return [...this.callHistory];
  }

  clearHistory() {
    this.callHistory = [];
  }
}

/**
 * Test Data Factory
 */
class TestDataFactory {
  static createMessage(overrides = {}) {
    return {
      id: Date.now(),
      content: 'Test message',
      type: 'user',
      timestamp: new Date().toISOString(),
      ...overrides
    };
  }

  static createConversation(length = 3) {
    const conversation = [];
    for (let i = 0; i < length; i++) {
      conversation.push(
        this.createMessage({ 
          id: i * 2, 
          content: `User message ${i + 1}`, 
          type: 'user' 
        }),
        this.createMessage({ 
          id: i * 2 + 1, 
          content: `Assistant response ${i + 1}`, 
          type: 'assistant' 
        })
      );
    }
    return conversation;
  }

  static createErrorResponse(message = 'Test error') {
    return {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };
  }

  static createSuccessResponse(message = 'Test response') {
    return {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test Helpers
 */
class TestHelpers {
  static async waitFor(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static mockFetch(responses) {
    const originalFetch = global.fetch;
    const mockResponses = Array.isArray(responses) ? responses : [responses];
    let callCount = 0;

    global.fetch = jest.fn(async (url, options) => {
      const response = mockResponses[callCount] || mockResponses[mockResponses.length - 1];
      callCount++;

      if (response.shouldReject) {
        throw new Error(response.error || 'Network error');
      }

      return {
        ok: response.ok !== false,
        status: response.status || 200,
        json: async () => response.data || response,
        headers: new Map(Object.entries(response.headers || {}))
      };
    });

    return () => {
      global.fetch = originalFetch;
    };
  }

  static createMockAbortController() {
    const controller = {
      signal: { aborted: false },
      abort: jest.fn(() => {
        controller.signal.aborted = true;
      })
    };
    return controller;
  }
}

// ===== JEST UNIT TESTS =====

/**
 * Unit Tests for FinBuddy Client
 */
// __tests__/finbuddy-client.test.js

describe('FinBuddyClient', () => {
  let client;
  let restoreFetch;

  beforeEach(() => {
    client = new FinBuddyClient({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-key'
    });
  });

  afterEach(() => {
    if (restoreFetch) {
      restoreFetch();
      restoreFetch = null;
    }
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      restoreFetch = TestHelpers.mockFetch({
        success: true,
        message: 'Test response from FinBuddy'
      });

      const response = await client.sendMessage('What is SIP?');

      expect(response.success).toBe(true);
      expect(response.message).toBe('Test response from FinBuddy');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key'
          }),
          body: JSON.stringify({ message: 'What is SIP?' })
        })
      );
    });

    it('should handle validation errors', async () => {
      await expect(client.sendMessage('')).rejects.toThrow('Message is required');
      await expect(client.sendMessage(null)).rejects.toThrow('Message is required');
      await expect(client.sendMessage('   ')).rejects.toThrow('Message is required');
    });

    it('should handle API errors', async () => {
      restoreFetch = TestHelpers.mockFetch({
        ok: false,
        status: 400,
        error: 'Bad request'
      });

      await expect(client.sendMessage('test')).rejects.toThrow('Bad request');
    });

    it('should handle network errors', async () => {
      restoreFetch = TestHelpers.mockFetch({
        shouldReject: true,
        error: 'Network error'
      });

      await expect(client.sendMessage('test')).rejects.toThrow('Network error');
    });

    it('should retry on failure', async () => {
      const responses = [
        { shouldReject: true, error: 'Network error' },
        { shouldReject: true, error: 'Network error' },
        { success: true, message: 'Success after retries' }
      ];

      restoreFetch = TestHelpers.mockFetch(responses);

      const response = await client.sendMessage('test');
      expect(response.message).toBe('Success after retries');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle request cancellation', async () => {
      const controller = TestHelpers.createMockAbortController();
      
      restoreFetch = TestHelpers.mockFetch({
        shouldReject: true,
        error: 'AbortError'
      });

      // Simulate abort
      setTimeout(() => controller.abort(), 100);

      await expect(
        client.sendMessage('test', { signal: controller.signal })
      ).rejects.toThrow('Request was cancelled');
    });
  });

  describe('fetchNews', () => {
    it('should fetch news successfully', async () => {
      restoreFetch = TestHelpers.mockFetch({
        success: true,
        message: 'Successfully fetched 10 news articles',
        count: 10
      });

      const response = await client.fetchNews();

      expect(response.success).toBe(true);
      expect(response.count).toBe(10);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/fetchNews',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });
  });
});

/**
 * Unit Tests for React Hook
 */
// __tests__/use-finbuddy.test.js

import { renderHook, act } from '@testing-library/react';
import { useFinBuddy } from '../hooks/useFinBuddy';

describe('useFinBuddy', () => {
  let restoreFetch;

  afterEach(() => {
    if (restoreFetch) {
      restoreFetch();
      restoreFetch = null;
    }
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useFinBuddy());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.conversation).toEqual([]);
  });

  it('should send message and update conversation', async () => {
    restoreFetch = TestHelpers.mockFetch({
      success: true,
      message: 'Test response'
    });

    const { result } = renderHook(() => useFinBuddy());

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    expect(result.current.conversation).toHaveLength(2);
    expect(result.current.conversation[0].content).toBe('Test message');
    expect(result.current.conversation[0].type).toBe('user');
    expect(result.current.conversation[1].content).toBe('Test response');
    expect(result.current.conversation[1].type).toBe('assistant');
  });

  it('should handle loading state', async () => {
    restoreFetch = TestHelpers.mockFetch({
      success: true,
      message: 'Test response'
    });

    const { result } = renderHook(() => useFinBuddy());

    let loadingStates = [];
    
    act(() => {
      result.current.sendMessage('Test message').then(() => {
        loadingStates.push(result.current.loading);
      });
      loadingStates.push(result.current.loading);
    });

    await TestHelpers.waitFor(() => !result.current.loading);

    expect(loadingStates).toContain(true);
    expect(result.current.loading).toBe(false);
  });

  it('should handle errors', async () => {
    restoreFetch = TestHelpers.mockFetch({
      shouldReject: true,
      error: 'Test error'
    });

    const { result } = renderHook(() => useFinBuddy());

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    expect(result.current.error).toBe('Test error');
    expect(result.current.conversation).toHaveLength(1);
    expect(result.current.conversation[0].type).toBe('error');
  });

  it('should clear conversation', () => {
    const { result } = renderHook(() => useFinBuddy());

    // Add some messages first
    act(() => {
      result.current.conversation.push(
        TestDataFactory.createMessage({ type: 'user' }),
        TestDataFactory.createMessage({ type: 'assistant' })
      );
    });

    act(() => {
      result.current.clearConversation();
    });

    expect(result.current.conversation).toEqual([]);
    expect(result.current.error).toBe(null);
  });
});

// ===== INTEGRATION TESTS =====

/**
 * Integration Tests for React Components
 */
// __tests__/finbuddy-chat.integration.test.js

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinBuddyChat from '../components/FinBuddyChat';

describe('FinBuddyChat Integration', () => {
  let restoreFetch;

  afterEach(() => {
    if (restoreFetch) {
      restoreFetch();
      restoreFetch = null;
    }
  });

  it('should render welcome message initially', () => {
    render(<FinBuddyChat />);
    
    expect(screen.getByText('Welcome to FinBuddy! 👋')).toBeInTheDocument();
    expect(screen.getByText(/Try asking me:/)).toBeInTheDocument();
  });

  it('should send message and display response', async () => {
    const user = userEvent.setup();
    
    restoreFetch = TestHelpers.mockFetch({
      success: true,
      message: 'SIP stands for Systematic Investment Plan...'
    });

    render(<FinBuddyChat />);

    const input = screen.getByPlaceholderText(/Ask me about investing/);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'What is SIP?');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('What is SIP?')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/SIP stands for Systematic Investment Plan/)).toBeInTheDocument();
    });

    expect(input.value).toBe(''); // Input should be cleared
  });

  it('should handle enter key submission', async () => {
    const user = userEvent.setup();
    
    restoreFetch = TestHelpers.mockFetch({
      success: true,
      message: 'Test response'
    });

    render(<FinBuddyChat />);

    const input = screen.getByPlaceholderText(/Ask me about investing/);
    
    await user.type(input, 'Test message');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response
    restoreFetch = TestHelpers.mockFetch({
      success: true,
      message: 'Delayed response'
    });

    render(<FinBuddyChat />);

    const input = screen.getByPlaceholderText(/Ask me about investing/);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Test message');
    await user.click(sendButton);

    expect(screen.getByText('FinBuddy is thinking...')).toBeInTheDocument();
    expect(sendButton).toHaveTextContent('Sending...');
    expect(sendButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('Delayed response')).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    const user = userEvent.setup();
    
    restoreFetch = TestHelpers.mockFetch({
      shouldReject: true,
      error: 'Network error'
    });

    render(<FinBuddyChat />);

    const input = screen.getByPlaceholderText(/Ask me about investing/);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Test message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });

  it('should clear conversation', async () => {
    const user = userEvent.setup();
    
    restoreFetch = TestHelpers.mockFetch({
      success: true,
      message: 'Test response'
    });

    render(<FinBuddyChat />);

    // Send a message first
    const input = screen.getByPlaceholderText(/Ask me about investing/);
    await user.type(input, 'Test message');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Clear conversation
    const clearButton = screen.getByRole('button', { name: /clear chat/i });
    await user.click(clearButton);

    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    expect(screen.getByText('Welcome to FinBuddy! 👋')).toBeInTheDocument();
  });
});

// ===== E2E TESTS (Playwright/Cypress) =====

/**
 * Playwright E2E Tests
 */
// e2e/finbuddy.spec.js

const { test, expect } = require('@playwright/test');

test.describe('FinBuddy E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
  });

  test('should complete full chat flow', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('h3')).toContainText('FinBuddy');

    // Type a message
    const input = page.locator('textarea[placeholder*="Ask me about investing"]');
    await input.fill('What is SIP investment?');

    // Send message
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Wait for user message to appear
    await expect(page.locator('.message-user')).toContainText('What is SIP investment?');

    // Wait for assistant response
    await expect(page.locator('.message-assistant')).toBeVisible({ timeout: 10000 });

    // Verify response contains relevant content
    const response = await page.locator('.message-assistant .message-content').textContent();
    expect(response.toLowerCase()).toContain('sip');
  });

  test('should handle multiple messages', async ({ page }) => {
    const messages = [
      'What is SIP?',
      'How does compound interest work?',
      'What are mutual funds?'
    ];

    for (const message of messages) {
      const input = page.locator('textarea[placeholder*="Ask me about investing"]');
      await input.fill(message);
      
      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for response
      await page.waitForSelector('.message-assistant', { timeout: 10000 });
    }

    // Verify all messages are present
    for (const message of messages) {
      await expect(page.locator('.message-user')).toContainText(message);
    }
  });

  test('should clear conversation', async ({ page }) => {
    // Send a message first
    const input = page.locator('textarea[placeholder*="Ask me about investing"]');
    await input.fill('Test message');
    
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    await expect(page.locator('.message-user')).toContainText('Test message');

    // Clear conversation
    const clearButton = page.locator('button:has-text("Clear Chat")');
    await clearButton.click();

    // Verify welcome message is back
    await expect(page.locator('.welcome-message')).toBeVisible();
    await expect(page.locator('.message-user')).not.toBeVisible();
  });
});

/**
 * Cypress E2E Tests
 */
// cypress/e2e/finbuddy.cy.js

describe('FinBuddy E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/chat');
  });

  it('should send message and receive response', () => {
    cy.get('textarea[placeholder*="Ask me about investing"]')
      .type('What is SIP investment?');
    
    cy.get('button').contains('Send').click();

    cy.get('.message-user')
      .should('contain', 'What is SIP investment?');

    cy.get('.message-assistant', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'SIP');
  });

  it('should handle keyboard shortcuts', () => {
    cy.get('textarea[placeholder*="Ask me about investing"]')
      .type('Test message{enter}');

    cy.get('.message-user')
      .should('contain', 'Test message');
  });

  it('should show loading state', () => {
    cy.get('textarea[placeholder*="Ask me about investing"]')
      .type('What is compound interest?');
    
    cy.get('button').contains('Send').click();

    cy.get('.typing-indicator')
      .should('be.visible')
      .and('contain', 'FinBuddy is thinking');

    cy.get('button').contains('Sending...')
      .should('be.disabled');
  });
});

// ===== PERFORMANCE TESTS =====

/**
 * Performance Testing Utilities
 */
class PerformanceTestRunner {
  static async measureResponseTime(client, message, iterations = 10) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await client.sendMessage(message);
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        console.error(`Iteration ${i + 1} failed:`, error);
      }

      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      times
    };
  }

  static async loadTest(client, concurrentUsers = 5, messagesPerUser = 3) {
    const users = Array.from({ length: concurrentUsers }, (_, i) => ({
      id: i + 1,
      messages: Array.from({ length: messagesPerUser }, (_, j) => 
        `User ${i + 1} message ${j + 1}: What is investment?`
      )
    }));

    const startTime = Date.now();
    const results = await Promise.allSettled(
      users.map(async (user) => {
        const userResults = [];
        
        for (const message of user.messages) {
          const messageStart = Date.now();
          
          try {
            await client.sendMessage(message);
            userResults.push({
              success: true,
              responseTime: Date.now() - messageStart
            });
          } catch (error) {
            userResults.push({
              success: false,
              error: error.message,
              responseTime: Date.now() - messageStart
            });
          }
        }
        
        return { userId: user.id, results: userResults };
      })
    );

    const totalTime = Date.now() - startTime;
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      totalTime,
      successful,
      failed,
      successRate: (successful / results.length) * 100,
      results
    };
  }
}

// ===== TEST CONFIGURATION =====

/**
 * Jest Configuration
 */
// jest.config.js

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/reportWebVitals.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};

/**
 * Test Setup
 */
// src/setupTests.js

import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Export test utilities for use in other test files
export {
  MockFinBuddyClient,
  TestDataFactory,
  TestHelpers,
  PerformanceTestRunner
};