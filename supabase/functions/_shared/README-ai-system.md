# AI Response Generation System

This directory contains the complete AI response generation system for FinBuddy, including HuggingFace API integration, prompt construction, and response processing.

## Core Modules

### 1. HuggingFace Client (`huggingface-client.ts`)
- **Purpose**: Handles communication with HuggingFace Inference API
- **Features**:
  - Primary model: `meta-llama/Llama-3.1-8B-Instruct`
  - Fallback model: `google/gemma-7b-it`
  - Automatic retry logic with exponential backoff
  - Model loading detection and waiting
  - Timeout handling (30 seconds)
  - Error recovery and user-friendly error messages

### 2. Prompt Builder (`prompt-builder.ts`)
- **Purpose**: Constructs system prompts with optional news context
- **Features**:
  - FinBuddy personality integration
  - Conditional news context injection
  - Token limit management (2000 tokens max)
  - Message validation and sanitization
  - Response cleaning and formatting
  - Token usage monitoring

### 3. AI Response Generator (`ai-response-generator.ts`)
- **Purpose**: Main orchestrator combining all AI functionality
- **Features**:
  - Complete request-to-response flow
  - Error handling with user-friendly messages
  - Integration with message analyzer for news context decisions
  - Connection testing capabilities

## Usage Examples

### Basic Usage
```typescript
import { generateAIResponse } from './ai-response-generator.ts';

const response = await generateAIResponse("How do I start investing?");
console.log(response.message);
```

### With News Context
```typescript
import { createAIResponseGenerator } from './ai-response-generator.ts';
import { getLatestNews } from './supabase-client.ts';

const generator = createAIResponseGenerator();
const newsItems = await getLatestNews(3);
const response = await generator.generateResponse(
  "Should I invest in current market conditions?", 
  newsItems
);
```

### Error Handling
```typescript
const response = await generateAIResponse("Your message here");

if (!response.success) {
  console.error('Error:', response.error);
} else {
  console.log('AI Response:', response.message);
}
```

## Configuration

### Environment Variables
- `HF_API_KEY`: HuggingFace API key (required)

### Model Configuration (in `config.ts`)
```typescript
AI: {
  PRIMARY_MODEL: "meta-llama/Llama-3.1-8B-Instruct",
  FALLBACK_MODEL: "google/gemma-7b-it",
  TEMPERATURE: 0.7,
  MAX_TOKENS: 500,
  TIMEOUT_MS: 30000
}
```

## Response Flow

1. **Message Validation**: Check message format, length, and content
2. **Context Analysis**: Determine if news context is needed using message analyzer
3. **News Retrieval**: Fetch latest news items if context is required
4. **Prompt Construction**: Build system prompt with FinBuddy personality and optional news
5. **Token Management**: Ensure prompt stays within model limits
6. **AI Generation**: Call HuggingFace API with fallback support
7. **Response Cleaning**: Format and sanitize AI response
8. **Error Handling**: Convert technical errors to user-friendly messages

## Error Handling

The system provides comprehensive error handling for:

- **API Timeouts**: "The AI service is taking too long to respond"
- **Rate Limits**: "The AI service is currently busy"
- **Service Unavailable**: "The AI service is temporarily unavailable"
- **Authentication**: "Configuration issue with the AI service"
- **Invalid Input**: Specific validation error messages
- **Model Loading**: Automatic waiting and retry

## Token Management

- **Maximum Prompt**: 2000 tokens (including system prompt + user message)
- **Response Limit**: 500 tokens maximum
- **Estimation**: ~4 characters per token
- **Truncation**: Smart truncation at sentence boundaries
- **Monitoring**: Token usage statistics available

## News Context Integration

The system automatically determines when to include news context based on:

- **Keywords**: market, stock, current, today, news, etc.
- **Patterns**: "What's happening...", "Should I buy...", etc.
- **Question Analysis**: Market queries, news queries, company-specific questions
- **Confidence Scoring**: Threshold-based decision making

When news context is included:
- Latest 3 news headlines are formatted
- Context is injected into system prompt
- User is advised when news is relevant to their question

## Free Tier Considerations

- **HuggingFace**: 1000 requests/month on free tier
- **Model Loading**: May take 10-20 seconds for cold starts
- **Rate Limits**: Automatic retry with exponential backoff
- **Fallback Models**: Ensures availability when primary model is busy

## Testing

```typescript
// Test connection
const generator = createAIResponseGenerator();
const isWorking = await generator.testConnection();

// Test with sample message
const testResponse = await generateAIResponse("Hello FinBuddy!");
```

## Integration with Chat Endpoint

```typescript
// In your chat endpoint
import { generateAIResponse } from './_shared/ai-response-generator.ts';
import { getLatestNews } from './_shared/supabase-client.ts';

export default async function handler(req: Request) {
  const { message } = await req.json();
  
  // Get news for context
  const newsItems = await getLatestNews(3);
  
  // Generate AI response
  const aiResponse = await generateAIResponse(message, newsItems);
  
  return new Response(JSON.stringify(aiResponse), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```