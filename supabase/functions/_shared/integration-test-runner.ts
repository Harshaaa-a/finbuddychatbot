/**
 * Integration Test Runner
 * Runs comprehensive integration tests for the complete FinBuddy system
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// Import the chat handler
const chatModule = await import('../chat/index.ts');
const chatHandler = (chatModule as any).default || chatModule;

// Import the fetchNews handler  
const fetchNewsModule = await import('../fetchNews/index.ts');
const fetchNewsHandler = (fetchNewsModule as any).default || fetchNewsModule;

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  message: string;
  duration: number;
  details?: any;
}

class IntegrationTestRunner {
  private results: TestResult[] = [];

  /**
   * Add test result
   */
  private addResult(name: string, status: 'pass' | 'fail', message: string, duration: number, details?: any) {
    this.results.push({ name, status, message, duration, details });
  }

  /**
   * Create a test request
   */
  private createRequest(method: string, path: string, body?: any, headers?: Record<string, string>): Request {
    const url = `http://localhost:8000${path}`;
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

    return new Request(url, requestInit);
  }

  /**
   * Parse response safely
   */
  private async parseResponse(response: Response) {
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
   * Test chat endpoint CORS
   */
  async testChatCORS(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const request = this.createRequest('OPTIONS', '/chat');
      const response = await chatHandler(request);
      const parsed = await this.parseResponse(response);
      
      const duration = Date.now() - startTime;
      
      if (parsed.status === 200 && 
          parsed.headers['access-control-allow-origin'] === '*' &&
          parsed.headers['access-control-allow-methods']?.includes('POST')) {
        this.addResult('Chat CORS', 'pass', 'CORS preflight request successful', duration);
      } else {
        this.addResult('Chat CORS', 'fail', 'CORS preflight request failed', duration, parsed);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addResult('Chat CORS', 'fail', `CORS test error: ${error.message}`, duration);
    }
  }

  /**
   * Test chat endpoint with valid request
   */
  async testChatValidRequest(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const request = this.createRequest('POST', '/chat', {
        message: 'What is compound interest and how does it work?'
      });
      
      const response = await chatHandler(request);
      const parsed = await this.parseResponse(response);
      
      const duration = Date.now() - startTime;
      
      if (parsed.status === 200 && 
          parsed.body?.success !== undefined &&
          typeof parsed.body?.message === 'string') {
        
        if (parsed.body.success) {
          this.addResult('Chat Valid Request', 'pass', 
            `Chat request successful (${parsed.body.message.length} chars)`, duration);
        } else {
          this.addResult('Chat Valid Request', 'fail', 
            `Chat request failed: ${parsed.body.error}`, duration, parsed.body);
        }
      } else {
        this.addResult('Chat Valid Request', 'fail', 
          'Invalid response format', duration, parsed);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addResult('Chat Valid Request', 'fail', 
        `Chat request error: ${error.message}`, duration);
    }
  }

  /**
   * Test chat endpoint with news context
   */
  async testChatWithNewsContext(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const request = this.createRequest('POST', '/chat', {
        message: 'What are the current market conditions and should I invest now?'
      });
      
      const response = await chatHandler(request);
      const parsed = await this.parseResponse(response);
      
      const duration = Date.now() - startTime;
      
      if (parsed.status === 200 && parsed.body?.success !== undefined) {
        if (parsed.body.success) {
          this.addResult('Chat with News Context', 'pass', 
            `News context request successful (${parsed.body.message.length} chars)`, duration);
        } else {
          this.addResult('Chat with News Context', 'fail', 
            `News context request failed: ${parsed.body.error}`, duration, parsed.body);
        }
      } else {
        this.addResult('Chat with News Context', 'fail', 
          'Invalid response format', duration, parsed);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addResult('Chat with News Context', 'fail', 
        `News context request error: ${error.message}`, duration);
    }
  }

  /**
   * Test chat endpoint error handling
   */
  async testChatErrorHandling(): Promise<void> {
    const errorTests = [
      {
        name: 'Empty Message',
        body: { message: '' },
        expectedStatus: 400
      },
      {
        name: 'Missing Message Field',
        body: { text: 'This should be message field' },
        expectedStatus: 400
      },
      {
        name: 'Invalid JSON',
        body: null,
        rawBody: '{ invalid json',
        expectedStatus: 400
      },
      {
        name: 'Wrong HTTP Method',
        method: 'GET',
        body: null,
        expectedStatus: 405
      }
    ];

    for (const test of errorTests) {
      const startTime = Date.now();
      
      try {
        let request: Request;
        
        if (test.rawBody) {
          request = new Request('http://localhost:8000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: test.rawBody
          });
        } else {
          request = this.createRequest(test.method || 'POST', '/chat', test.body);
        }
        
        const response = await chatHandler(request);
        const parsed = await this.parseResponse(response);
        
        const duration = Date.now() - startTime;
        
        if (parsed.status === test.expectedStatus && 
            parsed.body?.success === false &&
            typeof parsed.body?.error === 'string') {
          this.addResult(`Chat Error: ${test.name}`, 'pass', 
            `Error handling correct (${parsed.body.error})`, duration);
        } else {
          this.addResult(`Chat Error: ${test.name}`, 'fail', 
            `Unexpected error response`, duration, parsed);
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        this.addResult(`Chat Error: ${test.name}`, 'fail', 
          `Error test failed: ${error.message}`, duration);
      }
    }
  }

  /**
   * Test fetchNews endpoint
   */
  async testFetchNewsEndpoint(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test GET request (health check)
      const getRequest = this.createRequest('GET', '/fetchNews');
      const getResponse = await fetchNewsHandler(getRequest);
      const getParsed = await this.parseResponse(getResponse);
      
      const getDuration = Date.now() - startTime;
      
      if (getParsed.status === 200 && getParsed.body?.success !== undefined) {
        this.addResult('FetchNews Health Check', 'pass', 
          'Health check successful', getDuration, getParsed.body);
      } else {
        this.addResult('FetchNews Health Check', 'fail', 
          'Health check failed', getDuration, getParsed);
      }

      // Test POST request (news fetch)
      const postStartTime = Date.now();
      const postRequest = this.createRequest('POST', '/fetchNews');
      const postResponse = await fetchNewsHandler(postRequest);
      const postParsed = await this.parseResponse(postResponse);
      
      const postDuration = Date.now() - postStartTime;
      
      if (postParsed.status === 200 && postParsed.body?.success !== undefined) {
        if (postParsed.body.success) {
          this.addResult('FetchNews Update', 'pass', 
            `News update successful: ${postParsed.body.message}`, postDuration, postParsed.body.data);
        } else {
          this.addResult('FetchNews Update', 'fail', 
            `News update failed: ${postParsed.body.error}`, postDuration, postParsed.body);
        }
      } else {
        this.addResult('FetchNews Update', 'fail', 
          'Invalid response format', postDuration, postParsed);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addResult('FetchNews Endpoint', 'fail', 
        `FetchNews test error: ${error.message}`, duration);
    }
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const requests = [];
      const clientIP = '192.168.1.100';
      
      // Send multiple requests quickly to trigger rate limiting
      for (let i = 0; i < 12; i++) {
        const request = this.createRequest('POST', '/chat', 
          { message: `Rate limit test message ${i}` },
          { 'x-forwarded-for': clientIP }
        );
        requests.push(chatHandler(request));
      }
      
      const responses = await Promise.all(requests);
      const parsedResponses = await Promise.all(
        responses.map(r => this.parseResponse(r))
      );
      
      const duration = Date.now() - startTime;
      
      const rateLimitedCount = parsedResponses.filter(r => r.status === 429).length;
      
      if (rateLimitedCount > 0) {
        this.addResult('Rate Limiting', 'pass', 
          `Rate limiting working (${rateLimitedCount} requests limited)`, duration);
      } else {
        this.addResult('Rate Limiting', 'fail', 
          'Rate limiting not triggered', duration, { responses: parsedResponses.length });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addResult('Rate Limiting', 'fail', 
        `Rate limiting test error: ${error.message}`, duration);
    }
  }

  /**
   * Test response time performance
   */
  async testPerformance(): Promise<void> {
    const performanceTests = [
      { name: 'Simple Query', message: 'What is SIP?' },
      { name: 'Complex Query', message: 'Explain the difference between equity and debt mutual funds with examples' },
      { name: 'Market Query', message: 'Current market conditions and investment advice' }
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      
      try {
        const request = this.createRequest('POST', '/chat', { message: test.message });
        const response = await chatHandler(request);
        await this.parseResponse(response);
        
        const duration = Date.now() - startTime;
        
        if (duration < 30000) { // 30 second timeout
          this.addResult(`Performance: ${test.name}`, 'pass', 
            `Response time acceptable (${duration}ms)`, duration);
        } else {
          this.addResult(`Performance: ${test.name}`, 'fail', 
            `Response time too slow (${duration}ms)`, duration);
        }
        
      } catch (error) {
        const duration = Date.now() - startTime;
        this.addResult(`Performance: ${test.name}`, 'fail', 
          `Performance test error: ${error.message}`, duration);
      }
    }
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting integration tests...\n');

    await this.testChatCORS();
    await this.testChatValidRequest();
    await this.testChatWithNewsContext();
    await this.testChatErrorHandling();
    await this.testFetchNewsEndpoint();
    await this.testRateLimiting();
    await this.testPerformance();

    return this.results;
  }

  /**
   * Print test results
   */
  printResults(): void {
    console.log('\n📊 Integration Test Results:');
    console.log('============================\n');

    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;

    for (const result of this.results) {
      const icon = result.status === 'pass' ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.message} (${result.duration}ms)`);
      
      if (result.details && result.status === 'fail') {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Passed: ${passCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📊 Total: ${this.results.length}`);

    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    console.log(`   ⏱️ Average Duration: ${avgDuration.toFixed(0)}ms`);

    if (failCount === 0) {
      console.log('\n🎉 All integration tests passed!');
    } else {
      console.log('\n❌ Some integration tests failed. Please review the results above.');
    }
  }

  /**
   * Get overall test status
   */
  getOverallStatus(): 'pass' | 'fail' {
    return this.results.some(r => r.status === 'fail') ? 'fail' : 'pass';
  }
}

/**
 * Main test runner function
 */
export async function runIntegrationTests(): Promise<{
  status: 'pass' | 'fail';
  results: TestResult[];
}> {
  const runner = new IntegrationTestRunner();
  const results = await runner.runAllTests();
  runner.printResults();
  
  return {
    status: runner.getOverallStatus(),
    results
  };
}

// If this script is run directly, execute tests
if (import.meta.main) {
  try {
    const testResults = await runIntegrationTests();
    
    // Exit with appropriate code
    Deno.exit(testResults.status === 'pass' ? 0 : 1);
  } catch (error) {
    console.error('❌ Integration test runner failed:', error.message);
    Deno.exit(1);
  }
}