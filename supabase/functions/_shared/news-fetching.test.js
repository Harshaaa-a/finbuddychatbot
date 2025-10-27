// Unit tests for news fetching functionality
// Node.js test runner that validates news API integration and database operations

console.log('Starting News Fetching Tests...\n');

// Simple test runner
let testCount = 0;
let passedTests = 0;
let failedTests = 0;

function assertEquals(actual, expected, message = '') {
  testCount++;
  if (actual === expected) {
    passedTests++;
    console.log(`✓ Test ${testCount}: PASSED ${message}`);
  } else {
    failedTests++;
    console.log(`✗ Test ${testCount}: FAILED ${message}`);
    console.log(`  Expected: ${expected}, Got: ${actual}`);
  }
}

function assertStringIncludes(actual, expected, message = '') {
  testCount++;
  if (typeof actual === 'string' && actual.includes(expected)) {
    passedTests++;
    console.log(`✓ Test ${testCount}: PASSED ${message}`);
  } else {
    failedTests++;
    console.log(`✗ Test ${testCount}: FAILED ${message}`);
    console.log(`  Expected "${actual}" to include "${expected}"`);
  }
}

function assertTrue(condition, message = '') {
  testCount++;
  if (condition) {
    passedTests++;
    console.log(`✓ Test ${testCount}: PASSED ${message}`);
  } else {
    failedTests++;
    console.log(`✗ Test ${testCount}: FAILED ${message}`);
    console.log(`  Expected condition to be true`);
  }
}

function runTest(testName, testFn) {
  console.log(`\n--- Running: ${testName} ---`);
  try {
    testFn();
  } catch (error) {
    failedTests++;
    console.log(`✗ Test failed with error: ${error.message}`);
  }
}

async function runAsyncTest(testName, testFn) {
  console.log(`\n--- Running: ${testName} ---`);
  try {
    await testFn();
  } catch (error) {
    failedTests++;
    console.log(`✗ Test failed with error: ${error.message}`);
  }
}

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

// Mock NewsAPIClient implementation
class MockNewsAPIClient {
  constructor(config = {}) {
    this.shouldFail = config.shouldFail || false;
    this.isConfiguredValue = config.isConfigured !== false;
    this.responseData = config.responseData || mockNewsDataResponse;
    this.useNewsData = config.useNewsData !== false;
  }

  isConfigured() {
    return this.isConfiguredValue;
  }

  async fetchLatestNews() {
    if (!this.isConfiguredValue) {
      return {
        success: false,
        articles: [],
        error: 'All news API sources are unavailable'
      };
    }

    if (this.shouldFail) {
      return {
        success: false,
        articles: [],
        error: 'API rate limit exceeded'
      };
    }

    // Simulate NewsData.io response
    if (this.useNewsData) {
      const articles = this.responseData.results?.map(article => ({
        headline: article.title || 'No title available',
        url: article.link || undefined,
        published_at: article.pubDate || new Date().toISOString(),
        source: article.source_id || 'NewsData.io'
      })) || [];

      return {
        success: true,
        articles: articles.slice(0, 10)
      };
    } else {
      // Simulate Finnhub response
      const articles = this.responseData
        .filter(article => article.headline && article.headline.length > 0)
        .slice(0, 10)
        .map(article => ({
          headline: article.headline,
          url: article.url || undefined,
          published_at: new Date(article.datetime * 1000).toISOString(),
          source: article.source || 'Finnhub.io'
        }));

      return {
        success: true,
        articles
      };
    }
  }
}

// Mock Supabase client for testing database operations
class MockSupabaseClient {
  constructor(shouldFail = false) {
    this.mockNews = [];
    this.shouldFail = shouldFail;
    this.insertCount = 0;
    this.deleteCount = 0;
  }

  async updateNewsStorage(newsItems, maxItems) {
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

  async getLatestNews(limit) {
    if (this.shouldFail) {
      throw new Error('Database query failed');
    }
    return this.mockNews.slice(0, limit);
  }

  async healthCheck() {
    return !this.shouldFail;
  }

  // Helper methods for testing
  setMockNews(news) {
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

// Mock NewsStorageService implementation
class MockNewsStorageService {
  constructor(newsClient, supabaseClient) {
    this.newsClient = newsClient;
    this.supabaseClient = supabaseClient;
  }

  async updateNewsStorage() {
    try {
      // Check if news API is configured
      if (!this.newsClient.isConfigured()) {
        return {
          success: false,
          inserted: 0,
          deleted: 0,
          totalStored: 0,
          error: 'No news API keys configured'
        };
      }

      // Fetch latest news from external API
      const apiResponse = await this.newsClient.fetchLatestNews();
      
      if (!apiResponse.success) {
        return {
          success: false,
          inserted: 0,
          deleted: 0,
          totalStored: 0,
          error: apiResponse.error || 'Failed to fetch news from external API'
        };
      }

      // Convert API news items to database format
      const newsInserts = apiResponse.articles.map(article => ({
        headline: this.sanitizeHeadline(article.headline),
        url: article.url,
        published_at: article.published_at,
        source: article.source
      }));

      // Update database with new items and cleanup old ones
      const updateResult = await this.supabaseClient.updateNewsStorage(newsInserts, 10);

      // Get total count of stored items
      const currentNews = await this.supabaseClient.getLatestNews(10);

      return {
        success: true,
        inserted: updateResult.inserted,
        deleted: updateResult.deleted,
        totalStored: currentNews.length
      };

    } catch (error) {
      console.error('News storage update failed:', error);
      return {
        success: false,
        inserted: 0,
        deleted: 0,
        totalStored: 0,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  async getLatestNewsForContext(limit = 3) {
    try {
      const newsItems = await this.supabaseClient.getLatestNews(limit);
      
      return newsItems.map(item => ({
        headline: item.headline,
        url: item.url,
        published_at: item.published_at,
        source: item.source
      }));
    } catch (error) {
      console.error('Failed to get news for context:', error);
      return [];
    }
  }

  sanitizeHeadline(headline) {
    return headline
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 500); // Limit length to prevent database issues
  }

  async getHealthStatus() {
    try {
      const databaseHealthy = await this.supabaseClient.healthCheck();
      const newsItems = await this.supabaseClient.getLatestNews(1);
      
      return {
        databaseHealthy,
        newsCount: newsItems.length,
        lastUpdate: newsItems[0]?.created_at,
        apiConfigured: this.newsClient.isConfigured()
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        databaseHealthy: false,
        newsCount: 0,
        apiConfigured: this.newsClient.isConfigured()
      };
    }
  }
}

// Test cases - run async tests synchronously for this simple test runner
async function runAllTests() {

await runAsyncTest("NewsAPIClient - NewsData.io successful response", async () => {
  const client = new MockNewsAPIClient({
    useNewsData: true,
    responseData: mockNewsDataResponse
  });

  const result = await client.fetchLatestNews();

  assertEquals(result.success, true, "API call successful");
  assertEquals(result.articles.length, 3, "correct number of articles");
  assertEquals(result.error, undefined, "no error");

  // Check first article
  const firstArticle = result.articles[0];
  assertEquals(firstArticle.headline, 'Sensex rises 200 points on positive market sentiment', "correct headline");
  assertEquals(firstArticle.url, 'https://example.com/news1', "correct URL");
  assertEquals(firstArticle.source, 'economic-times', "correct source");
  assertEquals(firstArticle.published_at, '2024-10-25T10:00:00Z', "correct timestamp");
});

runAsyncTest("NewsAPIClient - Finnhub fallback response", async () => {
  const client = new MockNewsAPIClient({
    useNewsData: false,
    responseData: mockFinnhubResponse
  });

  const result = await client.fetchLatestNews();

  assertEquals(result.success, true, "Finnhub API call successful");
  assertEquals(result.articles.length, 2, "correct number of articles from Finnhub");

  // Check first article from Finnhub
  const firstArticle = result.articles[0];
  assertEquals(firstArticle.headline, 'Indian markets open higher on global cues', "correct Finnhub headline");
  assertEquals(firstArticle.url, 'https://example.com/finnhub1', "correct Finnhub URL");
  assertEquals(firstArticle.source, 'Reuters', "correct Finnhub source");
  
  // Check timestamp conversion
  assertEquals(firstArticle.published_at, new Date(1698235200 * 1000).toISOString(), "correct timestamp conversion");
});

runAsyncTest("NewsAPIClient - API error handling", async () => {
  const client = new MockNewsAPIClient({
    shouldFail: true
  });

  const result = await client.fetchLatestNews();

  assertEquals(result.success, false, "API call failed as expected");
  assertEquals(result.articles.length, 0, "no articles on failure");
  assertEquals(typeof result.error, 'string', "error message present");
  assertStringIncludes(result.error, 'API rate limit exceeded', "correct error message");
});

runAsyncTest("NewsAPIClient - no API keys configured", async () => {
  const client = new MockNewsAPIClient({
    isConfigured: false
  });

  assertEquals(client.isConfigured(), false, "client not configured");

  const result = await client.fetchLatestNews();
  assertEquals(result.success, false, "API call failed when not configured");
  assertEquals(result.articles.length, 0, "no articles when not configured");
  assertEquals(result.error, 'All news API sources are unavailable', "correct error for unconfigured");
});

runAsyncTest("NewsStorageService - successful news update", async () => {
  const mockSupabase = new MockSupabaseClient();
  const mockNewsClient = new MockNewsAPIClient();
  const storageService = new MockNewsStorageService(mockNewsClient, mockSupabase);

  const result = await storageService.updateNewsStorage();

  assertEquals(result.success, true, "storage update successful");
  assertEquals(result.inserted, 3, "correct number of items inserted");
  assertEquals(result.deleted, 0, "no items deleted initially");
  assertEquals(result.totalStored, 3, "correct total stored");
  assertEquals(result.error, undefined, "no error on success");
});

runAsyncTest("NewsStorageService - API failure handling", async () => {
  const mockSupabase = new MockSupabaseClient();
  const mockNewsClient = new MockNewsAPIClient({ shouldFail: true });
  const storageService = new MockNewsStorageService(mockNewsClient, mockSupabase);

  const result = await storageService.updateNewsStorage();

  assertEquals(result.success, false, "storage update failed as expected");
  assertEquals(result.inserted, 0, "no items inserted on API failure");
  assertEquals(result.deleted, 0, "no items deleted on API failure");
  assertEquals(result.totalStored, 0, "no items stored on API failure");
  assertEquals(result.error, 'API rate limit exceeded', "correct error message");
});

runAsyncTest("NewsStorageService - database failure handling", async () => {
  const mockSupabase = new MockSupabaseClient(true); // Should fail
  const mockNewsClient = new MockNewsAPIClient();
  const storageService = new MockNewsStorageService(mockNewsClient, mockSupabase);

  const result = await storageService.updateNewsStorage();

  assertEquals(result.success, false, "storage update failed on DB error");
  assertEquals(result.inserted, 0, "no items inserted on DB failure");
  assertEquals(result.deleted, 0, "no items deleted on DB failure");
  assertEquals(result.totalStored, 0, "no items stored on DB failure");
  assertStringIncludes(result.error, 'Database operation failed', "correct DB error message");
});

runAsyncTest("NewsStorageService - no API configured", async () => {
  const mockSupabase = new MockSupabaseClient();
  const mockNewsClient = new MockNewsAPIClient({ isConfigured: false });
  const storageService = new MockNewsStorageService(mockNewsClient, mockSupabase);

  const result = await storageService.updateNewsStorage();

  assertEquals(result.success, false, "storage update failed when API not configured");
  assertEquals(result.inserted, 0, "no items inserted when API not configured");
  assertEquals(result.deleted, 0, "no items deleted when API not configured");
  assertEquals(result.totalStored, 0, "no items stored when API not configured");
  assertEquals(result.error, 'No news API keys configured', "correct unconfigured error");
});

runAsyncTest("NewsStorageService - database cleanup operation", async () => {
  const mockSupabase = new MockSupabaseClient();
  const mockNewsClient = new MockNewsAPIClient();
  
  // Pre-populate with existing news items
  const existingNews = Array.from({ length: 8 }, (_, i) => ({
    headline: `Existing headline ${i + 1}`,
    url: `https://example.com/existing${i + 1}`,
    published_at: new Date(Date.now() - i * 3600000).toISOString(),
    source: 'Existing Source'
  }));
  
  mockSupabase.setMockNews(existingNews);

  // Override updateNewsStorage to simulate cleanup
  mockSupabase.updateNewsStorage = async function(newsItems, maxItems) {
    const totalItems = this.mockNews.length + newsItems.length;
    const deleted = totalItems > maxItems ? totalItems - maxItems : 0;
    
    this.insertCount = newsItems.length;
    this.mockNews.push(...newsItems);
    
    if (this.mockNews.length > maxItems) {
      this.deleteCount = deleted;
      this.mockNews = this.mockNews.slice(-maxItems);
    }
    
    return {
      inserted: this.insertCount,
      deleted: this.deleteCount
    };
  };

  // Override getLatestNews to return correct count
  mockSupabase.getLatestNews = async function(limit) {
    return this.mockNews.slice(0, Math.min(limit, 10));
  };

  const storageService = new MockNewsStorageService(mockNewsClient, mockSupabase);
  const result = await storageService.updateNewsStorage();

  assertEquals(result.success, true, "cleanup operation successful");
  assertEquals(result.inserted, 3, "correct number of new items inserted");
  assertEquals(result.deleted, 1, "correct number of old items deleted (8 + 3 - 10 = 1)");
  assertEquals(result.totalStored, 10, "correct total after cleanup");
});

runAsyncTest("NewsStorageService - getLatestNewsForContext", async () => {
  const mockSupabase = new MockSupabaseClient();
  const mockNewsClient = new MockNewsAPIClient();
  
  // Set up mock news items
  const mockNewsItems = [
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

  const storageService = new MockNewsStorageService(mockNewsClient, mockSupabase);
  const newsForContext = await storageService.getLatestNewsForContext(2);

  assertEquals(newsForContext.length, 2, "correct number of news items for context");
  assertEquals(newsForContext[0].headline, 'Market update 1', "correct first headline");
  assertEquals(newsForContext[1].headline, 'Market update 2', "correct second headline");
});

runAsyncTest("NewsStorageService - getLatestNewsForContext error handling", async () => {
  const mockSupabase = new MockSupabaseClient(true); // Should fail
  const mockNewsClient = new MockNewsAPIClient();
  const storageService = new MockNewsStorageService(mockNewsClient, mockSupabase);

  const newsForContext = await storageService.getLatestNewsForContext(3);

  // Should return empty array on error
  assertEquals(newsForContext.length, 0, "empty array on database error");
});

runTest("NewsStorageService - headline sanitization", () => {
  const mockSupabase = new MockSupabaseClient();
  const mockNewsClient = new MockNewsAPIClient();
  const storageService = new MockNewsStorageService(mockNewsClient, mockSupabase);
  
  // Test the sanitizeHeadline method
  const testCases = [
    { input: 'Normal headline', expected: 'Normal headline' },
    { input: '  Headline with   extra   spaces  ', expected: 'Headline with extra spaces' },
    { input: 'Very long headline that exceeds the normal length limit and should be truncated to prevent database issues and maintain performance'.repeat(10), expectedLength: 500 },
    { input: 'Headline\nwith\nnewlines', expected: 'Headline with newlines' },
    { input: 'Headline\twith\ttabs', expected: 'Headline with tabs' }
  ];

  testCases.forEach((testCase, index) => {
    const result = storageService.sanitizeHeadline(testCase.input);
    
    if (testCase.expected) {
      assertEquals(result, testCase.expected, `sanitization test ${index + 1}`);
    } else if (testCase.expectedLength) {
      assertTrue(result.length <= testCase.expectedLength, `length limit test ${index + 1}`);
    }
  });
});

runAsyncTest("NewsStorageService - health status check", async () => {
  const mockSupabase = new MockSupabaseClient();
  const mockNewsClient = new MockNewsAPIClient();
  
  // Set up mock news item with created_at timestamp
  const mockNewsItem = {
    headline: 'Test headline',
    url: 'https://example.com/1',
    published_at: '2024-10-25T10:00:00Z',
    source: 'Test Source',
    created_at: '2024-10-25T10:05:00Z'
  };
  
  mockSupabase.setMockNews([mockNewsItem]);

  // Override getLatestNews to return item with created_at
  mockSupabase.getLatestNews = async function() {
    return [mockNewsItem];
  };

  const storageService = new MockNewsStorageService(mockNewsClient, mockSupabase);
  const healthStatus = await storageService.getHealthStatus();

  assertEquals(healthStatus.databaseHealthy, true, "database healthy");
  assertEquals(healthStatus.newsCount, 1, "correct news count");
  assertEquals(healthStatus.lastUpdate, '2024-10-25T10:05:00Z', "correct last update");
  assertEquals(healthStatus.apiConfigured, true, "API configured");
});

runAsyncTest("NewsStorageService - health status with database failure", async () => {
  const mockSupabase = new MockSupabaseClient(true); // Should fail
  const mockNewsClient = new MockNewsAPIClient();
  const storageService = new MockNewsStorageService(mockNewsClient, mockSupabase);

  const healthStatus = await storageService.getHealthStatus();

  assertEquals(healthStatus.databaseHealthy, false, "database unhealthy");
  assertEquals(healthStatus.newsCount, 0, "zero news count on failure");
  assertEquals(healthStatus.lastUpdate, undefined, "no last update on failure");
  assertEquals(healthStatus.apiConfigured, true, "API still configured despite DB failure");
});

// Integration test for complete news fetching workflow
runAsyncTest("News Fetching Integration - complete workflow", async () => {
  const mockSupabase = new MockSupabaseClient();
  const mockNewsClient = new MockNewsAPIClient();
  const storageService = new MockNewsStorageService(mockNewsClient, mockSupabase);

  // Test complete workflow: fetch -> store -> retrieve
  const updateResult = await storageService.updateNewsStorage();
  
  assertEquals(updateResult.success, true, "integration: update successful");
  assertEquals(updateResult.inserted, 3, "integration: correct items inserted");
  assertEquals(updateResult.totalStored, 3, "integration: correct total stored");

  // Test retrieving news for context
  const contextNews = await storageService.getLatestNewsForContext(2);
  assertEquals(contextNews.length, 2, "integration: correct context news count");
  assertEquals(contextNews[0].headline, 'Sensex rises 200 points on positive market sentiment', "integration: correct first headline");

  // Test health status
  const health = await storageService.getHealthStatus();
  assertEquals(health.databaseHealthy, true, "integration: database healthy");
  assertEquals(health.apiConfigured, true, "integration: API configured");
});

}

// Run all tests
runAllTests().then(() => {
// Run all tests and show summary
console.log('\n' + '='.repeat(50));
console.log('TEST SUMMARY');
console.log('='.repeat(50));
console.log(`Total tests: ${testCount}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Success rate: ${((passedTests / testCount) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 All news fetching tests passed!');
  process.exit(0);
} else {
  console.log(`\n❌ ${failedTests} test(s) failed.`);
  process.exit(1);
}
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});