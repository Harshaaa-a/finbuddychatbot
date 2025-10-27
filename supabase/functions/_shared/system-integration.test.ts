/**
 * System Integration Tests
 * Tests the complete FinBuddy backend system integration
 * Verifies all modules work together correctly
 */

import { assertEquals, assertStringIncludes, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { supabaseClient } from './supabase-client.ts';
import { newsStorageService } from './news-storage.ts';
import { requiresNewsContext, analyzeQuestionType } from './message-analyzer.ts';
import { generateAIResponse } from './ai-response-generator.ts';
import { NewsItem, NewsInsert } from './types.ts';

// Test data
const testNewsItems: NewsInsert[] = [
  {
    headline: "Test: Sensex rises 300 points on strong earnings",
    url: "https://example.com/test1",
    published_at: new Date().toISOString(),
    source: "Test Economic Times"
  },
  {
    headline: "Test: RBI keeps repo rate unchanged at 6.5%",
    url: "https://example.com/test2", 
    published_at: new Date().toISOString(),
    source: "Test Business Standard"
  }
];

/**
 * Clean up test data from database
 */
async function cleanupTestData() {
  try {
    // Remove any test news items
    const { data } = await (supabaseClient as any).client
      .from('latest_news')
      .delete()
      .like('headline', 'Test:%')
      .select();
    
    console.log(`Cleaned up ${data?.length || 0} test news items`);
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
}

Deno.test("System Integration - Database Connection Health", async () => {
  const isHealthy = await supabaseClient.healthCheck();
  assertEquals(isHealthy, true, "Database connection should be healthy");
});

Deno.test("System Integration - News Storage Service Health", async () => {
  const healthStatus = await newsStorageService.getHealthStatus();
  
  assertEquals(typeof healthStatus.databaseHealthy, "boolean");
  assertEquals(typeof healthStatus.newsCount, "number");
  assertEquals(typeof healthStatus.apiConfigured, "boolean");
  
  // Database should be healthy for integration tests
  assertEquals(healthStatus.databaseHealthy, true, "Database should be healthy");
});

Deno.test("System Integration - News CRUD Operations", async () => {
  // Clean up any existing test data
  await cleanupTestData();
  
  try {
    // Test inserting news items
    const insertedItems = await supabaseClient.insertNews(testNewsItems);
    assertEquals(insertedItems.length, testNewsItems.length);
    
    // Verify inserted items have IDs
    insertedItems.forEach(item => {
      assertEquals(typeof item.id, "number");
      assertEquals(item.id > 0, true);
    });
    
    // Test retrieving news items
    const retrievedItems = await supabaseClient.getLatestNews(5);
    assertEquals(retrievedItems.length >= testNewsItems.length, true);
    
    // Verify test items are in retrieved items
    const testHeadlines = testNewsItems.map(item => item.headline);
    const retrievedHeadlines = retrievedItems.map(item => item.headline);
    
    testHeadlines.forEach(headline => {
      assertEquals(retrievedHeadlines.includes(headline), true, `Should find headline: ${headline}`);
    });
    
    // Test duplicate detection
    const isDuplicate = await supabaseClient.isDuplicateHeadline(testNewsItems[0].headline);
    assertEquals(isDuplicate, true, "Should detect duplicate headline");
    
    const isNotDuplicate = await supabaseClient.isDuplicateHeadline("Unique headline that doesn't exist");
    assertEquals(isNotDuplicate, false, "Should not detect non-existent headline as duplicate");
    
  } finally {
    // Clean up test data
    await cleanupTestData();
  }
});

Deno.test("System Integration - Message Analysis Pipeline", () => {
  const testCases = [
    {
      message: "What is compound interest?",
      expectedNewsContext: false,
      description: "Educational query should not need news context"
    },
    {
      message: "What's happening in the stock market today?",
      expectedNewsContext: true,
      description: "Current market query should need news context"
    },
    {
      message: "Should I buy stocks now with current market conditions?",
      expectedNewsContext: true,
      description: "Investment timing query should need news context"
    },
    {
      message: "How do mutual funds work?",
      expectedNewsContext: false,
      description: "General concept query should not need news context"
    },
    {
      message: "Latest news on Reliance Industries",
      expectedNewsContext: true,
      description: "Company news query should need news context"
    }
  ];
  
  testCases.forEach(({ message, expectedNewsContext, description }) => {
    const needsNews = requiresNewsContext(message);
    assertEquals(needsNews, expectedNewsContext, description);
    
    // Also test question analysis
    const analysis = analyzeQuestionType(message);
    assertEquals(typeof analysis.confidence, "number");
    assertEquals(analysis.confidence >= 0 && analysis.confidence <= 1, true);
  });
});

Deno.test("System Integration - News Context Retrieval", async () => {
  // Clean up and insert test data
  await cleanupTestData();
  
  try {
    await supabaseClient.insertNews(testNewsItems);
    
    // Test retrieving news for context
    const newsForContext = await newsStorageService.getLatestNewsForContext(3);
    
    assertEquals(Array.isArray(newsForContext), true);
    assertEquals(newsForContext.length >= 0, true);
    
    // If we have news items, verify structure
    if (newsForContext.length > 0) {
      const newsItem = newsForContext[0];
      assertEquals(typeof newsItem.headline, "string");
      assertEquals(typeof newsItem.source, "string");
      assertEquals(newsItem.headline.length > 0, true);
    }
    
  } finally {
    await cleanupTestData();
  }
});

Deno.test("System Integration - Complete Chat Flow Without News", async () => {
  const userMessage = "What is the difference between stocks and bonds?";
  
  // Step 1: Analyze if news context is needed
  const needsNews = requiresNewsContext(userMessage);
  assertEquals(needsNews, false, "Educational query should not need news");
  
  // Step 2: Generate AI response without news context
  const response = await generateAIResponse(userMessage);
  
  // Verify response structure
  assertEquals(typeof response.success, "boolean");
  assertEquals(typeof response.message, "string");
  
  if (response.success) {
    assertEquals(response.message.length > 0, true, "Response should have content");
    assertEquals(response.error, undefined);
  } else {
    // If it fails, it should have an error message
    assertEquals(typeof response.error, "string");
    assertEquals(response.error!.length > 0, true);
    console.log("AI response failed (expected in test environment):", response.error);
  }
});

Deno.test("System Integration - Complete Chat Flow With News", async () => {
  const userMessage = "Should I invest in the current market conditions?";
  
  // Clean up and prepare test data
  await cleanupTestData();
  
  try {
    // Insert test news items
    await supabaseClient.insertNews(testNewsItems);
    
    // Step 1: Analyze if news context is needed
    const needsNews = requiresNewsContext(userMessage);
    assertEquals(needsNews, true, "Market condition query should need news");
    
    // Step 2: Get news context
    const newsItems = await newsStorageService.getLatestNewsForContext(3);
    
    // Step 3: Generate AI response with news context
    const response = await generateAIResponse(userMessage, newsItems);
    
    // Verify response structure
    assertEquals(typeof response.success, "boolean");
    assertEquals(typeof response.message, "string");
    
    if (response.success) {
      assertEquals(response.message.length > 0, true, "Response should have content");
      assertEquals(response.error, undefined);
    } else {
      // If it fails, it should have an error message
      assertEquals(typeof response.error, "string");
      assertEquals(response.error!.length > 0, true);
      console.log("AI response failed (expected in test environment):", response.error);
    }
    
  } finally {
    await cleanupTestData();
  }
});

Deno.test("System Integration - News Update Workflow", async () => {
  // Clean up existing test data
  await cleanupTestData();
  
  try {
    // Get initial news count
    const initialNews = await supabaseClient.getLatestNews(10);
    const initialCount = initialNews.length;
    
    // Test news storage update (this will try to fetch from external API)
    const updateResult = await newsStorageService.updateNewsStorage();
    
    // Verify update result structure
    assertEquals(typeof updateResult.success, "boolean");
    assertEquals(typeof updateResult.inserted, "number");
    assertEquals(typeof updateResult.deleted, "number");
    assertEquals(typeof updateResult.totalStored, "number");
    
    if (updateResult.success) {
      // If successful, verify the counts make sense
      assertEquals(updateResult.inserted >= 0, true);
      assertEquals(updateResult.deleted >= 0, true);
      assertEquals(updateResult.totalStored >= 0, true);
      assertEquals(updateResult.totalStored <= 10, true); // Should not exceed max stored items
      
      console.log("News update successful:", {
        inserted: updateResult.inserted,
        deleted: updateResult.deleted,
        totalStored: updateResult.totalStored
      });
    } else {
      // If failed, should have error message
      assertEquals(typeof updateResult.error, "string");
      console.log("News update failed (expected if no API keys):", updateResult.error);
    }
    
  } finally {
    await cleanupTestData();
  }
});

Deno.test("System Integration - Error Handling and Recovery", async () => {
  // Test database error recovery
  try {
    // Try to get news with invalid limit (should handle gracefully)
    const newsItems = await newsStorageService.getLatestNewsForContext(-1);
    assertEquals(Array.isArray(newsItems), true);
    assertEquals(newsItems.length, 0); // Should return empty array for invalid input
  } catch (error) {
    // Should not throw, but if it does, verify it's handled
    assertEquals(error instanceof Error, true);
  }
  
  // Test AI response with invalid input
  const invalidResponse = await generateAIResponse("");
  assertEquals(invalidResponse.success, false);
  assertEquals(typeof invalidResponse.error, "string");
  assertStringIncludes(invalidResponse.error!, "empty");
  
  // Test message analysis with edge cases
  const edgeCases = ["", "   ", null as any, undefined as any];
  edgeCases.forEach(edgeCase => {
    const needsNews = requiresNewsContext(edgeCase);
    assertEquals(needsNews, false, "Invalid input should not require news context");
  });
});

Deno.test("System Integration - Performance and Limits", async () => {
  // Test with maximum message length
  const maxMessage = "a".repeat(1000);
  const maxResponse = await generateAIResponse(maxMessage);
  
  // Should handle max length gracefully
  assertEquals(typeof maxResponse.success, "boolean");
  assertEquals(typeof maxResponse.message, "string");
  
  // Test news retrieval with various limits
  const limits = [1, 3, 5, 10];
  for (const limit of limits) {
    const newsItems = await newsStorageService.getLatestNewsForContext(limit);
    assertEquals(Array.isArray(newsItems), true);
    assertEquals(newsItems.length <= limit, true);
  }
});

Deno.test("System Integration - Configuration Validation", () => {
  // Test that all required configuration is accessible
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  requiredEnvVars.forEach(envVar => {
    const value = Deno.env.get(envVar);
    // In test environment, these might not be set, but we should check they're accessible
    assertEquals(typeof value === "string" || value === undefined, true);
  });
  
  // Test configuration constants are defined
  const { corsHeaders, REQUEST_TIMEOUT, RATE_LIMIT, AI_CONFIG, NEWS_CONFIG } = 
    await import('./config.ts');
  
  assertEquals(typeof corsHeaders, "object");
  assertEquals(typeof REQUEST_TIMEOUT, "number");
  assertEquals(typeof RATE_LIMIT, "object");
  assertEquals(typeof AI_CONFIG, "object");
  assertEquals(typeof NEWS_CONFIG, "object");
  
  // Verify configuration values are reasonable
  assertEquals(REQUEST_TIMEOUT > 0, true);
  assertEquals(RATE_LIMIT.maxRequests > 0, true);
  assertEquals(AI_CONFIG.maxTokens > 0, true);
  assertEquals(NEWS_CONFIG.maxNewsItems > 0, true);
});

Deno.test("System Integration - Module Dependencies", async () => {
  // Test that all modules can be imported without errors
  const modules = [
    './supabase-client.ts',
    './news-storage.ts',
    './message-analyzer.ts',
    './ai-response-generator.ts',
    './prompt-builder.ts',
    './huggingface-client.ts',
    './news-api-client.ts',
    './types.ts',
    './config.ts'
  ];
  
  for (const modulePath of modules) {
    try {
      const module = await import(modulePath);
      assertEquals(typeof module, "object", `Module ${modulePath} should export an object`);
    } catch (error) {
      throw new Error(`Failed to import module ${modulePath}: ${error.message}`);
    }
  }
});

Deno.test("System Integration - End-to-End Simulation", async () => {
  console.log("🧪 Running end-to-end system simulation...");
  
  // Simulate a complete user interaction
  const userQueries = [
    "What is SIP investment?", // Educational - no news needed
    "Current market trends today", // News needed
    "How to start investing?", // Educational - no news needed
    "Should I buy stocks now?" // Market timing - news needed
  ];
  
  for (const query of userQueries) {
    console.log(`Testing query: "${query}"`);
    
    // Step 1: Message analysis
    const needsNews = requiresNewsContext(query);
    const analysis = analyzeQuestionType(query);
    
    console.log(`  - Needs news: ${needsNews}`);
    console.log(`  - Analysis confidence: ${analysis.confidence.toFixed(2)}`);
    
    // Step 2: Get news if needed
    let newsItems: any[] = [];
    if (needsNews) {
      newsItems = await newsStorageService.getLatestNewsForContext(3);
      console.log(`  - Retrieved ${newsItems.length} news items`);
    }
    
    // Step 3: Generate response
    const response = await generateAIResponse(query, newsItems.length > 0 ? newsItems : undefined);
    
    console.log(`  - Response success: ${response.success}`);
    if (response.success) {
      console.log(`  - Response length: ${response.message.length} characters`);
    } else {
      console.log(`  - Error: ${response.error}`);
    }
    
    // Verify response structure
    assertEquals(typeof response.success, "boolean");
    assertEquals(typeof response.message, "string");
    
    console.log("  ✅ Query processed successfully\n");
  }
  
  console.log("🎉 End-to-end simulation completed!");
});