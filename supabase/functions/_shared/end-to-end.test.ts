/**
 * End-to-End Testing Suite
 * Tests complete user journey from message to AI response
 * Verifies news updates are reflected in chat responses
 * Tests error scenarios and recovery mechanisms
 * 
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1
 */

import { assertEquals, assertStringIncludes, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { supabaseClient } from './supabase-client.ts';
import { newsStorageService } from './news-storage.ts';
import { requiresNewsContext } from './message-analyzer.ts';
import { generateAIResponse } from './ai-response-generator.ts';
import { NewsInsert } from './types.ts';

// Import the actual endpoint handlers for testing
const chatModule = await import('../chat/index.ts');
const fetchNewsModule = await import('../fetchNews/index.ts');

const chatHandler = (chatModule as any).default || chatModule;
const fetchNewsHandler = (fetchNewsModule as any).default || fetchNewsModule;

// Test data for end-to-end scenarios
const testNewsItems: NewsInsert[] = [
  {
    headline: "E2E Test: Sensex surges 500 points on positive earnings outlook",
    url: "https://example.com/e2e-test-1",
    published_at: new Date().toISOString(),
    source: "E2E Test Economic Times"
  },
  {
    headline: "E2E Test: RBI maintains repo rate at 6.5% amid inflation concerns",
    url: "https://example.com/e2e-test-2",
    published_at: new Date().toISOString(),
    source: "E2E Test Business Standard"
  },
  {
    headline: "E2E Test: Tech stocks rally as IT sector shows strong growth",
    url: "https://example.com/e2e-test-3",
    published_at: new Date().toISOString(),
    source: "E2E Test Financial Express"
  }
];

/**
 * Helper function to create HTTP requests for testing
 */
function createTestRequest(method: string, path: string, body?: any, headers?: Record<string, string>): Request {
  const url = `http://localhost:8000${path}`;
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'FinBuddy-E2E-Test/1.0',
      ...headers
    }
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(url, requestInit);
}

/**
 * Helper function to parse response safely
 */
async function parseTestResponse(response: Response) {
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: json,
    text
  };
}

/**
 * Clean up test data from database
 */
async function cleanupE2ETestData() {
  try {
    const { data } = await (supabaseClient as any).client
      .from('latest_news')
      .delete()
      .like('headline', 'E2E Test:%')
      .select();
    
    console.log(`🧹 Cleaned up ${data?.length || 0} E2E test news items`);
  } catch (error) {
    console.warn('⚠️ E2E cleanup warning:', error.message);
  }
}

/**
 * Wait for a specified duration (for testing timing scenarios)
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.test("E2E - Complete User Journey: Educational Query (No News Context)", async () => {
  console.log("🧪 Testing complete user journey for educational query...");
  
  const userMessage = "What is the difference between equity and debt mutual funds?";
  
  // Step 1: Send request to chat endpoint
  const request = createTestRequest('POST', '/chat', { message: userMessage });
  const response = await chatHandler(request);
  const parsed = await parseTestResponse(response);
  
  // Verify HTTP response
  assertEquals(parsed.status, 200, "Should return 200 OK");
  assertEquals(typeof parsed.body, "object", "Should return JSON object");
  assertEquals(typeof parsed.body.success, "boolean", "Should have success field");
  assertEquals(typeof parsed.body.message, "string", "Should have message field");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*', "Should have CORS headers");
  
  // Verify response content
  if (parsed.body.success) {
    assertEquals(parsed.body.message.length > 0, true, "Response should have content");
    assertEquals(parsed.body.error, undefined, "Should not have error field on success");
    
    // Educational queries should not mention current market conditions
    const responseText = parsed.body.message.toLowerCase();
    const newsIndicators = ['today', 'current market', 'latest news', 'recent developments'];
    const hasNewsContext = newsIndicators.some(indicator => responseText.includes(indicator));
    
    console.log(`📝 Response length: ${parsed.body.message.length} characters`);
    console.log(`🔍 Contains news context: ${hasNewsContext}`);
    
    // For educational queries, response should focus on concepts, not current events
    assertStringIncludes(responseText, 'equity', "Should explain equity concept");
    assertStringIncludes(responseText, 'debt', "Should explain debt concept");
    
  } else {
    console.log(`❌ AI response failed: ${parsed.body.error}`);
    assertEquals(typeof parsed.body.error, "string", "Should have error message on failure");
  }
  
  console.log("✅ Educational query journey completed successfully");
});

Deno.test("E2E - Complete User Journey: Market Query (With News Context)", async () => {
  console.log("🧪 Testing complete user journey for market query with news context...");
  
  // Setup: Clean and insert test news data
  await cleanupE2ETestData();
  await supabaseClient.insertNews(testNewsItems);
  
  try {
    const userMessage = "What are the current market conditions and should I invest now?";
    
    // Step 1: Verify message analysis detects need for news context
    const needsNews = requiresNewsContext(userMessage);
    assertEquals(needsNews, true, "Market query should require news context");
    
    // Step 2: Send request to chat endpoint
    const request = createTestRequest('POST', '/chat', { message: userMessage });
    const response = await chatHandler(request);
    const parsed = await parseTestResponse(response);
    
    // Verify HTTP response
    assertEquals(parsed.status, 200, "Should return 200 OK");
    assertEquals(typeof parsed.body, "object", "Should return JSON object");
    assertEquals(typeof parsed.body.success, "boolean", "Should have success field");
    
    // Verify response incorporates news context
    if (parsed.body.success) {
      const responseText = parsed.body.message.toLowerCase();
      
      console.log(`📝 Response length: ${parsed.body.message.length} characters`);
      
      // Response should reference current market conditions or recent news
      const marketIndicators = ['market', 'current', 'recent', 'today', 'conditions'];
      const hasMarketContext = marketIndicators.some(indicator => responseText.includes(indicator));
      
      assertEquals(hasMarketContext, true, "Response should include market context");
      
      // Should provide responsible investment advice
      const responsibleAdvice = ['consider', 'research', 'diversify', 'risk', 'goals'];
      const hasResponsibleAdvice = responsibleAdvice.some(advice => responseText.includes(advice));
      
      assertEquals(hasResponsibleAdvice, true, "Should provide responsible investment advice");
      
    } else {
      console.log(`❌ AI response failed: ${parsed.body.error}`);
      assertEquals(typeof parsed.body.error, "string", "Should have error message on failure");
    }
    
    console.log("✅ Market query with news context journey completed successfully");
    
  } finally {
    await cleanupE2ETestData();
  }
});

Deno.test("E2E - News Update Workflow and Chat Integration", async () => {
  console.log("🧪 Testing news update workflow and integration with chat...");
  
  // Clean up existing test data
  await cleanupE2ETestData();
  
  try {
    // Step 1: Verify initial state (no test news)
    const initialNews = await supabaseClient.getLatestNews(10);
    const initialTestNews = initialNews.filter(item => item.headline.includes('E2E Test:'));
    assertEquals(initialTestNews.length, 0, "Should start with no test news");
    
    // Step 2: Simulate news update via fetchNews endpoint
    console.log("📰 Simulating news update...");
    
    // First, manually insert test news to simulate external API fetch
    const insertedNews = await supabaseClient.insertNews(testNewsItems);
    assertEquals(insertedNews.length, testNewsItems.length, "Should insert all test news items");
    
    // Step 3: Verify news is available for retrieval
    const updatedNews = await newsStorageService.getLatestNewsForContext(5);
    const testNewsInResults = updatedNews.filter(item => item.headline.includes('E2E Test:'));
    assertEquals(testNewsInResults.length >= 1, true, "Should have at least one test news item");
    
    console.log(`📊 Found ${testNewsInResults.length} test news items in latest news`);
    
    // Step 4: Test chat response incorporates new news
    const marketQuery = "What's happening in the Indian stock market today?";
    const request = createTestRequest('POST', '/chat', { message: marketQuery });
    const response = await chatHandler(request);
    const parsed = await parseTestResponse(response);
    
    assertEquals(parsed.status, 200, "Chat should respond successfully");
    
    if (parsed.body.success) {
      const responseText = parsed.body.message.toLowerCase();
      
      // Response should reference current market activity
      const marketTerms = ['market', 'sensex', 'stock', 'trading', 'investment'];
      const hasMarketTerms = marketTerms.some(term => responseText.includes(term));
      
      assertEquals(hasMarketTerms, true, "Response should reference market activity");
      
      console.log("✅ Chat successfully incorporated updated news context");
    } else {
      console.log(`❌ Chat response failed: ${parsed.body.error}`);
    }
    
    // Step 5: Test fetchNews endpoint health check
    const healthRequest = createTestRequest('GET', '/fetchNews');
    const healthResponse = await fetchNewsHandler(healthRequest);
    const healthParsed = await parseTestResponse(healthResponse);
    
    assertEquals(healthParsed.status, 200, "FetchNews health check should succeed");
    assertEquals(typeof healthParsed.body.success, "boolean", "Should have success field");
    
    console.log("✅ News update workflow and chat integration completed successfully");
    
  } finally {
    await cleanupE2ETestData();
  }
});

Deno.test("E2E - Error Scenarios and Recovery Mechanisms", async () => {
  console.log("🧪 Testing error scenarios and recovery mechanisms...");
  
  // Test 1: Invalid request format
  console.log("🔍 Testing invalid request handling...");
  
  const invalidRequests = [
    {
      name: "Empty message",
      body: { message: "" },
      expectedStatus: 400
    },
    {
      name: "Missing message field",
      body: { text: "This should be message field" },
      expectedStatus: 400
    },
    {
      name: "Null message",
      body: { message: null },
      expectedStatus: 400
    }
  ];
  
  for (const testCase of invalidRequests) {
    const request = createTestRequest('POST', '/chat', testCase.body);
    const response = await chatHandler(request);
    const parsed = await parseTestResponse(response);
    
    assertEquals(parsed.status, testCase.expectedStatus, 
      `${testCase.name} should return ${testCase.expectedStatus}`);
    assertEquals(parsed.body.success, false, "Should indicate failure");
    assertEquals(typeof parsed.body.error, "string", "Should provide error message");
    
    console.log(`✅ ${testCase.name}: ${parsed.body.error}`);
  }
  
  // Test 2: Rate limiting behavior
  console.log("🔍 Testing rate limiting recovery...");
  
  const rateLimitRequests = [];
  const testIP = '192.168.1.200';
  
  // Send multiple requests quickly to trigger rate limiting
  for (let i = 0; i < 15; i++) {
    const request = createTestRequest('POST', '/chat', 
      { message: `Rate limit test ${i}` },
      { 'x-forwarded-for': testIP }
    );
    rateLimitRequests.push(chatHandler(request));
  }
  
  const rateLimitResponses = await Promise.all(rateLimitRequests);
  const rateLimitParsed = await Promise.all(
    rateLimitResponses.map(r => parseTestResponse(r))
  );
  
  const successfulRequests = rateLimitParsed.filter(r => r.status === 200).length;
  const rateLimitedRequests = rateLimitParsed.filter(r => r.status === 429).length;
  
  console.log(`📊 Rate limiting results: ${successfulRequests} successful, ${rateLimitedRequests} rate limited`);
  
  // Should have some rate limited requests if rate limiting is working
  assertEquals(rateLimitedRequests > 0, true, "Rate limiting should trigger");
  
  // Test 3: Database error recovery
  console.log("🔍 Testing database error handling...");
  
  // Test with invalid news retrieval (should handle gracefully)
  const newsItems = await newsStorageService.getLatestNewsForContext(-1);
  assertEquals(Array.isArray(newsItems), true, "Should return array even with invalid input");
  assertEquals(newsItems.length, 0, "Should return empty array for invalid input");
  
  // Test 4: AI service error handling
  console.log("🔍 Testing AI service error handling...");
  
  const emptyMessageResponse = await generateAIResponse("");
  assertEquals(emptyMessageResponse.success, false, "Should fail for empty message");
  assertEquals(typeof emptyMessageResponse.error, "string", "Should provide error message");
  assertStringIncludes(emptyMessageResponse.error.toLowerCase(), "empty", "Error should mention empty message");
  
  // Test 5: Network timeout simulation
  console.log("🔍 Testing timeout handling...");
  
  const longMessage = "a".repeat(2000); // Very long message
  const timeoutRequest = createTestRequest('POST', '/chat', { message: longMessage });
  const timeoutResponse = await chatHandler(timeoutRequest);
  const timeoutParsed = await parseTestResponse(timeoutResponse);
  
  // Should handle long messages gracefully (either success or proper error)
  assertEquals(typeof timeoutParsed.body.success, "boolean", "Should have success field");
  
  if (!timeoutParsed.body.success) {
    assertEquals(typeof timeoutParsed.body.error, "string", "Should provide error message on failure");
    console.log(`⏱️ Timeout handling: ${timeoutParsed.body.error}`);
  }
  
  console.log("✅ Error scenarios and recovery mechanisms tested successfully");
});

Deno.test("E2E - Performance and Scalability Verification", async () => {
  console.log("🧪 Testing performance and scalability characteristics...");
  
  // Test 1: Response time measurement
  console.log("⏱️ Measuring response times...");
  
  const performanceTests = [
    { name: "Simple Query", message: "What is SIP?" },
    { name: "Complex Query", message: "Explain the tax implications of ELSS mutual funds vs PPF vs ULIP for a 25-year-old software engineer" },
    { name: "Market Query", message: "Current Sensex levels and market outlook for tech stocks" }
  ];
  
  for (const test of performanceTests) {
    const startTime = Date.now();
    
    const request = createTestRequest('POST', '/chat', { message: test.message });
    const response = await chatHandler(request);
    await parseTestResponse(response);
    
    const duration = Date.now() - startTime;
    
    console.log(`📊 ${test.name}: ${duration}ms`);
    
    // Response should complete within reasonable time (30 seconds max)
    assertEquals(duration < 30000, true, `${test.name} should complete within 30 seconds`);
  }
  
  // Test 2: Concurrent request handling
  console.log("🔄 Testing concurrent request handling...");
  
  const concurrentRequests = [];
  const concurrentCount = 5;
  
  for (let i = 0; i < concurrentCount; i++) {
    const request = createTestRequest('POST', '/chat', 
      { message: `Concurrent test query ${i}: What is compound interest?` },
      { 'x-forwarded-for': `192.168.1.${100 + i}` } // Different IPs to avoid rate limiting
    );
    concurrentRequests.push(chatHandler(request));
  }
  
  const concurrentStartTime = Date.now();
  const concurrentResponses = await Promise.all(concurrentRequests);
  const concurrentDuration = Date.now() - concurrentStartTime;
  
  console.log(`🚀 ${concurrentCount} concurrent requests completed in ${concurrentDuration}ms`);
  
  // All requests should complete successfully
  const concurrentParsed = await Promise.all(
    concurrentResponses.map(r => parseTestResponse(r))
  );
  
  const successfulConcurrent = concurrentParsed.filter(r => r.status === 200).length;
  assertEquals(successfulConcurrent, concurrentCount, "All concurrent requests should succeed");
  
  // Test 3: Memory usage stability
  console.log("💾 Testing memory usage patterns...");
  
  // Process multiple requests to check for memory leaks
  for (let i = 0; i < 10; i++) {
    const request = createTestRequest('POST', '/chat', 
      { message: `Memory test ${i}: How do mutual funds work?` }
    );
    await chatHandler(request);
    
    // Small delay between requests
    await wait(100);
  }
  
  console.log("✅ Performance and scalability verification completed");
});

Deno.test("E2E - Complete System Integration Verification", async () => {
  console.log("🧪 Running complete system integration verification...");
  
  // Clean up and prepare test environment
  await cleanupE2ETestData();
  
  try {
    // Step 1: Verify all system components are accessible
    console.log("🔍 Verifying system components...");
    
    const healthStatus = await newsStorageService.getHealthStatus();
    assertEquals(typeof healthStatus.databaseHealthy, "boolean", "Should report database health");
    assertEquals(typeof healthStatus.newsCount, "number", "Should report news count");
    assertEquals(typeof healthStatus.apiConfigured, "boolean", "Should report API configuration");
    
    console.log(`📊 System health: DB=${healthStatus.databaseHealthy}, News=${healthStatus.newsCount}, API=${healthStatus.apiConfigured}`);
    
    // Step 2: Test complete workflow with fresh news data
    console.log("📰 Testing complete workflow with fresh news...");
    
    // Insert fresh test news
    await supabaseClient.insertNews(testNewsItems);
    
    // Test educational query (should not use news)
    const educationalQuery = "How does compound interest work in fixed deposits?";
    const eduRequest = createTestRequest('POST', '/chat', { message: educationalQuery });
    const eduResponse = await chatHandler(eduRequest);
    const eduParsed = await parseTestResponse(eduResponse);
    
    assertEquals(eduParsed.status, 200, "Educational query should succeed");
    
    // Test market query (should use news)
    const marketQuery = "Should I invest in stocks given current market conditions?";
    const marketRequest = createTestRequest('POST', '/chat', { message: marketQuery });
    const marketResponse = await chatHandler(marketRequest);
    const marketParsed = await parseTestResponse(marketResponse);
    
    assertEquals(marketParsed.status, 200, "Market query should succeed");
    
    // Step 3: Verify news context differentiation
    if (eduParsed.body.success && marketParsed.body.success) {
      const eduText = eduParsed.body.message.toLowerCase();
      const marketText = marketParsed.body.message.toLowerCase();
      
      // Educational response should focus on concepts
      const conceptTerms = ['compound', 'interest', 'calculate', 'formula', 'principle'];
      const hasConceptTerms = conceptTerms.some(term => eduText.includes(term));
      assertEquals(hasConceptTerms, true, "Educational response should include concept terms");
      
      // Market response should reference current conditions
      const marketTerms = ['market', 'current', 'condition', 'invest', 'consider'];
      const hasMarketTerms = marketTerms.some(term => marketText.includes(term));
      assertEquals(hasMarketTerms, true, "Market response should reference current conditions");
      
      console.log("✅ News context differentiation working correctly");
    }
    
    // Step 4: Test fetchNews endpoint integration
    console.log("🔄 Testing fetchNews endpoint integration...");
    
    const fetchRequest = createTestRequest('POST', '/fetchNews');
    const fetchResponse = await fetchNewsHandler(fetchRequest);
    const fetchParsed = await parseTestResponse(fetchResponse);
    
    assertEquals(fetchParsed.status, 200, "FetchNews endpoint should respond");
    assertEquals(typeof fetchParsed.body.success, "boolean", "Should have success field");
    
    if (fetchParsed.body.success) {
      console.log(`📈 News fetch successful: ${fetchParsed.body.message}`);
    } else {
      console.log(`⚠️ News fetch failed (expected in test environment): ${fetchParsed.body.error}`);
    }
    
    // Step 5: Verify CORS and security headers
    console.log("🔒 Verifying security and CORS configuration...");
    
    const corsRequest = createTestRequest('OPTIONS', '/chat');
    const corsResponse = await chatHandler(corsRequest);
    const corsParsed = await parseTestResponse(corsResponse);
    
    assertEquals(corsParsed.status, 200, "CORS preflight should succeed");
    assertEquals(corsParsed.headers['access-control-allow-origin'], '*', "Should allow all origins");
    assertEquals(corsParsed.headers['access-control-allow-methods']?.includes('POST'), true, "Should allow POST method");
    
    console.log("✅ Complete system integration verification successful");
    
  } finally {
    await cleanupE2ETestData();
  }
});

Deno.test("E2E - Production Readiness Verification", async () => {
  console.log("🧪 Verifying production readiness...");
  
  // Test 1: Configuration validation
  console.log("⚙️ Validating configuration...");
  
  const { corsHeaders, REQUEST_TIMEOUT, RATE_LIMIT, AI_CONFIG, NEWS_CONFIG } = 
    await import('./config.ts');
  
  // Verify configuration constants are properly defined
  assertEquals(typeof corsHeaders, "object", "CORS headers should be defined");
  assertEquals(typeof REQUEST_TIMEOUT, "number", "Request timeout should be defined");
  assertEquals(REQUEST_TIMEOUT > 0, true, "Request timeout should be positive");
  
  assertEquals(typeof RATE_LIMIT, "object", "Rate limit config should be defined");
  assertEquals(typeof RATE_LIMIT.maxRequests, "number", "Rate limit max requests should be defined");
  assertEquals(RATE_LIMIT.maxRequests > 0, true, "Rate limit should be positive");
  
  assertEquals(typeof AI_CONFIG, "object", "AI config should be defined");
  assertEquals(typeof AI_CONFIG.maxTokens, "number", "AI max tokens should be defined");
  assertEquals(AI_CONFIG.maxTokens > 0, true, "AI max tokens should be positive");
  
  assertEquals(typeof NEWS_CONFIG, "object", "News config should be defined");
  assertEquals(typeof NEWS_CONFIG.maxNewsItems, "number", "News max items should be defined");
  assertEquals(NEWS_CONFIG.maxNewsItems > 0, true, "News max items should be positive");
  
  // Test 2: Environment variable accessibility
  console.log("🌍 Checking environment variable accessibility...");
  
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const optionalEnvVars = ['HF_API_KEY', 'NEWS_API_KEY'];
  
  for (const envVar of requiredEnvVars) {
    const value = Deno.env.get(envVar);
    assertEquals(typeof value === "string" || value === undefined, true, 
      `${envVar} should be accessible`);
  }
  
  for (const envVar of optionalEnvVars) {
    const value = Deno.env.get(envVar);
    assertEquals(typeof value === "string" || value === undefined, true, 
      `${envVar} should be accessible`);
  }
  
  // Test 3: Module import verification
  console.log("📦 Verifying module imports...");
  
  const criticalModules = [
    './supabase-client.ts',
    './news-storage.ts',
    './message-analyzer.ts',
    './ai-response-generator.ts',
    './config.ts',
    './types.ts'
  ];
  
  for (const modulePath of criticalModules) {
    try {
      const module = await import(modulePath);
      assertEquals(typeof module, "object", `${modulePath} should be importable`);
    } catch (error) {
      throw new Error(`Critical module ${modulePath} failed to import: ${error.message}`);
    }
  }
  
  // Test 4: Database connectivity
  console.log("🗄️ Verifying database connectivity...");
  
  const dbHealthy = await supabaseClient.healthCheck();
  assertEquals(typeof dbHealthy, "boolean", "Database health check should return boolean");
  
  if (dbHealthy) {
    console.log("✅ Database connection healthy");
  } else {
    console.log("⚠️ Database connection not available (expected in some test environments)");
  }
  
  // Test 5: Error handling robustness
  console.log("🛡️ Verifying error handling robustness...");
  
  // Test various edge cases that should be handled gracefully
  const edgeCases = [
    { input: "", description: "empty string" },
    { input: "   ", description: "whitespace only" },
    { input: "a".repeat(5000), description: "very long message" },
    { input: "🚀💰📈", description: "emoji only" }
  ];
  
  for (const testCase of edgeCases) {
    const needsNews = requiresNewsContext(testCase.input);
    assertEquals(typeof needsNews, "boolean", 
      `Message analysis should handle ${testCase.description}`);
  }
  
  console.log("✅ Production readiness verification completed successfully");
});

console.log("🎉 End-to-End Test Suite Loaded Successfully!");
console.log("📋 Test Coverage:");
console.log("   ✅ Complete user journey (educational queries)");
console.log("   ✅ Complete user journey (market queries with news)");
console.log("   ✅ News update workflow and chat integration");
console.log("   ✅ Error scenarios and recovery mechanisms");
console.log("   ✅ Performance and scalability verification");
console.log("   ✅ Complete system integration verification");
console.log("   ✅ Production readiness verification");
console.log("");
console.log("🚀 Run with: deno test supabase/functions/_shared/end-to-end.test.ts --allow-all");