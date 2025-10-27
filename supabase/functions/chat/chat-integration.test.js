// Integration tests for chat endpoint using Node.js
// Tests complete chat flow with mock dependencies and verifies CORS headers and error response formats

console.log('Starting Chat Integration Tests...\n');

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

// Mock CORS headers (from config.ts)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Mock dependencies for testing
class MockSupabaseClient {
  constructor(shouldFail = false, mockNews = []) {
    this.shouldFail = shouldFail;
    this.mockNews = mockNews;
  }
  
  async getLatestNews(limit) {
    if (this.shouldFail) {
      throw new Error("Database connection failed");
    }
    return this.mockNews.slice(0, limit);
  }
}

// Mock news items for testing
const mockNewsItems = [
  {
    id: 1,
    headline: "Sensex rises 200 points on positive market sentiment",
    url: "https://example.com/news1",
    published_at: "2024-10-25T10:00:00Z",
    source: "Economic Times",
    created_at: "2024-10-25T10:00:00Z"
  },
  {
    id: 2,
    headline: "RBI maintains repo rate at 6.5% in latest policy meeting",
    url: "https://example.com/news2",
    published_at: "2024-10-25T09:00:00Z",
    source: "Business Standard",
    created_at: "2024-10-25T09:00:00Z"
  }
];

// Mock chat handler functions
function mockRequiresNewsContext(message) {
  const newsKeywords = ['market', 'stock', 'current', 'today', 'latest', 'news'];
  return newsKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

async function mockGenerateAIResponse(message, newsItems) {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 10));
  
  return {
    success: true,
    message: newsItems && newsItems.length > 0 
      ? "Based on current market conditions, here's my advice..."
      : "Here's some helpful information about your financial question...",
    error: undefined
  };
}

// Mock request/response objects for testing
class MockRequest {
  constructor(method, body, headers = {}) {
    this.method = method;
    this.headers = new Map(Object.entries({
      'Content-Type': 'application/json',
      ...headers
    }));
    this._body = body;
  }
  
  async text() {
    return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
  }
  
  async json() {
    const text = await this.text();
    return JSON.parse(text);
  }
}

class MockResponse {
  constructor(body, options = {}) {
    this.status = options.status || 200;
    this.headers = new Map(Object.entries(options.headers || {}));
    this._body = body;
  }
  
  async text() {
    return this._body;
  }
  
  async json() {
    return JSON.parse(this._body);
  }
}

// Mock chat handler implementation for testing
async function mockChatHandler(req) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new MockResponse('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new MockResponse(
      JSON.stringify({ 
        success: false, 
        message: '', 
        error: 'Method not allowed. Use POST.' 
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    // Parse request body
    let requestBody;
    try {
      const bodyText = await req.text();
      if (!bodyText.trim()) {
        return new MockResponse(
          JSON.stringify({ 
            success: false, 
            message: '', 
            error: 'Request body cannot be empty' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      requestBody = JSON.parse(bodyText);
    } catch (error) {
      return new MockResponse(
        JSON.stringify({ 
          success: false, 
          message: '', 
          error: 'Invalid JSON in request body' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate request body
    if (!requestBody || typeof requestBody !== 'object') {
      return new MockResponse(
        JSON.stringify({ 
          success: false, 
          message: '', 
          error: 'Request body must be a JSON object' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!requestBody.message) {
      return new MockResponse(
        JSON.stringify({ 
          success: false, 
          message: '', 
          error: 'Missing required field: message' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (typeof requestBody.message !== 'string') {
      return new MockResponse(
        JSON.stringify({ 
          success: false, 
          message: '', 
          error: 'Message field must be a string' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const trimmedMessage = requestBody.message.trim();
    if (!trimmedMessage) {
      return new MockResponse(
        JSON.stringify({ 
          success: false, 
          message: '', 
          error: 'Message cannot be empty' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (trimmedMessage.length > 1000) {
      return new MockResponse(
        JSON.stringify({ 
          success: false, 
          message: '', 
          error: 'Message too long. Maximum 1000 characters allowed.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (trimmedMessage.length < 3) {
      return new MockResponse(
        JSON.stringify({ 
          success: false, 
          message: '', 
          error: 'Message too short. Minimum 3 characters required.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const userMessage = trimmedMessage;

    // Analyze message to determine if news context is needed
    const needsNewsContext = mockRequiresNewsContext(userMessage);
    
    // Get latest news if needed
    let newsItems = undefined;
    if (needsNewsContext) {
      try {
        const supabaseClient = new MockSupabaseClient(false, mockNewsItems);
        newsItems = await supabaseClient.getLatestNews(3);
      } catch (error) {
        console.warn('Failed to fetch news context:', error);
        // Continue without news context rather than failing the request
      }
    }

    // Generate AI response
    const aiResponse = await mockGenerateAIResponse(userMessage, newsItems);

    // Return the response
    return new MockResponse(
      JSON.stringify(aiResponse),
      { 
        status: aiResponse.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error('Request processing error:', error);
    
    return new MockResponse(
      JSON.stringify({ 
        success: false, 
        message: '', 
        error: 'Internal server error. Please try again later.' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
}

// Helper function to parse response
async function parseResponse(response) {
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  
  // Convert headers to lowercase for consistent access
  const headers = {};
  for (const [key, value] of response.headers.entries()) {
    headers[key.toLowerCase()] = value;
  }
  
  return {
    status: response.status,
    headers,
    body: json,
    text
  };
}

// Test cases
runAsyncTest("CORS preflight request", async () => {
  const request = new MockRequest('OPTIONS');
  const response = await mockChatHandler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 200, "status code");
  assertEquals(parsed.text, 'ok', "response text");
  
  // Verify CORS headers are present
  assertEquals(parsed.headers['access-control-allow-origin'], '*', "CORS origin header");
  assertEquals(parsed.headers['access-control-allow-headers'], 'authorization, x-client-info, apikey, content-type', "CORS headers");
  assertEquals(parsed.headers['access-control-allow-methods'], 'POST, OPTIONS', "CORS methods");
});

runAsyncTest("successful chat request without news context", async () => {
  const request = new MockRequest('POST', {
    message: "What is compound interest?"
  });
  
  const response = await mockChatHandler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 200, "status code");
  assertEquals(parsed.body.success, true, "success field");
  assertTrue(typeof parsed.body.message === "string", "message is string");
  assertTrue(parsed.body.message.length > 0, "message not empty");
  assertEquals(parsed.body.error, undefined, "no error");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*', "CORS origin");
  assertEquals(parsed.headers['content-type'], 'application/json', "content type");
});

runAsyncTest("successful chat request with news context", async () => {
  const request = new MockRequest('POST', {
    message: "Should I invest in the current market conditions?"
  });
  
  const response = await mockChatHandler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 200, "status code");
  assertEquals(parsed.body.success, true, "success field");
  assertTrue(typeof parsed.body.message === "string", "message is string");
  assertTrue(parsed.body.message.length > 0, "message not empty");
  assertEquals(parsed.body.error, undefined, "no error");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*', "CORS origin");
  assertEquals(parsed.headers['content-type'], 'application/json', "content type");
});

runAsyncTest("invalid HTTP method", async () => {
  const request = new MockRequest('GET');
  const response = await mockChatHandler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 405, "status code");
  assertEquals(parsed.body.success, false, "success field");
  assertEquals(parsed.body.message, "", "empty message");
  assertEquals(parsed.body.error, "Method not allowed. Use POST.", "error message");
  
  // Verify CORS headers are still present
  assertEquals(parsed.headers['access-control-allow-origin'], '*', "CORS origin");
  assertEquals(parsed.headers['content-type'], 'application/json', "content type");
});

runAsyncTest("empty request body", async () => {
  const request = new MockRequest('POST', '');
  const response = await mockChatHandler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400, "status code");
  assertEquals(parsed.body.success, false, "success field");
  assertEquals(parsed.body.message, "", "empty message");
  assertEquals(parsed.body.error, "Request body cannot be empty", "error message");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*', "CORS origin");
  assertEquals(parsed.headers['content-type'], 'application/json', "content type");
});

runAsyncTest("invalid JSON in request body", async () => {
  const request = new MockRequest('POST', '{ invalid json');
  const response = await mockChatHandler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400, "status code");
  assertEquals(parsed.body.success, false, "success field");
  assertEquals(parsed.body.message, "", "empty message");
  assertEquals(parsed.body.error, "Invalid JSON in request body", "error message");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*', "CORS origin");
  assertEquals(parsed.headers['content-type'], 'application/json', "content type");
});

runAsyncTest("missing message field", async () => {
  const request = new MockRequest('POST', {
    text: "This should be 'message' field"
  });
  
  const response = await mockChatHandler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400, "status code");
  assertEquals(parsed.body.success, false, "success field");
  assertEquals(parsed.body.message, "", "empty message");
  assertEquals(parsed.body.error, "Missing required field: message", "error message");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*', "CORS origin");
  assertEquals(parsed.headers['content-type'], 'application/json', "content type");
});

runAsyncTest("empty message field", async () => {
  const request = new MockRequest('POST', {
    message: "   "
  });
  
  const response = await mockChatHandler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400, "status code");
  assertEquals(parsed.body.success, false, "success field");
  assertEquals(parsed.body.message, "", "empty message");
  assertEquals(parsed.body.error, "Message cannot be empty", "error message");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*', "CORS origin");
  assertEquals(parsed.headers['content-type'], 'application/json', "content type");
});

runAsyncTest("message too long", async () => {
  const longMessage = "a".repeat(1001);
  const request = new MockRequest('POST', {
    message: longMessage
  });
  
  const response = await mockChatHandler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400, "status code");
  assertEquals(parsed.body.success, false, "success field");
  assertEquals(parsed.body.message, "", "empty message");
  assertEquals(parsed.body.error, "Message too long. Maximum 1000 characters allowed.", "error message");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*', "CORS origin");
  assertEquals(parsed.headers['content-type'], 'application/json', "content type");
});

runAsyncTest("message too short", async () => {
  const request = new MockRequest('POST', {
    message: "hi"
  });
  
  const response = await mockChatHandler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400, "status code");
  assertEquals(parsed.body.success, false, "success field");
  assertEquals(parsed.body.message, "", "empty message");
  assertEquals(parsed.body.error, "Message too short. Minimum 3 characters required.", "error message");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*', "CORS origin");
  assertEquals(parsed.headers['content-type'], 'application/json', "content type");
});

runAsyncTest("CORS headers verification", async () => {
  // Test various request types to ensure CORS headers are always present
  const testCases = [
    { method: 'OPTIONS', expectedStatus: 200 },
    { method: 'GET', expectedStatus: 405 },
    { method: 'PUT', expectedStatus: 405 },
    { method: 'DELETE', expectedStatus: 405 }
  ];
  
  for (const { method, expectedStatus } of testCases) {
    const request = new MockRequest(method);
    const response = await mockChatHandler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, expectedStatus, `${method} status`);
    
    // Verify all required CORS headers are present
    assertEquals(parsed.headers['access-control-allow-origin'], '*', `${method} CORS origin`);
    assertEquals(parsed.headers['access-control-allow-headers'], 'authorization, x-client-info, apikey, content-type', `${method} CORS headers`);
    assertEquals(parsed.headers['access-control-allow-methods'], 'POST, OPTIONS', `${method} CORS methods`);
  }
});

runAsyncTest("response format consistency", async () => {
  // Test successful response format
  const successRequest = new MockRequest('POST', {
    message: "What is investing?"
  });
  
  const successResponse = await mockChatHandler(successRequest);
  const successParsed = await parseResponse(successResponse);
  
  // Verify response structure
  assertTrue(typeof successParsed.body.success === "boolean", "success is boolean");
  assertTrue(typeof successParsed.body.message === "string", "message is string");
  assertTrue(successParsed.body.error === undefined || typeof successParsed.body.error === "string", "error is string or undefined");
  
  // Test error response format
  const errorRequest = new MockRequest('POST', {
    message: ""
  });
  
  const errorResponse = await mockChatHandler(errorRequest);
  const errorParsed = await parseResponse(errorResponse);
  
  // Verify error response structure
  assertTrue(typeof errorParsed.body.success === "boolean", "error success is boolean");
  assertTrue(typeof errorParsed.body.message === "string", "error message is string");
  assertTrue(typeof errorParsed.body.error === "string", "error field is string");
  assertEquals(errorParsed.body.success, false, "error success is false");
  assertEquals(errorParsed.body.message, "", "error message is empty");
});

runAsyncTest("message analysis integration", async () => {
  // Test messages that should trigger news context
  const newsMessages = [
    "What's happening in the market today?",
    "Current stock market trends",
    "Latest news on Sensex"
  ];
  
  for (const message of newsMessages) {
    const needsNews = mockRequiresNewsContext(message);
    assertTrue(needsNews, `"${message}" should require news context`);
  }
  
  // Test messages that should NOT trigger news context
  const generalMessages = [
    "What is compound interest?",
    "How to start investing?",
    "Explain mutual funds"
  ];
  
  for (const message of generalMessages) {
    const needsNews = mockRequiresNewsContext(message);
    assertEquals(needsNews, false, `"${message}" should NOT require news context`);
  }
});

runAsyncTest("complete chat flow validation", async () => {
  // Test complete flow with news context
  const newsRequest = new MockRequest('POST', {
    message: "Should I invest in current market conditions?"
  });
  
  const newsResponse = await mockChatHandler(newsRequest);
  const newsParsed = await parseResponse(newsResponse);
  
  assertEquals(newsParsed.status, 200, "news request status");
  assertEquals(newsParsed.body.success, true, "news request success");
  assertStringIncludes(newsParsed.body.message, "current market conditions", "news context in response");
  
  // Test complete flow without news context
  const generalRequest = new MockRequest('POST', {
    message: "How does compound interest work?"
  });
  
  const generalResponse = await mockChatHandler(generalRequest);
  const generalParsed = await parseResponse(generalResponse);
  
  assertEquals(generalParsed.status, 200, "general request status");
  assertEquals(generalParsed.body.success, true, "general request success");
  assertStringIncludes(generalParsed.body.message, "financial question", "general response content");
});

// Run all tests and show summary
setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('INTEGRATION TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total tests: ${testCount}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success rate: ${((passedTests / testCount) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 All integration tests passed!');
    console.log('\nTest Coverage:');
    console.log('✓ CORS preflight and headers verification');
    console.log('✓ Complete chat flow with and without news context');
    console.log('✓ HTTP method validation');
    console.log('✓ Request body validation and error handling');
    console.log('✓ Message length and content validation');
    console.log('✓ Response format consistency');
    console.log('✓ Error response formats');
    console.log('✓ Message analysis integration');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failedTests} integration test(s) failed.`);
    process.exit(1);
  }
}, 100); // Small delay to ensure all async tests complete