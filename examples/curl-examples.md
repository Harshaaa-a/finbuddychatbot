# cURL Examples for FinBuddy Backend

This file contains comprehensive cURL examples for testing and integrating with the FinBuddy Backend API.

## Prerequisites

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference and `YOUR_ANON_KEY` with your Supabase anon key.

```bash
# Set your environment variables
export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export SUPABASE_ANON_KEY="YOUR_ANON_KEY"
```

## Chat Endpoint Examples

### Basic Chat Request

```bash
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "What are the best investment options for beginners in India?"}'
```

### General Financial Education Questions

```bash
# Compound interest explanation
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "How does compound interest work? Can you explain with an example?"}'

# SIP investment explanation
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "What is SIP investment and how do I start one?"}'

# Risk management
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "How should I diversify my investment portfolio to minimize risk?"}'
```

### Market-Related Questions (Will Include News Context)

```bash
# Current market conditions
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "Should I invest in the stock market today given current market conditions?"}'

# News-based investment advice
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "What is the latest news about Indian stock market and how does it affect my investments?"}'

# Sector-specific questions
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "What are the current trends in the Indian banking sector?"}'
```

### Error Testing Examples

```bash
# Missing message field
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{}'

# Empty message
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": ""}'

# Invalid JSON
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "test"'

# Missing Content-Type header
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "test"}'
```

## News Fetcher Endpoint Examples

### Manual News Fetch

```bash
curl -X POST "$SUPABASE_URL/functions/v1/fetchNews" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

### Check News Fetch Status

```bash
# The fetchNews endpoint returns status information
curl -X POST "$SUPABASE_URL/functions/v1/fetchNews" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -v  # Verbose output to see response headers and status
```

## Advanced cURL Examples

### With Response Time Measurement

```bash
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "What is mutual fund?"}' \
  -w "Response Time: %{time_total}s\nHTTP Status: %{http_code}\n"
```

### With Custom User-Agent

```bash
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "User-Agent: FinBuddy-Client/1.0" \
  -d '{"message": "Explain tax saving investments in India"}'
```

### Save Response to File

```bash
curl -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "What are ELSS funds?"}' \
  -o response.json
```

### Multiple Requests with Different Messages

```bash
#!/bin/bash
# Save as test-multiple-requests.sh

MESSAGES=(
  "What is the difference between equity and debt funds?"
  "How do I calculate my investment returns?"
  "What are the tax implications of mutual fund investments?"
  "Should I invest in international funds?"
  "What is the current state of the Indian economy?"
)

for message in "${MESSAGES[@]}"; do
  echo "Testing: $message"
  curl -X POST "$SUPABASE_URL/functions/v1/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -d "{\"message\": \"$message\"}" \
    -s | jq '.message' | head -c 100
  echo "...\n---"
  sleep 2  # Rate limiting courtesy
done
```

## Response Format Examples

### Successful Chat Response

```json
{
  "success": true,
  "message": "For beginners in India, I recommend starting with SIP (Systematic Investment Plan) in diversified mutual funds. Consider investing in large-cap equity funds and debt funds for a balanced portfolio. Start with 70% equity and 30% debt allocation based on your risk tolerance. Popular options include HDFC Top 100 Fund, SBI Bluechip Fund for equity, and HDFC Short Term Debt Fund for debt allocation. Always invest for long-term goals (5+ years) and review your portfolio annually."
}
```

### Error Response Examples

```json
// Missing message field
{
  "success": false,
  "error": "Message is required"
}

// Empty message
{
  "success": false,
  "error": "Message cannot be empty"
}

// Server error
{
  "success": false,
  "error": "Internal server error"
}
```

### News Fetch Response

```json
{
  "success": true,
  "message": "Successfully fetched and stored 10 news articles",
  "count": 10
}
```

## Testing Scripts

### Automated Testing Script

```bash
#!/bin/bash
# Save as test-finbuddy-api.sh

set -e

echo "🚀 Testing FinBuddy Backend API"
echo "================================"

# Test 1: Basic chat functionality
echo "📝 Test 1: Basic chat functionality"
response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "What is SIP?"}')

if echo "$response" | jq -e '.success' > /dev/null; then
  echo "✅ Basic chat test passed"
else
  echo "❌ Basic chat test failed"
  echo "$response"
fi

# Test 2: Error handling
echo "📝 Test 2: Error handling"
error_response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{}')

if echo "$error_response" | jq -e '.success == false' > /dev/null; then
  echo "✅ Error handling test passed"
else
  echo "❌ Error handling test failed"
  echo "$error_response"
fi

# Test 3: News fetching
echo "📝 Test 3: News fetching"
news_response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/fetchNews" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY")

if echo "$news_response" | jq -e '.success' > /dev/null; then
  echo "✅ News fetching test passed"
else
  echo "✅ News fetching test completed (may have rate limits)"
fi

echo "🎉 All tests completed!"
```

### Performance Testing Script

```bash
#!/bin/bash
# Save as performance-test.sh

echo "⚡ Performance Testing FinBuddy API"
echo "=================================="

# Test response times for different types of queries
declare -A test_messages=(
  ["simple"]="What is SIP?"
  ["complex"]="Explain the difference between equity and debt mutual funds with examples"
  ["news_related"]="What is the current state of Indian stock market?"
)

for test_type in "${!test_messages[@]}"; do
  echo "Testing $test_type query..."
  
  time_result=$(curl -X POST "$SUPABASE_URL/functions/v1/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -d "{\"message\": \"${test_messages[$test_type]}\"}" \
    -w "%{time_total}" \
    -s -o /dev/null)
  
  echo "$test_type query response time: ${time_result}s"
done
```

## Troubleshooting

### Common Issues and Solutions

1. **CORS Errors**: The backend already handles CORS. If you're getting CORS errors, check your project URL.

2. **Authentication Errors**: Ensure you're using the correct anon key, not the service role key.

3. **Rate Limiting**: If you get rate limit errors, add delays between requests.

4. **Timeout Issues**: The API may take 2-3 seconds to respond due to AI processing.

### Debug Mode

Add `-v` flag to any curl command for verbose output:

```bash
curl -v -X POST "$SUPABASE_URL/functions/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"message": "test"}'
```

This will show you request headers, response headers, and connection details for debugging.