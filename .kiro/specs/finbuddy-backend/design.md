# FinBuddy Backend Design Document

## Overview

The FinBuddy Backend is a serverless Node.js/TypeScript system deployed on Supabase Edge Functions. It provides AI-powered financial chat capabilities with contextual news integration and automated news updates. The system is designed to be completely free, modular, and easily maintainable.

## Architecture

```mermaid
graph TB
    Frontend[Frontend Application] --> ChatAPI[/chat API Endpoint]
    ChatAPI --> MessageAnalyzer[Message Analyzer]
    MessageAnalyzer --> NewsRetriever[News Retriever]
    MessageAnalyzer --> ResponseGenerator[AI Response Generator]
    NewsRetriever --> SupabaseDB[(Supabase Database)]
    ResponseGenerator --> HuggingFace[HuggingFace API]
    
    Scheduler[Supabase Cron] --> NewsFunction[/fetchNews Function]
    NewsFunction --> NewsAPI[External News API]
    NewsFunction --> SupabaseDB
    
    subgraph "Supabase Edge Functions"
        ChatAPI
        NewsFunction
    end
    
    subgraph "External Services"
        HuggingFace
        NewsAPI
    end
```

## Components and Interfaces

### 1. Chat API Endpoint (`/chat`)

**Purpose**: Main API endpoint for processing user messages and returning AI responses

**Interface**:
```typescript
// Request
POST /chat
Content-Type: application/json
{
  "message": string
}

// Response
{
  "success": boolean,
  "message": string,
  "error"?: string
}
```

**Key Features**:
- CORS enabled for frontend integration
- Message content analysis to determine news relevance
- Conditional news retrieval based on message context
- Error handling with appropriate HTTP status codes

### 2. News Fetcher Function (`/fetchNews`)

**Purpose**: Scheduled function to retrieve and store latest financial news

**Interface**:
```typescript
// Triggered by Supabase Cron (every 6 hours)
// No direct HTTP interface - internal function

// Database Update
INSERT INTO latest_news (headline, url, published_at, source)
VALUES (...)
```

**Key Features**:
- Automatic execution every 6 hours
- Integration with free news APIs (NewsData.io or Finnhub.io)
- Error handling and retry logic
- Cleanup of old news entries (keep only latest 10)

### 3. Message Analyzer Module

**Purpose**: Analyzes user messages to determine if current news context is needed

**Logic**:
- Keywords detection: "market", "stock", "current", "today", "news", "latest"
- Question type analysis: market conditions, current events, specific company news
- Returns boolean indicating whether to include news context

### 4. Supabase Client Module

**Purpose**: Centralized database operations

**Database Schema**:
```sql
CREATE TABLE latest_news (
  id SERIAL PRIMARY KEY,
  headline TEXT NOT NULL,
  url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_latest_news_created_at ON latest_news(created_at DESC);
```

### 5. AI Response Generator Module

**Purpose**: Handles communication with HuggingFace API

**Configuration**:
- Primary Model: `meta-llama/Llama-3.1-8B-Instruct`
- Fallback Model: `google/gemma-7b-it`
- Temperature: 0.7 for balanced creativity and accuracy
- Max tokens: 500 for concise responses

## Data Models

### News Item
```typescript
interface NewsItem {
  id: number;
  headline: string;
  url?: string;
  published_at: string;
  source: string;
  created_at: string;
}
```

### Chat Request
```typescript
interface ChatRequest {
  message: string;
}
```

### Chat Response
```typescript
interface ChatResponse {
  success: boolean;
  message: string;
  error?: string;
}
```

### AI Context
```typescript
interface AIContext {
  systemPrompt: string;
  userMessage: string;
  newsContext?: string;
}
```

## Error Handling

### API Error Responses
- 400 Bad Request: Invalid or missing message in request body
- 429 Too Many Requests: Rate limiting exceeded
- 500 Internal Server Error: Database or AI API failures
- 503 Service Unavailable: External service unavailable

### Error Recovery Strategies
1. **HuggingFace API Failures**: Retry with exponential backoff, fallback to secondary model
2. **News API Failures**: Continue with cached news, log error for monitoring
3. **Database Failures**: Return error response, implement circuit breaker pattern
4. **Timeout Handling**: 30-second timeout for AI API calls, 10-second for database operations

## Testing Strategy

### Unit Tests
- Message analyzer logic validation
- News relevance detection accuracy
- Database query functions
- AI prompt construction

### Integration Tests
- End-to-end chat flow with mock AI responses
- News fetching and storage workflow
- Error handling scenarios
- CORS functionality verification

### Performance Tests
- Response time under load (target: <3 seconds)
- Database query optimization
- Memory usage monitoring
- Concurrent request handling

## Security Considerations

### API Security
- Input validation and sanitization
- Rate limiting per IP address
- CORS configuration for specific domains
- Environment variable protection

### Data Privacy
- No storage of user messages
- Minimal news data retention (10 latest items)
- No personal information collection
- Secure API key management

## Deployment Configuration

### Environment Variables
```
HF_API_KEY=your_huggingface_api_key
NEWS_API_KEY=your_news_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### Supabase Edge Functions Setup
- Function deployment via Supabase CLI
- Cron job configuration for news fetching
- Database migrations for table creation
- Environment variable configuration in Supabase dashboard

### Free Tier Limitations
- HuggingFace: 1000 requests/month (sufficient for prototype)
- NewsData.io: 200 requests/day (33 news updates daily)
- Supabase: 500MB database, 2GB bandwidth (adequate for news storage)
- Edge Functions: 500,000 invocations/month

## System Prompt Design

The FinBuddy personality will be implemented as:

```
You are FinBuddy — a friendly, trustworthy Indian AI financial assistant for young investors. 
You help users understand investing, saving, budgeting, and financial concepts. 
Always be conversational, positive, and responsible. 
Provide educational context and examples, not personal financial recommendations.
Focus on Indian financial markets and regulations when relevant.
Keep responses concise and actionable.

[CONTEXT: Include only when user asks about current market conditions or news]
Recent Financial News:
{news_headlines}

User Question: {user_message}
```

## Performance Optimization

### Caching Strategy
- In-memory caching of latest news for 1 hour
- System prompt template caching
- Database connection pooling

### Response Time Targets
- Chat API: <3 seconds average response time
- News fetching: <30 seconds execution time
- Database queries: <500ms average

### Scalability Considerations
- Stateless function design for horizontal scaling
- Database indexing for efficient news retrieval
- Asynchronous processing where possible