// Integration tests for chat endpoint using Deno testing framework
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { corsHeaders } from "../_shared/config.ts";

// Mock dependencies for testing
class MockSupabaseClient {
  private shouldFail: boolean;
  private mockNews: any[];
  
  constructor(shouldFail = false, mockNews: any[] = []) {
    this.shouldFail = shouldFail;
    this.mockNews = mockNews;
  }
  
  async getLatestNews(limit: number) {
    if (this.shouldFail) {
      throw new Error("Database connection failed");
    }
    return this.mockNews.slice(0, limit);
  }
}

class MockAIResponseGenerator {
  private shouldFail: boolean;
  private mockResponse: string;
  
  constructor(shouldFail = false, mockResponse = "This is a helpful financial response from FinBuddy.") {
    this.shouldFail = shouldFail;
    this.mockResponse = mockResponse;
  }
  
  async generateResponse(message: string, newsItems?: any[]) {
    if (this.shouldFail) {
      return {
        success: false,
        message: "",
        error: "AI service temporarily unavailable"
      };
    }
    
    return {
      success: true,
      message: this.mockResponse,
      error: undefined
    };
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

// Helper function to create test requests
function createTestRequest(method: string, body?: any, headers?: Record<string, string>): Request {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (body) {
    requestInit.body = JSON.stringify(body);
  }
  
  return new Request('http://localhost:8000/chat', requestInit);
}

// Helper function to parse response
async function parseResponse(response: Response) {
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

Deno.test("Chat Integration - CORS preflight request", async () => {
  // Import the chat handler
  const { default: handler } = await import('./index.ts');
  
  const request = createTestRequest('OPTIONS');
  const response = await handler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 200);
  assertEquals(parsed.text, 'ok');
  
  // Verify CORS headers are present
  assertEquals(parsed.headers['access-control-allow-origin'], '*');
  assertEquals(parsed.headers['access-control-allow-headers'], 'authorization, x-client-info, apikey, content-type');
  assertEquals(parsed.headers['access-control-allow-methods'], 'POST, OPTIONS');
});

Deno.test("Chat Integration - successful chat request without news context", async () => {
  // Mock the dependencies
  const originalSupabaseClient = (globalThis as any).supabaseClient;
  const originalGenerateAIResponse = (globalThis as any).generateAIResponse;
  const originalRequiresNewsContext = (globalThis as any).requiresNewsContext;
  
  try {
    // Set up mocks
    (globalThis as any).supabaseClient = new MockSupabaseClient();
    (globalThis as any).generateAIResponse = async (message: string, newsItems?: any[]) => {
      return {
        success: true,
        message: "Here's some helpful information about compound interest...",
        error: undefined
      };
    };
    (globalThis as any).requiresNewsContext = () => false;
    
    const { default: handler } = await import('./index.ts');
    
    const request = createTestRequest('POST', {
      message: "What is compound interest?"
    });
    
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 200);
    assertEquals(parsed.body.success, true);
    assertEquals(typeof parsed.body.message, "string");
    assertEquals(parsed.body.message.length > 0, true);
    assertEquals(parsed.body.error, undefined);
    
    // Verify CORS headers
    assertEquals(parsed.headers['access-control-allow-origin'], '*');
    assertEquals(parsed.headers['content-type'], 'application/json');
    
  } finally {
    // Restore original dependencies
    (globalThis as any).supabaseClient = originalSupabaseClient;
    (globalThis as any).generateAIResponse = originalGenerateAIResponse;
    (globalThis as any).requiresNewsContext = originalRequiresNewsContext;
  }
});

Deno.test("Chat Integration - successful chat request with news context", async () => {
  const originalSupabaseClient = (globalThis as any).supabaseClient;
  const originalGenerateAIResponse = (globalThis as any).generateAIResponse;
  const originalRequiresNewsContext = (globalThis as any).requiresNewsContext;
  
  try {
    // Set up mocks
    (globalThis as any).supabaseClient = new MockSupabaseClient(false, mockNewsItems);
    (globalThis as any).generateAIResponse = async (message: string, newsItems?: any[]) => {
      return {
        success: true,
        message: "Based on current market conditions, here's my advice...",
        error: undefined
      };
    };
    (globalThis as any).requiresNewsContext = () => true;
    
    const { default: handler } = await import('./index.ts');
    
    const request = createTestRequest('POST', {
      message: "Should I invest in the current market conditions?"
    });
    
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 200);
    assertEquals(parsed.body.success, true);
    assertEquals(typeof parsed.body.message, "string");
    assertEquals(parsed.body.message.length > 0, true);
    assertEquals(parsed.body.error, undefined);
    
    // Verify CORS headers
    assertEquals(parsed.headers['access-control-allow-origin'], '*');
    assertEquals(parsed.headers['content-type'], 'application/json');
    
  } finally {
    // Restore original dependencies
    (globalThis as any).supabaseClient = originalSupabaseClient;
    (globalThis as any).generateAIResponse = originalGenerateAIResponse;
    (globalThis as any).requiresNewsContext = originalRequiresNewsContext;
  }
});

Deno.test("Chat Integration - invalid HTTP method", async () => {
  const { default: handler } = await import('./index.ts');
  
  const request = createTestRequest('GET');
  const response = await handler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 405);
  assertEquals(parsed.body.success, false);
  assertEquals(parsed.body.message, "");
  assertEquals(parsed.body.error, "Method not allowed. Use POST.");
  
  // Verify CORS headers are still present
  assertEquals(parsed.headers['access-control-allow-origin'], '*');
  assertEquals(parsed.headers['content-type'], 'application/json');
});

Deno.test("Chat Integration - empty request body", async () => {
  const { default: handler } = await import('./index.ts');
  
  const request = new Request('http://localhost:8000/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: ''
  });
  
  const response = await handler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400);
  assertEquals(parsed.body.success, false);
  assertEquals(parsed.body.message, "");
  assertEquals(parsed.body.error, "Request body cannot be empty");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*');
  assertEquals(parsed.headers['content-type'], 'application/json');
});

Deno.test("Chat Integration - invalid JSON in request body", async () => {
  const { default: handler } = await import('./index.ts');
  
  const request = new Request('http://localhost:8000/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ invalid json'
  });
  
  const response = await handler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400);
  assertEquals(parsed.body.success, false);
  assertEquals(parsed.body.message, "");
  assertEquals(parsed.body.error, "Invalid JSON in request body");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*');
  assertEquals(parsed.headers['content-type'], 'application/json');
});

Deno.test("Chat Integration - missing message field", async () => {
  const { default: handler } = await import('./index.ts');
  
  const request = createTestRequest('POST', {
    text: "This should be 'message' field"
  });
  
  const response = await handler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400);
  assertEquals(parsed.body.success, false);
  assertEquals(parsed.body.message, "");
  assertEquals(parsed.body.error, "Missing required field: message");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*');
  assertEquals(parsed.headers['content-type'], 'application/json');
});

Deno.test("Chat Integration - empty message field", async () => {
  const { default: handler } = await import('./index.ts');
  
  const request = createTestRequest('POST', {
    message: "   "
  });
  
  const response = await handler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400);
  assertEquals(parsed.body.success, false);
  assertEquals(parsed.body.message, "");
  assertEquals(parsed.body.error, "Message cannot be empty");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*');
  assertEquals(parsed.headers['content-type'], 'application/json');
});

Deno.test("Chat Integration - message too long", async () => {
  const { default: handler } = await import('./index.ts');
  
  const longMessage = "a".repeat(1001);
  const request = createTestRequest('POST', {
    message: longMessage
  });
  
  const response = await handler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400);
  assertEquals(parsed.body.success, false);
  assertEquals(parsed.body.message, "");
  assertEquals(parsed.body.error, "Message too long. Maximum 1000 characters allowed.");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*');
  assertEquals(parsed.headers['content-type'], 'application/json');
});

Deno.test("Chat Integration - message too short", async () => {
  const { default: handler } = await import('./index.ts');
  
  const request = createTestRequest('POST', {
    message: "hi"
  });
  
  const response = await handler(request);
  const parsed = await parseResponse(response);
  
  assertEquals(parsed.status, 400);
  assertEquals(parsed.body.success, false);
  assertEquals(parsed.body.message, "");
  assertEquals(parsed.body.error, "Message too short. Minimum 3 characters required.");
  
  // Verify CORS headers
  assertEquals(parsed.headers['access-control-allow-origin'], '*');
  assertEquals(parsed.headers['content-type'], 'application/json');
});

Deno.test("Chat Integration - database failure handling", async () => {
  const originalSupabaseClient = (globalThis as any).supabaseClient;
  const originalGenerateAIResponse = (globalThis as any).generateAIResponse;
  const originalRequiresNewsContext = (globalThis as any).requiresNewsContext;
  
  try {
    // Set up mocks with database failure
    (globalThis as any).supabaseClient = new MockSupabaseClient(true); // Should fail
    (globalThis as any).generateAIResponse = async (message: string, newsItems?: any[]) => {
      return {
        success: true,
        message: "Response without news context due to database issue",
        error: undefined
      };
    };
    (globalThis as any).requiresNewsContext = () => true; // Requires news but DB will fail
    
    const { default: handler } = await import('./index.ts');
    
    const request = createTestRequest('POST', {
      message: "What's happening in the market today?"
    });
    
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    // Should still succeed but without news context
    assertEquals(parsed.status, 200);
    assertEquals(parsed.body.success, true);
    assertEquals(typeof parsed.body.message, "string");
    
  } finally {
    // Restore original dependencies
    (globalThis as any).supabaseClient = originalSupabaseClient;
    (globalThis as any).generateAIResponse = originalGenerateAIResponse;
    (globalThis as any).requiresNewsContext = originalRequiresNewsContext;
  }
});

Deno.test("Chat Integration - AI service failure", async () => {
  const originalSupabaseClient = (globalThis as any).supabaseClient;
  const originalGenerateAIResponse = (globalThis as any).generateAIResponse;
  const originalRequiresNewsContext = (globalThis as any).requiresNewsContext;
  
  try {
    // Set up mocks with AI failure
    (globalThis as any).supabaseClient = new MockSupabaseClient();
    (globalThis as any).generateAIResponse = async (message: string, newsItems?: any[]) => {
      return {
        success: false,
        message: "",
        error: "AI service temporarily unavailable"
      };
    };
    (globalThis as any).requiresNewsContext = () => false;
    
    const { default: handler } = await import('./index.ts');
    
    const request = createTestRequest('POST', {
      message: "What is compound interest?"
    });
    
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 500);
    assertEquals(parsed.body.success, false);
    assertEquals(parsed.body.message, "");
    assertEquals(typeof parsed.body.error, "string");
    
    // Verify CORS headers
    assertEquals(parsed.headers['access-control-allow-origin'], '*');
    assertEquals(parsed.headers['content-type'], 'application/json');
    
  } finally {
    // Restore original dependencies
    (globalThis as any).supabaseClient = originalSupabaseClient;
    (globalThis as any).generateAIResponse = originalGenerateAIResponse;
    (globalThis as any).requiresNewsContext = originalRequiresNewsContext;
  }
});

Deno.test("Chat Integration - rate limiting simulation", async () => {
  const { default: handler } = await import('./index.ts');
  
  // Create multiple requests from the same IP to trigger rate limiting
  const requests = [];
  for (let i = 0; i < 12; i++) { // Exceed the rate limit
    requests.push(createTestRequest('POST', {
      message: `Test message ${i}`
    }, {
      'x-forwarded-for': '192.168.1.100' // Same IP for all requests
    }));
  }
  
  const responses = [];
  for (const request of requests) {
    const response = await handler(request);
    const parsed = await parseResponse(response);
    responses.push(parsed);
  }
  
  // Check that some requests were rate limited
  const rateLimitedResponses = responses.filter(r => r.status === 429);
  assertEquals(rateLimitedResponses.length > 0, true);
  
  // Check rate limit response format
  if (rateLimitedResponses.length > 0) {
    const rateLimited = rateLimitedResponses[0];
    assertEquals(rateLimited.body.success, false);
    assertEquals(rateLimited.body.message, "");
    assertStringIncludes(rateLimited.body.error, "Rate limit exceeded");
    assertEquals(typeof rateLimited.headers['retry-after'], "string");
    
    // Verify CORS headers
    assertEquals(rateLimited.headers['access-control-allow-origin'], '*');
    assertEquals(rateLimited.headers['content-type'], 'application/json');
  }
});

Deno.test("Chat Integration - request timeout simulation", async () => {
  const originalSupabaseClient = (globalThis as any).supabaseClient;
  const originalGenerateAIResponse = (globalThis as any).generateAIResponse;
  const originalRequiresNewsContext = (globalThis as any).requiresNewsContext;
  
  try {
    // Set up mocks with timeout
    (globalThis as any).supabaseClient = new MockSupabaseClient();
    (globalThis as any).generateAIResponse = async (message: string, newsItems?: any[]) => {
      // Simulate a timeout by taking longer than the request timeout
      await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds
      return {
        success: true,
        message: "This should timeout",
        error: undefined
      };
    };
    (globalThis as any).requiresNewsContext = () => false;
    
    const { default: handler } = await import('./index.ts');
    
    const request = createTestRequest('POST', {
      message: "What is compound interest?"
    });
    
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 408);
    assertEquals(parsed.body.success, false);
    assertEquals(parsed.body.message, "");
    assertStringIncludes(parsed.body.error, "Request timed out");
    
    // Verify CORS headers
    assertEquals(parsed.headers['access-control-allow-origin'], '*');
    assertEquals(parsed.headers['content-type'], 'application/json');
    
  } finally {
    // Restore original dependencies
    (globalThis as any).supabaseClient = originalSupabaseClient;
    (globalThis as any).generateAIResponse = originalGenerateAIResponse;
    (globalThis as any).requiresNewsContext = originalRequiresNewsContext;
  }
});

Deno.test("Chat Integration - CORS headers verification", async () => {
  const { default: handler } = await import('./index.ts');
  
  // Test various request types to ensure CORS headers are always present
  const testCases = [
    { method: 'OPTIONS', expectedStatus: 200 },
    { method: 'GET', expectedStatus: 405 },
    { method: 'PUT', expectedStatus: 405 },
    { method: 'DELETE', expectedStatus: 405 }
  ];
  
  for (const { method, expectedStatus } of testCases) {
    const request = createTestRequest(method);
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, expectedStatus);
    
    // Verify all required CORS headers are present
    assertEquals(parsed.headers['access-control-allow-origin'], '*');
    assertEquals(parsed.headers['access-control-allow-headers'], 'authorization, x-client-info, apikey, content-type');
    assertEquals(parsed.headers['access-control-allow-methods'], 'POST, OPTIONS');
  }
});

Deno.test("Chat Integration - response format consistency", async () => {
  const originalSupabaseClient = (globalThis as any).supabaseClient;
  const originalGenerateAIResponse = (globalThis as any).generateAIResponse;
  const originalRequiresNewsContext = (globalThis as any).requiresNewsContext;
  
  try {
    // Set up mocks
    (globalThis as any).supabaseClient = new MockSupabaseClient();
    (globalThis as any).generateAIResponse = async (message: string, newsItems?: any[]) => {
      return {
        success: true,
        message: "Test response",
        error: undefined
      };
    };
    (globalThis as any).requiresNewsContext = () => false;
    
    const { default: handler } = await import('./index.ts');
    
    // Test successful response format
    const successRequest = createTestRequest('POST', {
      message: "What is investing?"
    });
    
    const successResponse = await handler(successRequest);
    const successParsed = await parseResponse(successResponse);
    
    // Verify response structure
    assertEquals(typeof successParsed.body.success, "boolean");
    assertEquals(typeof successParsed.body.message, "string");
    assertEquals(successParsed.body.error === undefined || typeof successParsed.body.error === "string", true);
    
    // Test error response format
    const errorRequest = createTestRequest('POST', {
      message: ""
    });
    
    const errorResponse = await handler(errorRequest);
    const errorParsed = await parseResponse(errorResponse);
    
    // Verify error response structure
    assertEquals(typeof errorParsed.body.success, "boolean");
    assertEquals(typeof errorParsed.body.message, "string");
    assertEquals(typeof errorParsed.body.error, "string");
    assertEquals(errorParsed.body.success, false);
    assertEquals(errorParsed.body.message, "");
    
  } finally {
    // Restore original dependencies
    (globalThis as any).supabaseClient = originalSupabaseClient;
    (globalThis as any).generateAIResponse = originalGenerateAIResponse;
    (globalThis as any).requiresNewsContext = originalRequiresNewsContext;
  }
});

Deno.test("Chat Integration - content type validation", async () => {
  const { default: handler } = await import('./index.ts');
  
  // Test with missing Content-Type header
  const request1 = new Request('http://localhost:8000/chat', {
    method: 'POST',
    body: JSON.stringify({ message: "Test message" })
  });
  
  const response1 = await handler(request1);
  const parsed1 = await parseResponse(response1);
  
  // Should still work (browser compatibility)
  assertEquals(parsed1.status < 500, true);
  
  // Test with wrong Content-Type
  const request2 = new Request('http://localhost:8000/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ message: "Test message" })
  });
  
  const response2 = await handler(request2);
  const parsed2 = await parseResponse(response2);
  
  // Should still work (content is valid JSON)
  assertEquals(parsed2.status < 500, true);
});