# News Fetching Tests

This document describes the unit tests for the news fetching functionality in the FinBuddy backend system.

## Test Files

- `news-fetching.test.ts` - Deno-based tests for Supabase Edge Functions environment
- `news-fetching.test.js` - Node.js-based tests for local development

## Running Tests

### Deno Tests (Recommended for Edge Functions)
```bash
deno test supabase/functions/_shared/news-fetching.test.ts --allow-env --allow-net
```

### Node.js Tests (For local development)
```bash
node supabase/functions/_shared/news-fetching.test.js
```

## Test Coverage

### NewsAPIClient Tests

1. **NewsData.io API Integration**
   - Tests successful API responses with proper data transformation
   - Validates article structure (headline, URL, timestamp, source)
   - Verifies response format compliance

2. **Finnhub API Fallback**
   - Tests fallback mechanism when NewsData.io is unavailable
   - Validates timestamp conversion from Unix format
   - Ensures proper article filtering and formatting

3. **Error Handling**
   - Network failures and API timeouts
   - HTTP error responses (401, 429, 500, etc.)
   - Malformed API responses
   - Rate limiting behavior

4. **Configuration Management**
   - Tests behavior when no API keys are configured
   - Validates `isConfigured()` method accuracy
   - Ensures graceful degradation

### NewsStorageService Tests

1. **Database Operations**
   - Successful news storage and retrieval
   - Database cleanup operations (maintaining max 10 items)
   - News item sanitization and validation
   - Transaction handling and rollback scenarios

2. **Integration with NewsAPIClient**
   - End-to-end news fetching and storage workflow
   - Error propagation from API to storage layer
   - Proper handling of empty or invalid API responses

3. **Context Retrieval**
   - `getLatestNewsForContext()` functionality
   - Limit parameter handling
   - Error recovery for database failures

4. **Health Monitoring**
   - Database health checks
   - API configuration status
   - News freshness tracking
   - System status reporting

### Error Scenarios Tested

1. **API Failures**
   - Network connectivity issues
   - API rate limit exceeded
   - Invalid API keys or authentication failures
   - Service unavailability

2. **Database Failures**
   - Connection timeouts
   - Query execution errors
   - Transaction failures
   - Storage capacity issues

3. **Data Validation**
   - Malformed news articles
   - Missing required fields
   - Invalid timestamps
   - Oversized content

## Mock Implementation Details

### MockNewsAPIClient
- Simulates both NewsData.io and Finnhub API responses
- Configurable failure modes for testing error scenarios
- Rate limiting simulation
- Response format validation

### MockSupabaseClient
- Database operation simulation
- Configurable failure modes
- Transaction and cleanup logic testing
- Health check simulation

### MockNewsStorageService
- Complete service layer testing
- Integration between API client and database
- Error handling and recovery testing
- Business logic validation

## Test Data

### Sample NewsData.io Response
```json
{
  "status": "success",
  "results": [
    {
      "title": "Sensex rises 200 points on positive market sentiment",
      "link": "https://example.com/news1",
      "pubDate": "2024-10-25T10:00:00Z",
      "source_id": "economic-times"
    }
  ]
}
```

### Sample Finnhub Response
```json
[
  {
    "headline": "Indian markets open higher on global cues",
    "url": "https://example.com/finnhub1",
    "datetime": 1698235200,
    "source": "Reuters"
  }
]
```

## Performance Considerations

### Test Execution Time
- All tests complete within 2-3 seconds
- Async operations use minimal delays for simulation
- No actual network calls in test environment

### Memory Usage
- Mock objects use minimal memory footprint
- Test data is cleaned up after each test
- No persistent state between test runs

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run News Fetching Tests (Node.js)
  run: node supabase/functions/_shared/news-fetching.test.js

- name: Run News Fetching Tests (Deno)
  run: deno test supabase/functions/_shared/news-fetching.test.ts --allow-env --allow-net
```

### Local Development
```bash
# Run all tests
npm run test:news

# Run specific test file
node supabase/functions/_shared/news-fetching.test.js
```

## Requirements Coverage

The tests validate the following requirements from the specification:

- **Requirement 3.1**: Automated news fetching every 6 hours
- **Requirement 3.2**: External news API integration with error handling
- **Requirement 3.3**: Database storage and cleanup operations
- **Requirement 3.4**: Indian financial news filtering
- **Requirement 3.5**: Rate limiting and duplicate prevention

## Future Enhancements

1. **Load Testing**
   - High-volume news processing
   - Concurrent request handling
   - Database performance under load

2. **Integration Testing**
   - Real API endpoint testing (with test keys)
   - Database migration testing
   - End-to-end workflow validation

3. **Security Testing**
   - Input sanitization validation
   - SQL injection prevention
   - API key security testing

## Troubleshooting

### Common Issues

1. **Test Timeouts**
   - Increase timeout values for slow environments
   - Check network connectivity for Deno tests

2. **Mock Data Issues**
   - Ensure mock responses match actual API formats
   - Validate test data consistency

3. **Environment Variables**
   - Tests should not require real API keys
   - Mock environment setup for isolated testing

### Debug Mode
```bash
# Enable debug logging
DEBUG=true node supabase/functions/_shared/news-fetching.test.js
```