# FinBuddy Backend

A complete free backend system for an AI finance chatbot that helps users learn about investing, personal finance, and current financial news in India. Built with Supabase Edge Functions and powered by free AI models.

## Features

- 🤖 AI-powered chat responses using HuggingFace free models (Llama-3.1-8B-Instruct, Gemma-7b-it)
- 📰 Automated financial news fetching and integration (NewsData.io, Finnhub.io)
- 🚀 Serverless deployment on Supabase Edge Functions
- 💰 Completely free to run (within free tier limits)
- 🇮🇳 Focused on Indian financial markets and regulations
- ⚡ Real-time news context integration based on message analysis
- 🔒 Secure API with CORS support and error handling
- 📊 Automated database cleanup and optimization

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
```

### Core Components

- **Chat Endpoint** (`/chat`): Processes user messages and returns AI responses with contextual news
- **News Fetcher** (`/fetchNews`): Scheduled function to retrieve latest financial news every 6 hours
- **Message Analyzer**: Determines if user queries need current news context
- **Database**: Supabase PostgreSQL for news storage with automatic cleanup
- **AI Integration**: HuggingFace free models with fallback support

## Prerequisites

Before you begin, ensure you have the following installed:

- [Supabase CLI](https://supabase.com/docs/guides/cli) (v1.100.0 or higher)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Deno](https://deno.land/) (v1.37.0 or higher)
- [Git](https://git-scm.com/) for version control

### Required API Keys (All Free Tier)

1. **HuggingFace API Key**: Sign up at [HuggingFace](https://huggingface.co/) and get your free API key
2. **News API Key**: Choose one:
   - [NewsData.io](https://newsdata.io/) - 200 requests/day free
   - [Finnhub.io](https://finnhub.io/) - 60 calls/minute free
3. **Supabase Project**: Create a free project at [Supabase](https://supabase.com/)

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd finbuddy-backend
npm install
```

### 2. Environment Variables Setup

Copy the example environment file:

```bash
cp supabase/functions/.env.example supabase/functions/.env
```

Fill in your API keys in `supabase/functions/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# HuggingFace API Configuration
HF_API_KEY=hf_your_huggingface_api_key

# News API Configuration (choose one)
NEWS_API_KEY=your_newsdata_io_api_key
# Alternative: FINNHUB_API_KEY=your_finnhub_api_key

# Environment
ENVIRONMENT=production
```

### 3. Supabase Project Setup

#### Option A: New Supabase Project

1. Create a new project at [Supabase Dashboard](https://supabase.com/dashboard)
2. Initialize locally:

```bash
supabase login
supabase init
supabase link --project-ref your-project-ref
```

#### Option B: Existing Supabase Project

```bash
supabase login
supabase link --project-ref your-project-ref
```

### 4. Database Setup

Run the database migrations to create the news table:

```bash
supabase db push
```

This will create the `latest_news` table with proper indexes and constraints.

### 5. Deploy Edge Functions

#### Quick Deployment (Recommended)

Use the automated deployment script:

```bash
./deploy.sh
```

#### Manual Deployment

Deploy functions individually:

```bash
# Deploy chat function
supabase functions deploy chat --no-verify-jwt

# Deploy news fetcher function
supabase functions deploy fetchNews --no-verify-jwt
```

### 6. Configure Environment Variables in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Edge Functions** > **Settings**
3. Add the following environment variables:
   - `HF_API_KEY`: Your HuggingFace API key
   - `NEWS_API_KEY`: Your NewsData.io API key
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key

### 7. Set Up Automated News Fetching

#### Option A: Using Supabase Dashboard

1. Go to **Database** > **Extensions**
2. Enable the `pg_cron` extension
3. Go to **SQL Editor** and run:

```sql
SELECT cron.schedule(
  'finbuddy-fetch-news',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/fetchNews',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'
    ) as request_id;
  $$
);
```

#### Option B: Using SQL File

Run the provided SQL file:

```bash
supabase db reset --with-seed
# Then execute supabase/cron-setup.sql in your SQL editor
```

### 8. Test Your Deployment

Test the chat endpoint:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the best investment options for beginners in India?"}'
```

Test the news fetcher:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/fetchNews
```

## API Reference

### Chat Endpoint

**Endpoint**: `POST /functions/v1/chat`

**Description**: Send a message to FinBuddy and receive AI-powered financial advice.

#### Request

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"message": "What are the best investment options for beginners in India?"}'
```

**Request Body**:
```json
{
  "message": "Your question about finance, investing, or current market conditions"
}
```

#### Response

**Success Response** (200):
```json
{
  "success": true,
  "message": "For beginners in India, I recommend starting with SIP (Systematic Investment Plan) in diversified mutual funds. Consider investing in large-cap equity funds and debt funds for a balanced portfolio. Start with 70% equity and 30% debt allocation based on your risk tolerance..."
}
```

**Error Response** (400):
```json
{
  "success": false,
  "error": "Message is required"
}
```

#### Example Requests

**General Financial Question**:
```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How does compound interest work?"}'
```

**Market-Related Question** (includes news context):
```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Should I invest in the stock market today given current conditions?"}'
```

### News Fetcher Endpoint

**Endpoint**: `POST /functions/v1/fetchNews`

**Description**: Manually trigger news fetching (normally runs automatically every 6 hours).

#### Request

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/fetchNews \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

#### Response

**Success Response** (200):
```json
{
  "success": true,
  "message": "Successfully fetched and stored 10 news articles",
  "count": 10
}
```

### Integration Examples

For comprehensive integration examples with detailed error handling, testing, and best practices, see the [examples directory](./examples/):

- **[JavaScript Integration](./examples/javascript-integration.js)** - Vanilla JavaScript with advanced error handling and retry logic
- **[TypeScript Integration](./examples/typescript-integration.ts)** - Full TypeScript support with proper typing and error classes
- **[React Integration](./examples/react-integration.jsx)** - React hooks, components, and chat interfaces
- **[Vue.js Integration](./examples/vue-integration.js)** - Vue 3 Composition API examples
- **[Next.js Integration](./examples/nextjs-integration.js)** - API routes, SSR, and client-side integration
- **[Error Handling Examples](./examples/error-handling-examples.js)** - Comprehensive error handling patterns
- **[Testing Examples](./examples/testing-examples.js)** - Unit tests, integration tests, and mocking strategies
- **[cURL Examples](./examples/curl-examples.md)** - Command-line testing and debugging

#### Quick Start - JavaScript

```javascript
import { FinBuddyClient } from './examples/javascript-integration.js';

const client = new FinBuddyClient({
  supabaseUrl: 'https://your-project-ref.supabase.co',
  supabaseAnonKey: 'your_anon_key'
});

// Send a message
const response = await client.sendMessage("What is SIP investment?");
console.log(response.message);
```

#### Quick Start - React

```jsx
import { useFinBuddy } from './examples/react-integration.jsx';

function ChatComponent() {
  const { sendMessage, loading, error, conversation } = useFinBuddy();
  
  return (
    <div>
      {conversation.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <button onClick={() => sendMessage("What is compound interest?")}>
        Ask FinBuddy
      </button>
    </div>
  );
}
```

## Local Development

### Start Development Environment

1. **Start Supabase locally**:
```bash
supabase start
```

2. **Serve Edge Functions**:
```bash
supabase functions serve
```

This will start the local development environment with:
- **Supabase Studio**: `http://localhost:54323`
- **API Gateway**: `http://localhost:54321`
- **Chat Function**: `http://localhost:54321/functions/v1/chat`
- **News Function**: `http://localhost:54321/functions/v1/fetchNews`

### Development Scripts

```bash
# Start local Supabase (includes database, auth, storage, etc.)
npm run dev

# Deploy individual functions for testing
npm run deploy:chat
npm run deploy:news

# Run database migrations
npm run deploy:db

# Run tests
npm run test

# Lint code
npm run lint
```

### Testing Locally

Test the chat endpoint locally:

```bash
curl -X POST http://localhost:54321/functions/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is SIP investment?"}'
```

Test news fetching locally:

```bash
curl -X POST http://localhost:54321/functions/v1/fetchNews
```

### Environment Variables for Development

Create a `.env` file in the `supabase/functions/` directory:

```env
# Local development URLs
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=your_local_service_key

# API Keys (same as production)
HF_API_KEY=your_huggingface_api_key
NEWS_API_KEY=your_news_api_key
ENVIRONMENT=development
```

### Docker Development (Optional)

For containerized development:

```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f finbuddy-backend

# Stop containers
docker-compose down
```

## Free Tier Limitations & Usage Guidelines

### Service Limits

| Service | Free Tier Limit | Estimated Usage | Recommendation |
|---------|----------------|-----------------|----------------|
| **HuggingFace API** | 1,000 requests/month | ~33 requests/day | Perfect for prototyping and small apps |
| **NewsData.io** | 200 requests/day | 33 news updates (every 6 hours) | Sufficient for continuous news updates |
| **Finnhub.io** | 60 calls/minute | Alternative news source | Use as backup or primary |
| **Supabase Database** | 500MB storage | ~50,000 news articles | Auto-cleanup keeps only latest 10 |
| **Supabase Bandwidth** | 2GB/month | ~6,600 API calls | Suitable for moderate usage |
| **Edge Functions** | 500,000 invocations/month | ~16,600 calls/day | More than sufficient |

### Usage Optimization Tips

1. **Chat Requests**: Each user message = 1 HuggingFace API call
2. **News Fetching**: Runs automatically every 6 hours (4 calls/day)
3. **Database Storage**: Auto-cleanup maintains only 10 latest news items
4. **Caching**: News is cached for 1 hour to reduce database queries

### Monitoring Usage

Monitor your usage in respective dashboards:
- **HuggingFace**: [API Dashboard](https://huggingface.co/settings/tokens)
- **NewsData.io**: [Usage Dashboard](https://newsdata.io/dashboard)
- **Supabase**: [Project Dashboard](https://supabase.com/dashboard)

### Scaling Beyond Free Tier

When you exceed free tier limits:

1. **HuggingFace**: Upgrade to Pro ($9/month) for 10,000 requests
2. **NewsData.io**: Upgrade to Starter ($10/month) for 10,000 requests/day
3. **Supabase**: Pro plan ($25/month) for 8GB database and 250GB bandwidth
4. **Alternative**: Self-host using open-source models (Ollama, LocalAI)

## Project Structure

```
finbuddy-backend/
├── supabase/
│   ├── functions/
│   │   ├── chat/
│   │   │   ├── index.ts                    # Chat API endpoint
│   │   │   ├── chat-integration.test.ts    # Integration tests
│   │   │   └── README-integration-tests.md # Test documentation
│   │   ├── fetchNews/
│   │   │   └── index.ts                    # News fetcher function
│   │   ├── _shared/                        # Shared modules
│   │   │   ├── ai-response-generator.ts    # AI integration logic
│   │   │   ├── huggingface-client.ts       # HuggingFace API client
│   │   │   ├── message-analyzer.ts         # Message analysis logic
│   │   │   ├── news-api-client.ts          # News API integration
│   │   │   ├── news-storage.ts             # Database operations
│   │   │   ├── prompt-builder.ts           # AI prompt construction
│   │   │   ├── supabase-client.ts          # Supabase client
│   │   │   ├── config.ts                   # Configuration constants
│   │   │   ├── types.ts                    # TypeScript interfaces
│   │   │   └── *.test.ts                   # Unit tests
│   │   ├── .env.example                    # Environment template
│   │   ├── deno.json                       # Deno configuration
│   │   ├── import_map.json                 # Import mappings
│   │   ├── package.json                    # NPM scripts
│   │   └── Dockerfile                      # Container configuration
│   ├── migrations/
│   │   ├── 20241025000001_create_latest_news_table.sql
│   │   └── 20241025000002_create_latest_news_table.sql
│   ├── config.toml                         # Supabase configuration
│   └── cron-setup.sql                      # Cron job setup
├── deploy.sh                               # Deployment script
├── docker-compose.yml                      # Docker development setup
├── .env.example                            # Root environment template
├── package.json                            # Root package configuration
└── README.md                               # This documentation
```

### Key Files Explained

- **`chat/index.ts`**: Main chat endpoint handling user messages and AI responses
- **`fetchNews/index.ts`**: Scheduled function for automated news fetching
- **`_shared/`**: Reusable modules shared between functions
- **`ai-response-generator.ts`**: Handles HuggingFace API integration and response generation
- **`message-analyzer.ts`**: Analyzes user messages to determine if news context is needed
- **`news-api-client.ts`**: Integrates with external news APIs (NewsData.io, Finnhub.io)
- **`supabase-client.ts`**: Centralized database operations and connection handling
- **`deploy.sh`**: Automated deployment script for production setup
- **`cron-setup.sql`**: SQL commands to set up automated news fetching

## Troubleshooting

### Common Issues

#### 1. "Function not found" Error

**Problem**: Getting 404 when calling functions
**Solution**: 
```bash
# Ensure functions are deployed
supabase functions list
# Redeploy if needed
supabase functions deploy chat --no-verify-jwt
```

#### 2. "Invalid API Key" Error

**Problem**: HuggingFace or News API returning authentication errors
**Solution**:
1. Verify API keys in Supabase dashboard (Edge Functions > Settings)
2. Check API key format and permissions
3. Ensure environment variables are set correctly

#### 3. Database Connection Issues

**Problem**: Cannot connect to Supabase database
**Solution**:
```bash
# Check Supabase status
supabase status
# Reset local database
supabase db reset
# Check environment variables
```

#### 4. CORS Errors

**Problem**: Frontend cannot access the API
**Solution**: CORS is already configured in the functions. Ensure you're using the correct project URL.

#### 5. News Fetching Not Working

**Problem**: Cron job not executing or news not updating
**Solution**:
1. Check if `pg_cron` extension is enabled
2. Verify cron job is scheduled correctly
3. Test manual news fetching: `curl -X POST https://your-project.supabase.co/functions/v1/fetchNews`

### Debug Mode

Enable debug logging by setting environment variable:
```env
ENVIRONMENT=development
```

### Getting Help

1. **Supabase Issues**: [Supabase GitHub](https://github.com/supabase/supabase/issues)
2. **HuggingFace Issues**: [HuggingFace Community](https://huggingface.co/discussions)
3. **Project Issues**: Create an issue in this repository

## Performance Optimization

### Response Time Optimization

- **Average Response Time**: 2-3 seconds
- **Database Queries**: Optimized with indexes
- **AI API Calls**: Cached responses for 1 hour
- **News Updates**: Background processing every 6 hours

### Scaling Recommendations

1. **High Traffic**: Consider upgrading to Supabase Pro
2. **Faster AI Responses**: Use smaller models or local deployment
3. **More News Sources**: Add multiple news API integrations
4. **Caching**: Implement Redis for response caching

## Security Considerations

### API Security

- ✅ Input validation and sanitization
- ✅ Rate limiting (built into Supabase)
- ✅ CORS configuration
- ✅ Environment variable protection
- ✅ No user data storage

### Best Practices

1. **API Keys**: Never commit API keys to version control
2. **Environment Variables**: Use Supabase dashboard for production secrets
3. **Database**: Service role key should only be used server-side
4. **HTTPS**: All API calls use HTTPS by default

## Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/finbuddy-backend.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Set up local development environment (see Local Development section)

### Making Changes

1. Make your changes in the appropriate files
2. Add tests for new functionality
3. Run tests: `npm run test`
4. Lint your code: `npm run lint`
5. Test locally: `npm run dev`

### Submitting Changes

1. Commit your changes: `git commit -m "Add your feature"`
2. Push to your fork: `git push origin feature/your-feature-name`
3. Create a Pull Request with a clear description

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Add JSDoc comments for functions
- Include error handling
- Write tests for new features

## Roadmap

### Upcoming Features

- [ ] Multi-language support (Hindi, Tamil, etc.)
- [ ] Voice message support
- [ ] Advanced portfolio analysis
- [ ] Integration with Indian stock exchanges
- [ ] Webhook support for real-time updates
- [ ] Mobile app backend support

### Version History

- **v1.0.0**: Initial release with chat and news functionality
- **v1.1.0**: Enhanced error handling and testing
- **v1.2.0**: Deployment automation and documentation

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Supabase](https://supabase.com/) for the amazing backend platform
- [HuggingFace](https://huggingface.co/) for free AI model access
- [NewsData.io](https://newsdata.io/) for financial news API
- [Deno](https://deno.land/) for the secure JavaScript runtime

---

**Built with ❤️ for the Indian fintech community**

For questions or support, please [open an issue](https://github.com/yourusername/finbuddy-backend/issues) or contact the maintainers.