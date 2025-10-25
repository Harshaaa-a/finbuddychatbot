const express = require('express');
const cors = require('cors');
require('dotenv').config();

const FinanceService = require('./services/financeService');
const AIService = require('./services/aiService');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const financeService = new FinanceService();
const aiService = new AIService(financeService);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      finance: financeService.lastUpdated ? 'active' : 'initializing',
      ai: 'ready'
    }
  });
});

// AI health check
app.get('/ai/health', async (req, res) => {
  try {
    const healthStatus = await aiService.healthCheck();
    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get current market data and news
app.get('/finance/data', (req, res) => {
  try {
    const context = financeService.getFinanceContext();
    res.json({
      success: true,
      data: context,
      lastUpdated: financeService.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch finance data',
      message: error.message 
    });
  }
});

// Main chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    
    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a non-empty string'
      });
    }

    // Validate conversation history format if provided
    if (conversationHistory && !Array.isArray(conversationHistory)) {
      return res.status(400).json({
        success: false,
        error: 'Conversation history must be an array'
      });
    }

    console.log(`[${new Date().toISOString()}] Processing message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

    // Generate AI response
    const aiResponse = await aiService.generateResponse(
      message.trim(), 
      conversationHistory || []
    );

    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      metadata: {
        financeDataAge: financeService.lastUpdated ? 
          Date.now() - new Date(financeService.lastUpdated).getTime() : null
      }
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate response',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get latest financial news
app.get('/finance/news', (req, res) => {
  try {
    const news = financeService.getLatestNews();
    res.json({
      success: true,
      news: news,
      count: news.length,
      lastUpdated: financeService.lastUpdated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
      message: error.message
    });
  }
});

// Get market summary
app.get('/finance/market', (req, res) => {
  try {
    const market = financeService.getMarketSummary();
    res.json({
      success: true,
      market: market
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.path} is not a valid endpoint`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FinBuddy Backend running on port ${PORT}`);
  console.log(`💰 Finance data updates every hour`);
  console.log(`🤖 AI service ready with OpenAI GPT-3.5-turbo`);
  console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
  
  // Initial API key validation
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not found. Set it in your .env file');
  }
  
  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    console.warn('⚠️  WARNING: ALPHA_VANTAGE_API_KEY not found. Using fallback data');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});