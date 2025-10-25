# FinBuddy AI Setup Guide 🤖💰

This guide will help you set up your AI-powered finance chatbot with real-time market data and advanced financial knowledge.

## Quick Start

### 1. Get Your Free API Keys

#### OpenAI API Key (Required for AI responses)
1. Go to [OpenAI Platform](https://platform.openai.com/signup)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. **Free credits**: OpenAI gives $5 in free credits to new users

#### Alpha Vantage API Key (Required for market data)
1. Go to [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Enter your email to get a free API key
3. **Free tier**: 25 API calls per day, 5 per minute

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env file with your API keys
nano .env
```

Add your API keys to the `.env` file:
```env
OPENAI_API_KEY=sk-your-openai-key-here
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key-here
PORT=3001
NODE_ENV=development
```

### 3. Start the Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

You should see:
```
🚀 FinBuddy Backend running on port 3001
💰 Finance data updates every hour
🤖 AI service ready with OpenAI GPT-3.5-turbo
📊 Health check available at: http://localhost:3001/health
```

### 4. Start the Frontend

In a new terminal:

```bash
# Navigate to project root
cd /Users/harsha/Downloads/finbuddy-chat-ai-main

# Install dependencies if not already done
npm install

# Start the development server
npm run dev
```

Your chatbot will be available at `http://localhost:5173`

## Features

### 🤖 AI-Powered Responses
- Uses OpenAI GPT-3.5-turbo for intelligent responses
- Specialized financial knowledge and expertise
- Conversational history awareness
- Smart fallback responses when API is unavailable

### 📈 Real-Time Market Data
- Live market data from major ETFs (SPY, QQQ, DIA, VTI)
- Financial news with sentiment analysis
- Market summaries and trends
- Updates every hour automatically

### 💡 Financial Expertise
Your AI has deep knowledge in:
- Personal finance and budgeting
- Investment strategies (stocks, bonds, ETFs)
- Retirement planning (401k, IRA, Roth IRA)
- Portfolio diversification
- Risk management
- Tax-efficient investing
- Debt management
- Emergency fund planning

## API Endpoints

### Health Check
```
GET http://localhost:3001/health
```

### Chat with AI
```
POST http://localhost:3001/chat
Body: {
  "message": "How should I start investing?",
  "conversationHistory": []
}
```

### Get Market Data
```
GET http://localhost:3001/finance/data
GET http://localhost:3001/finance/news
GET http://localhost:3001/finance/market
```

## Troubleshooting

### Common Issues

#### "OPENAI_API_KEY not found"
- Make sure you've created the `.env` file in the `backend` directory
- Verify your OpenAI API key is valid and properly formatted
- Check that you haven't exceeded your free credits

#### "Failed to fetch finance data"
- Verify your Alpha Vantage API key is correct
- You may have hit the daily limit (25 calls/day on free tier)
- The system will use fallback data if APIs fail

#### "Connection refused" errors
- Make sure the backend server is running on port 3001
- Check if another service is using port 3001
- Try changing the port in your `.env` file

#### Frontend can't connect to backend
- Ensure both frontend and backend are running
- Check the console for CORS errors
- Verify the API endpoint URL in ChatInterface.tsx

### Development Tips

1. **Monitor API usage**: Keep an eye on your OpenAI and Alpha Vantage usage
2. **Test fallback responses**: Try disconnecting from the internet to test offline responses
3. **Customize prompts**: Edit `aiService.js` to adjust the AI's personality and expertise
4. **Add more data sources**: Extend `financeService.js` to include additional financial APIs

## Free Tier Limitations

### OpenAI ($5 free credits)
- Approximately 2,500-5,000 chat messages
- Rate limit: 3 requests per minute
- Tokens: 40,000 tokens per minute

### Alpha Vantage (Free tier)
- 25 API calls per day
- 5 calls per minute
- Limited to basic market data

## Scaling Up

When you're ready to scale:

1. **OpenAI**: Add payment method for pay-as-you-go pricing
2. **Alpha Vantage**: Upgrade to premium for more calls
3. **Alternative APIs**: Consider Finnhub, IEX Cloud, or Polygon.io
4. **Database**: Add PostgreSQL or MongoDB to store conversation history
5. **Authentication**: Add user accounts and personalized advice
6. **Caching**: Implement Redis for faster responses

## Support

If you run into issues:
1. Check the server logs for error details
2. Test the API endpoints directly using curl or Postman
3. Verify all environment variables are set correctly
4. Make sure you're using Node.js version 16 or higher

## Security Notes

- Never commit your `.env` file to version control
- Keep your API keys secure and private
- Rotate API keys regularly
- Use environment variables in production
- Consider implementing rate limiting for production use

---

🎉 **You're all set!** Your AI finance chatbot is now ready to help users with intelligent, data-driven financial advice!