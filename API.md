# FinBuddy Backend API Documentation

Complete API reference for the FinBuddy Backend system.

## Base URL

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1
```

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference ID.

## Authentication

All API endpoints require authentication using Supabase API keys:

```http
Authorization: Bearer YOUR_ANON_KEY
```

Get your API keys from: **Supabase Dashboard > Project Settings > API**

## Endpoints

### 1. Chat Endpoint

Send messages to FinBuddy and receive AI-powered financial advice.

#### Request

```http
POST /chat
Content-Type: application/json
Authorization: Bearer YOUR_ANON_KEY
```

**Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | User's financial question or message |

**Example Request:**

```bash
curl -X POST https://your-project.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "message": "What is the difference between SIP and lump sum investment?"
  }'
```

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "SIP (Systematic Investment Plan) and lump sum are two different investment approaches. SIP involves investing a fixed amount regularly (monthly/quarterly), which helps in rupee cost averaging and reduces market timing risk. Lump sum investment means investing a large amount at once, which can be beneficial when markets are low but carries higher timing risk. For beginners, SIP is generally recommended as it instills discipline and reduces volatility impact."
}
```

**Error Responses:**

```json
// 400 Bad Request - Missing or invalid message
{
  "success": false,
  "error": "Message is required and must be a non-empty string"
}

// 429 Too Many Requests - Rate limit exceeded
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}

// 500 Internal Server Error - Server error
{
  "success": false,
  "error": "Internal server error. Please try again later."
}
```

#### Message Analysis

The system automatically analyzes your message to determine if current financial news context should be included:

**News-relevant keywords:** market, stock, current, today, news, latest, price, index, nifty, sensex, rupee, inflation

**Examples:**

- **General Question**: "What is compound interest?" → No news context
- **Market Question**: "Should I invest in stocks today?" → Includes latest news context

### 2. News Fetcher Endpoint

Manually trigger news fetching (normally runs automatically every 6 hours).

#### Request

```http
POST /fetchNews
Authorization: Bearer YOUR_ANON_KEY
```

**Example Request:**

```bash
curl -X POST https://your-project.supabase.co/functions/v1/fetchNews \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Successfully fetched and stored 10 news articles",
  "count": 10,
  "timestamp": "2024-10-27T10:30:00Z"
}
```

**Error Responses:**

```json
// 500 Internal Server Error - News API failure
{
  "success": false,
  "error": "Failed to fetch news from external API"
}

// 503 Service Unavailable - Database error
{
  "success": false,
  "error": "Database temporarily unavailable"
}
```

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "message": "Response content",
  "data": {}, // Optional additional data
  "timestamp": "2024-10-27T10:30:00Z" // Optional timestamp
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE", // Optional error code
  "timestamp": "2024-10-27T10:30:00Z"
}
```

## HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid API key |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - External service down |

## Rate Limits

### Free Tier Limits

- **Chat Endpoint**: Limited by HuggingFace API (1,000 requests/month)
- **News Endpoint**: Limited by News API (200 requests/day for NewsData.io)
- **Supabase**: 500,000 function invocations/month

### Rate Limiting Headers

Responses include rate limiting information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1635724800
```

## Error Handling

### Client-Side Error Handling

```javascript
async function chatWithFinBuddy(message) {
  try {
    const response = await fetch('https://your-project.supabase.co/functions/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ANON_KEY'
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (data.success) {
      return data.message;
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Chat API Error:', error.message);
    
    // Handle specific error types
    if (error.message.includes('Rate limit')) {
      return 'I\'m currently busy. Please try again in a few minutes.';
    } else if (error.message.includes('Network')) {
      return 'I\'m having trouble connecting. Please check your internet connection.';
    } else {
      return 'I\'m experiencing technical difficulties. Please try again later.';
    }
  }
}
```

### Retry Logic

Implement exponential backoff for transient errors:

```javascript
async function chatWithRetry(message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await chatWithFinBuddy(message);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## SDK Examples

### JavaScript/TypeScript

#### Using Fetch API

```javascript
class FinBuddyAPI {
  constructor(projectRef, apiKey) {
    this.baseURL = `https://${projectRef}.supabase.co/functions/v1`;
    this.apiKey = apiKey;
  }

  async chat(message) {
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    return data.message;
  }

  async fetchNews() {
    const response = await fetch(`${this.baseURL}/fetchNews`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    return data;
  }
}

// Usage
const finbuddy = new FinBuddyAPI('your-project-ref', 'your-anon-key');

try {
  const response = await finbuddy.chat('What is mutual fund?');
  console.log(response);
} catch (error) {
  console.error('Error:', error.message);
}
```

#### Using Supabase Client

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project-ref.supabase.co',
  'your-anon-key'
);

async function chatWithFinBuddy(message) {
  const { data, error } = await supabase.functions.invoke('chat', {
    body: { message }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.message;
}

async function fetchNews() {
  const { data, error } = await supabase.functions.invoke('fetchNews');

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
```

### Python

```python
import requests
import json

class FinBuddyAPI:
    def __init__(self, project_ref, api_key):
        self.base_url = f"https://{project_ref}.supabase.co/functions/v1"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
    
    def chat(self, message):
        response = requests.post(
            f"{self.base_url}/chat",
            headers=self.headers,
            json={"message": message}
        )
        
        data = response.json()
        
        if not data.get("success"):
            raise Exception(data.get("error", "Unknown error"))
        
        return data["message"]
    
    def fetch_news(self):
        response = requests.post(
            f"{self.base_url}/fetchNews",
            headers={"Authorization": self.headers["Authorization"]}
        )
        
        data = response.json()
        
        if not data.get("success"):
            raise Exception(data.get("error", "Unknown error"))
        
        return data

# Usage
finbuddy = FinBuddyAPI("your-project-ref", "your-anon-key")

try:
    response = finbuddy.chat("What is SIP investment?")
    print(response)
except Exception as e:
    print(f"Error: {e}")
```

### React Hook

```jsx
import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export function useFinBuddy() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (message) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { message }
      });
      
      if (error) throw error;
      
      return data.message;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetchNews');
      
      if (error) throw error;
      
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendMessage, fetchNews, loading, error };
}

// Usage in component
function ChatComponent() {
  const { sendMessage, loading, error } = useFinBuddy();
  const [response, setResponse] = useState('');

  const handleSendMessage = async (message) => {
    const result = await sendMessage(message);
    if (result) {
      setResponse(result);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {response && <p>{response}</p>}
      <button onClick={() => handleSendMessage('What is mutual fund?')}>
        Ask FinBuddy
      </button>
    </div>
  );
}
```

## Webhooks (Future Feature)

*Note: Webhooks are planned for future releases*

### News Update Webhook

Receive notifications when new financial news is available:

```http
POST /your-webhook-endpoint
Content-Type: application/json

{
  "event": "news.updated",
  "timestamp": "2024-10-27T10:30:00Z",
  "data": {
    "count": 5,
    "latest_headline": "RBI announces new monetary policy..."
  }
}
```

## Testing

### Test Endpoints

Use these sample requests to test your integration:

```bash
# Test chat with general question
curl -X POST https://your-project.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"message": "What is compound interest?"}'

# Test chat with market question (includes news)
curl -X POST https://your-project.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"message": "Should I invest in stocks today?"}'

# Test news fetching
curl -X POST https://your-project.supabase.co/functions/v1/fetchNews \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Postman Collection

Import this Postman collection for easy testing:

```json
{
  "info": {
    "name": "FinBuddy Backend API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://your-project-ref.supabase.co/functions/v1"
    },
    {
      "key": "apiKey",
      "value": "your-anon-key"
    }
  ],
  "item": [
    {
      "name": "Chat",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{apiKey}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"message\": \"What is mutual fund?\"}"
        },
        "url": "{{baseUrl}}/chat"
      }
    },
    {
      "name": "Fetch News",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{apiKey}}"
          }
        ],
        "url": "{{baseUrl}}/fetchNews"
      }
    }
  ]
}
```

---

For more information, see the [main README](README.md) or [deployment guide](DEPLOYMENT.md).