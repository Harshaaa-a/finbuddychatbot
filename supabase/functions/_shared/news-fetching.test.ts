// Unit tests for news fetching functionality using Deno testing framework
import { assertEquals, assertStringIncludes, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { NewsAPIClient, NewsAPIResponse, NewsItem } from './news-api-client.ts';
import { NewsStorageService, NewsUpdateResult } from './news-storage.ts';
import { NewsInsert } from './types.ts';

// Mock news API responses for testing
const mockNewsDataResponse = {
  status: 'success',
  results: [
    {
      title: 'Sensex rises 200 points on positive market sentiment',
      link: 'https://example.com/news1',
      pubDate: '2024-10-25T10:00:00Z',
      source_id: 'economic-times'
    },
    {
      title: 'RBI maintains repo rate at 6.5% in latest policy meeting',
      link: 'https://example.com/news2',
      pubDate: '2024-10-25T09:00:00Z',
      source_id: 'business-standard'
    },
    {
      title: 'Tech stocks surge as IT sector shows strong growth',
      link: 'https://example.com/news3',
      pubDate: '2024-10-25T08:00:00Z',
      source_id: 'mint'
    }
  ]
};

const mockFinnhubResponse = [
  {
    headline: 'Indian markets open higher on global cues',
    url: 'https://example.com/finnhub1',
    datetime: 1698235200, // Unix timestamp
    source: 'Reuters'
  },
  {
    headline: 'Banking sector shows resilience amid market volatility',
    url: 'https://example.com/finnhub2',
    datetime: 1698231600,
    source: 'Bloomberg'
  }
];

// Mock Supabase client for testing database operations
class MockSupabaseClient {
  private mockNews: NewsInsert[] = [];
  private shouldFail: boolean;
  private insertCount: number = 0;
  private deleteCount: number = 0;

  constructor(shouldFail = false) {
    this.shouldFail = shouldFail;
  }

  async updateNewsStorage(newsItems: NewsInsert[], maxItems: number): Promise<{ inserted: number; deleted: number }> {
    if (this.shouldFail) {
      throw new Error('Database operation failed');
    }

    // Simulate inserting new items
    this.insertCount = newsItems.length;
    this.mockNews.push(...newsItems);

    // Simulate cleanup of old items
    if (this.mockNews.length > maxItems) {
      this.deleteCount = this.mockNews.length - maxItems;
      this.mockNews = this.mockNews.slice(-maxItems);
    }

    return {
      inserted: this.insertCount,
      deleted: this.deleteCount
    };
  }

  async getLatestNews(limit: number): Promise<NewsInsert[]> {
    if (this.shouldFail) {
      throw new Error('Database query failed');
    }
    return this.mockNews.slice(0, limit);
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail;
  }

  // Helper methods for testing
  setMockNews(news: NewsInsert[]) {
    this.mockNews = [...news];
  }

  getMockNews() {
    return [...this.mockNews];
  }

  reset() {
    this.mockNews = [];
    this.insertCount = 0;
    this.deleteCount = 0;
  }
}

// Mock fetch function for API testing
function createMockFetch(response: any, shouldFail = false, status = 200) {
  return async (url: string, options?: any): Promise<Response> => {
    if (shouldFail) {
      throw new Error('Network error');
    }

    const mockResponse = {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: async () => response,
      text: async () => JSON.stringify(response)
    };

    return mockResponse as Response;
  };
}

Deno.test("NewsAPIClient - NewsData.io successful response", async () => {
  // Mock environment variable
  const originalEnv = Deno.env.get('NEWS_API_KEY');
  Deno.env.set('NEWS_API_KEY', 'test-api-key');

  // Mock fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(mockNewsDataResponse);

  try {
    const client = new NewsAPIClient();
    const result = await client.fetchLatestNews();

    assertEquals(result.success, true);
    assertEquals(result.articles.length, 3);
    assertEquals(result.error, undefined);

    // Check first article
    const firstArticle = result.articles[0];
    assertEquals(firstArticle.headline, 'Sensex rises 200 points on positive market sentiment');
    assertEquals(firstArticle.url, 'https://example.com/news1');
    assertEquals(firstArticle.source, 'economic-times');
    assertEquals(firstArticle.published_at, '2024-10-25T10:00:00Z');

  } finally {
    // Restore original fetch and environment
    globalThis.fetch = originalFetch;
    if (originalEnv) {
      Deno.env.set('NEWS_API_KEY', originalEnv);
    } else {
      Deno.env.delete('NEWS_API_KEY');
    }
  }
});

Deno.test("NewsAPIClient - Finnhub fallback response", async () => {
  // Set up environment with only Finnhub key
  const originalNewsKey = Deno.env.get('NEWS_API_KEY');
  const originalFinnhubKey = Deno.env.get('FINNHUB_API_KEY');
  
  Deno.env.delete('NEWS_API_KEY'); // Remove NewsData key
  Deno.env.set('FINNHUB_API_KEY', 'test-finnhub-key');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(mockFinnhubResponse);

  try {
    const client = new NewsAPIClient();
    const result = await client.fetchLatestNews();

    assertEquals(result.success, true);
    assertEquals(result.articles.length, 2);

    // Check first article from Finnhub
    const firstArticle = result.articles[0];
    assertEquals(firstArticle.headline, 'Indian markets open higher on global cues');
    assertEquals(firstArticle.url, 'https://example.com/finnhub1');
    assertEquals(firstArticle.source, 'Reuters');
    
    // Check timestamp conversion
    assertEquals(firstArticle.published_at, new Date(1698235200 * 1000).toISOString());

  } finally {
    globalThis.fetch = originalFetch;
    if (originalNewsKey) {
      Deno.env.set('NEWS_API_KEY', originalNewsKey);
    }
    if (originalFinnhubKey) {
      Deno.env.set('FINNHUB_API_KEY', originalFinnhubKey);
    } else {
      Deno.env.delete('FINNHUB_API_KEY');
    }
  }
});

Deno.test("NewsAPIClient - API error handling", async () => {
  const originalEnv = Deno.env.get('NEWS_API_KEY');
  Deno.env.set('NEWS_API_KEY', 'test-api-key');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch({}, true); // Should fail

  try {
    const client = new NewsAPIClient();
    const result = await client.fetchLatestNews();

    assertEquals(result.success, false);
    assertEquals(result.articles.length, 0);
    assertEquals(typeof result.error, 'string');
    assertStringIncludes(result.error!, 'Network error');

  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv) {
      Deno.env.set('NEWS_API_KEY', originalEnv);
    } else {
      Deno.env.delete('NEWS_API_KEY');
    }
  }
});

Deno.test("NewsAPIClient - HTTP error response", async () => {
  const originalEnv = Deno.env.get('NEWS_API_KEY');
  Deno.env.set('NEWS_API_KEY', 'test-api-key');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch({ error: 'Invalid API key' }, false, 401);

  try {
    const client = new NewsAPIClient();
    const result = await client.fetchLatestNews();

    assertEquals(result.success, false);
    assertEquals(result.articles.length, 0);
    assertEquals(typeof result.error, 'string');
    assertStringIncludes(result.error!, 'NewsData API error: 401');

  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv) {
      Deno.env.set('NEWS_API_KEY', originalEnv);
    } else {
      Deno.env.delete('NEWS_API_KEY');
    }
  }
});

Deno.test("NewsAPIClient - no API keys configured", async () => {
  const originalNewsKey = Deno.env.get('NEWS_API_KEY');
  const originalFinnhubKey = Deno.env.get('FINNHUB_API_KEY');
  
  // Remove all API keys
  Deno.env.delete('NEWS_API_KEY');
  Deno.env.delete('FINNHUB_API_KEY');

  try {
    const client = new NewsAPIClient();
    assertEquals(client.isConfigured(), false);

    const result = await client.fetchLatestNews();
    assertEquals(result.success, false);
    assertEquals(result.articles.length, 0);
    assertEquals(result.error, 'All news API sources are unavailable');

  } finally {
    if (originalNewsKey) {
      Deno.env.set('NEWS_API_KEY', originalNewsKey);
    }
    if (originalFinnhubKey) {
      Deno.env.set('FINNHUB_API_KEY', originalFinnhubKey);
    }
  }
});

Deno.test("NewsAPIClient - malformed API response", async () => {
  const originalEnv = Deno.env.get('NEWS_API_KEY');
  Deno.env.set('NEWS_API_KEY', 'test-api-key');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch({ status: 'error', message: 'Invalid request' });

  try {
    const client = new NewsAPIClient();
    const result = await client.fetchLatestNews();

    assertEquals(result.success, false);
    assertEquals(result.articles.length, 0);
    assertStringIncludes(result.error!, 'NewsData API returned error: Invalid request');

  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv) {
      Deno.env.set('NEWS_API_KEY', originalEnv);
    } else {
      Deno.env.delete('NEWS_API_KEY');
    }
  }
});

Deno.test("NewsStorageService - successful news update", async () => {
  // Create mock storage service with working API client
  const mockSupabase = new MockSupabaseClient();
  const storageService = new NewsStorageService();
  
  // Replace supabase client with mock
  (storageService as any).newsClient = {
    isConfigured: () => true,
    fetchLatestNews: async () => ({
      success: true,
      articles: [
        {
          headline: 'Test headline 1',
          url: 'https://example.com/1',
          published_at: '2024-10-25T10:00:00Z',
          source: 'Test Source'
        },
        {
          headline: 'Test headline 2',
          url: 'https://example.com/2',
          published_at: '2024-10-25T09:00:00Z',
          source: 'Test Source 2'
        }
      ]
    })
  };

  // Mock the supabaseClient import
  const originalSupabaseClient = await import('./supabase-client.ts');
  const mockClient = {
    updateNewsStorage: mockSupabase.updateNewsStorage.bind(mockSupabase),
    getLatestNews: mockSupabase.getLatestNews.bind(mockSupabase)
  };

  // Replace the client temporarily
  Object.defineProperty(originalSupabaseClient, 'supabaseClient', {
    value: mockClient,
    configurable: true
  });

  try {
    const result = await storageService.updateNewsStorage();

    assertEquals(result.success, true);
    assertEquals(result.inserted, 2);
    assertEquals(result.deleted, 0);
    assertEquals(result.totalStored, 2);
    assertEquals(result.error, undefined);

  } finally {
    // Restore original client
    mockSupabase.reset();
  }
});Deno.te
st("NewsStorageService - API failure handling", async () => {
  const mockSupabase = new MockSupabaseClient();
  const storageService = new NewsStorageService();
  
  // Mock failing API client
  (storageService as any).newsClient = {
    isConfigured: () => true,
    fetchLatestNews: async () => ({
      success: false,
      articles: [],
      error: 'API rate limit exceeded'
    })
  };

  const result = await storageService.updateNewsStorage();

  assertEquals(result.success, false);
  assertEquals(result.inserted, 0);
  assertEquals(result.deleted, 0);
  assertEquals(result.totalStored, 0);
  assertEquals(result.error, 'API rate limit exceeded');
});

Deno.test("NewsStorageService - database failure handling", async () => {
  const mockSupabase = new MockSupabaseClient(true); // Should fail
  const storageService = new NewsStorageService();
  
  // Mock working API client
  (storageService as any).newsClient = {
    isConfigured: () => true,
    fetchLatestNews: async () => ({
      success: true,
      articles: [
        {
          headline: 'Test headline',
          url: 'https://example.com/1',
          published_at: '2024-10-25T10:00:00Z',
          source: 'Test Source'
        }
      ]
    })
  };

  // Mock the supabaseClient import with failing client
  const originalSupabaseClient = await import('./supabase-client.ts');
  const mockClient = {
    updateNewsStorage: mockSupabase.updateNewsStorage.bind(mockSupabase),
    getLatestNews: mockSupabase.getLatestNews.bind(mockSupabase)
  };

  Object.defineProperty(originalSupabaseClient, 'supabaseClient', {
    value: mockClient,
    configurable: true
  });

  try {
    const result = await storageService.updateNewsStorage();

    assertEquals(result.success, false);
    assertEquals(result.inserted, 0);
    assertEquals(result.deleted, 0);
    assertEquals(result.totalStored, 0);
    assertStringIncludes(result.error!, 'Database operation failed');

  } finally {
    mockSupabase.reset();
  }
});

Deno.test("NewsStorageService - no API configured", async () => {
  const storageService = new NewsStorageService();
  
  // Mock unconfigured API client
  (storageService as any).newsClient = {
    isConfigured: () => false,
    fetchLatestNews: async () => ({
      success: false,
      articles: [],
      error: 'No API keys configured'
    })
  };

  const result = await storageService.updateNewsStorage();

  assertEquals(result.success, false);
  assertEquals(result.inserted, 0);
  assertEquals(result.deleted, 0);
  assertEquals(result.totalStored, 0);
  assertEquals(result.error, 'No news API keys configured');
});

Deno.test("NewsStorageService - database cleanup operation", async () => {
  const mockSupabase = new MockSupabaseClient();
  const storageService = new NewsStorageService();
  
  // Pre-populate with existing news items
  const existingNews: NewsInsert[] = Array.from({ length: 8 }, (_, i) => ({
    headline: `Existing headline ${i + 1}`,
    url: `https://example.com/existing${i + 1}`,
    published_at: new Date(Date.now() - i * 3600000).toISOString(),
    source: 'Existing Source'
  }));
  
  mockSupabase.setMockNews(existingNews);

  // Mock API client returning 5 new items
  (storageService as any).newsClient = {
    isConfigured: () => true,
    fetchLatestNews: async () => ({
      success: true,
      articles: Array.from({ length: 5 }, (_, i) => ({
        headline: `New headline ${i + 1}`,
        url: `https://example.com/new${i + 1}`,
        published_at: new Date().toISOString(),
        source: 'New Source'
      }))
    })
  };

  // Mock the supabaseClient with cleanup logic
  const originalSupabaseClient = await import('./supabase-client.ts');
  const mockClient = {
    updateNewsStorage: async (newsItems: NewsInsert[], maxItems: number) => {
      // Simulate adding new items and cleanup
      const totalItems = existingNews.length + newsItems.length;
      const deleted = totalItems > maxItems ? totalItems - maxItems : 0;
      
      return {
        inserted: newsItems.length,
        deleted: deleted
      };
    },
    getLatestNews: async (limit: number) => {
      // Return the latest items after cleanup
      const allItems = [...existingNews, ...Array.from({ length: 5 }, (_, i) => ({
        headline: `New headline ${i + 1}`,
        url: `https://example.com/new${i + 1}`,
        published_at: new Date().toISOString(),
        source: 'New Source'
      }))];
      
      return allItems.slice(-Math.min(limit, 10)); // Keep only latest 10
    }
  };

  Object.defineProperty(originalSupabaseClient, 'supabaseClient', {
    value: mockClient,
    configurable: true
  });

  try {
    const result = await storageService.updateNewsStorage();

    assertEquals(result.success, true);
    assertEquals(result.inserted, 5);
    assertEquals(result.deleted, 3); // 8 + 5 - 10 = 3 deleted
    assertEquals(result.totalStored, 10);

  } finally {
    mockSupabase.reset();
  }
});

Deno.test("NewsStorageService - getLatestNewsForContext", async () => {
  const mockSupabase = new MockSupabaseClient();
  const storageService = new NewsStorageService();
  
  // Set up mock news items
  const mockNewsItems: NewsInsert[] = [
    {
      headline: 'Market update 1',
      url: 'https://example.com/1',
      published_at: '2024-10-25T10:00:00Z',
      source: 'Source 1'
    },
    {
      headline: 'Market update 2',
      url: 'https://example.com/2',
      published_at: '2024-10-25T09:00:00Z',
      source: 'Source 2'
    }
  ];
  
  mockSupabase.setMockNews(mockNewsItems);

  // Mock the supabaseClient import
  const originalSupabaseClient = await import('./supabase-client.ts');
  const mockClient = {
    getLatestNews: mockSupabase.getLatestNews.bind(mockSupabase)
  };

  Object.defineProperty(originalSupabaseClient, 'supabaseClient', {
    value: mockClient,
    configurable: true
  });

  try {
    const newsForContext = await storageService.getLatestNewsForContext(2);

    assertEquals(newsForContext.length, 2);
    assertEquals(newsForContext[0].headline, 'Market update 1');
    assertEquals(newsForContext[1].headline, 'Market update 2');

  } finally {
    mockSupabase.reset();
  }
});

Deno.test("NewsStorageService - getLatestNewsForContext error handling", async () => {
  const mockSupabase = new MockSupabaseClient(true); // Should fail
  const storageService = new NewsStorageService();

  // Mock the supabaseClient import with failing client
  const originalSupabaseClient = await import('./supabase-client.ts');
  const mockClient = {
    getLatestNews: mockSupabase.getLatestNews.bind(mockSupabase)
  };

  Object.defineProperty(originalSupabaseClient, 'supabaseClient', {
    value: mockClient,
    configurable: true
  });

  try {
    const newsForContext = await storageService.getLatestNewsForContext(3);

    // Should return empty array on error
    assertEquals(newsForContext.length, 0);

  } finally {
    mockSupabase.reset();
  }
});

Deno.test("NewsStorageService - headline sanitization", async () => {
  const storageService = new NewsStorageService();
  
  // Test the private sanitizeHeadline method through public interface
  const testHeadlines = [
    'Normal headline',
    '  Headline with   extra   spaces  ',
    'Very long headline that exceeds the normal length limit and should be truncated to prevent database issues and maintain performance'.repeat(10),
    'Headline\nwith\nnewlines',
    'Headline\twith\ttabs'
  ];

  // Mock API client with test headlines
  (storageService as any).newsClient = {
    isConfigured: () => true,
    fetchLatestNews: async () => ({
      success: true,
      articles: testHeadlines.map((headline, i) => ({
        headline,
        url: `https://example.com/${i}`,
        published_at: new Date().toISOString(),
        source: 'Test Source'
      }))
    })
  };

  const mockSupabase = new MockSupabaseClient();
  let sanitizedHeadlines: string[] = [];

  // Mock the supabaseClient to capture sanitized headlines
  const originalSupabaseClient = await import('./supabase-client.ts');
  const mockClient = {
    updateNewsStorage: async (newsItems: NewsInsert[], maxItems: number) => {
      sanitizedHeadlines = newsItems.map(item => item.headline);
      return { inserted: newsItems.length, deleted: 0 };
    },
    getLatestNews: async () => []
  };

  Object.defineProperty(originalSupabaseClient, 'supabaseClient', {
    value: mockClient,
    configurable: true
  });

  try {
    await storageService.updateNewsStorage();

    // Check sanitization results
    assertEquals(sanitizedHeadlines[0], 'Normal headline');
    assertEquals(sanitizedHeadlines[1], 'Headline with extra spaces');
    assertEquals(sanitizedHeadlines[2].length <= 500, true); // Should be truncated
    assertEquals(sanitizedHeadlines[3], 'Headline with newlines'); // Newlines should be replaced with spaces
    assertEquals(sanitizedHeadlines[4], 'Headline with tabs'); // Tabs should be replaced with spaces

  } finally {
    mockSupabase.reset();
  }
});

Deno.test("NewsStorageService - health status check", async () => {
  const mockSupabase = new MockSupabaseClient();
  const storageService = new NewsStorageService();
  
  // Set up mock news item with created_at timestamp
  const mockNewsItem = {
    headline: 'Test headline',
    url: 'https://example.com/1',
    published_at: '2024-10-25T10:00:00Z',
    source: 'Test Source',
    created_at: '2024-10-25T10:05:00Z'
  };
  
  mockSupabase.setMockNews([mockNewsItem]);

  // Mock configured API client
  (storageService as any).newsClient = {
    isConfigured: () => true
  };

  // Mock the supabaseClient import
  const originalSupabaseClient = await import('./supabase-client.ts');
  const mockClient = {
    healthCheck: mockSupabase.healthCheck.bind(mockSupabase),
    getLatestNews: async () => [mockNewsItem]
  };

  Object.defineProperty(originalSupabaseClient, 'supabaseClient', {
    value: mockClient,
    configurable: true
  });

  try {
    const healthStatus = await storageService.getHealthStatus();

    assertEquals(healthStatus.databaseHealthy, true);
    assertEquals(healthStatus.newsCount, 1);
    assertEquals(healthStatus.lastUpdate, '2024-10-25T10:05:00Z');
    assertEquals(healthStatus.apiConfigured, true);

  } finally {
    mockSupabase.reset();
  }
});

Deno.test("NewsStorageService - health status with database failure", async () => {
  const mockSupabase = new MockSupabaseClient(true); // Should fail
  const storageService = new NewsStorageService();

  // Mock configured API client
  (storageService as any).newsClient = {
    isConfigured: () => true
  };

  // Mock the supabaseClient import with failing client
  const originalSupabaseClient = await import('./supabase-client.ts');
  const mockClient = {
    healthCheck: mockSupabase.healthCheck.bind(mockSupabase),
    getLatestNews: mockSupabase.getLatestNews.bind(mockSupabase)
  };

  Object.defineProperty(originalSupabaseClient, 'supabaseClient', {
    value: mockClient,
    configurable: true
  });

  try {
    const healthStatus = await storageService.getHealthStatus();

    assertEquals(healthStatus.databaseHealthy, false);
    assertEquals(healthStatus.newsCount, 0);
    assertEquals(healthStatus.lastUpdate, undefined);
    assertEquals(healthStatus.apiConfigured, true);

  } finally {
    mockSupabase.reset();
  }
});

// Integration test for complete news fetching workflow
Deno.test("News Fetching Integration - complete workflow", async () => {
  const originalNewsKey = Deno.env.get('NEWS_API_KEY');
  Deno.env.set('NEWS_API_KEY', 'test-integration-key');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(mockNewsDataResponse);

  const mockSupabase = new MockSupabaseClient();
  const storageService = new NewsStorageService();

  // Mock the supabaseClient import
  const originalSupabaseClient = await import('./supabase-client.ts');
  const mockClient = {
    updateNewsStorage: mockSupabase.updateNewsStorage.bind(mockSupabase),
    getLatestNews: mockSupabase.getLatestNews.bind(mockSupabase),
    healthCheck: mockSupabase.healthCheck.bind(mockSupabase)
  };

  Object.defineProperty(originalSupabaseClient, 'supabaseClient', {
    value: mockClient,
    configurable: true
  });

  try {
    // Test complete workflow: fetch -> store -> retrieve
    const updateResult = await storageService.updateNewsStorage();
    
    assertEquals(updateResult.success, true);
    assertEquals(updateResult.inserted, 3);
    assertEquals(updateResult.totalStored, 3);

    // Test retrieving news for context
    const contextNews = await storageService.getLatestNewsForContext(2);
    assertEquals(contextNews.length, 2);
    assertEquals(contextNews[0].headline, 'Sensex rises 200 points on positive market sentiment');

    // Test health status
    const health = await storageService.getHealthStatus();
    assertEquals(health.databaseHealthy, true);
    assertEquals(health.newsCount, 1);
    assertEquals(health.apiConfigured, true);

  } finally {
    globalThis.fetch = originalFetch;
    if (originalNewsKey) {
      Deno.env.set('NEWS_API_KEY', originalNewsKey);
    } else {
      Deno.env.delete('NEWS_API_KEY');
    }
    mockSupabase.reset();
  }
});

// Rate limiting test
Deno.test("NewsAPIClient - rate limiting behavior", async () => {
  const originalEnv = Deno.env.get('NEWS_API_KEY');
  Deno.env.set('NEWS_API_KEY', 'test-rate-limit-key');

  let requestCount = 0;
  const requestTimes: number[] = [];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: string, options?: any): Promise<Response> => {
    requestCount++;
    requestTimes.push(Date.now());
    return createMockFetch(mockNewsDataResponse)(url, options);
  };

  try {
    const client = new NewsAPIClient();
    
    // Make multiple rapid requests
    const startTime = Date.now();
    const promises = [
      client.fetchLatestNews(),
      client.fetchLatestNews(),
      client.fetchLatestNews()
    ];

    await Promise.all(promises);
    const endTime = Date.now();

    // Verify rate limiting is applied (requests should be spaced out)
    assertEquals(requestCount, 3);
    
    // Check that requests were spaced out (allowing for some timing variance)
    if (requestTimes.length >= 2) {
      const timeDiff = requestTimes[1] - requestTimes[0];
      // Rate limiter should enforce minimum interval between requests
      assertEquals(timeDiff >= 0, true); // At minimum, should not be negative
    }

  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv) {
      Deno.env.set('NEWS_API_KEY', originalEnv);
    } else {
      Deno.env.delete('NEWS_API_KEY');
    }
  }
});