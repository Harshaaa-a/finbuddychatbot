const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Use completely free services
const FreeFinanceService = require('./services/freeFinanceService');
const FreeAIService = require('./services/freeAiService');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🎉 Starting 100% FREE FinBuddy Backend - No API keys required!');

// Initialize free services
const financeService = new FreeFinanceService();
const aiService = new FreeAIService(financeService);

// Middleware
app.use(cors());
app.use(express.json());

// Welcome message
app.get('/', (req, res) => {
  res.json({
    message: "🎉 Welcome to FinBuddy FREE Backend!",
    version: "1.0.0-free",
    features: [
      "100% free - no API keys required",
      "Intelligent AI responses with financial expertise",
      "Real-time market data from free sources",
      "Financial news from multiple sources",
      "Smart fallback responses",
      "No usage limits or costs"
    ],
    endpoints: {
      chat: "POST /chat",
      health: "GET /health", 
      market: "GET /finance/market",
      news: "GET /finance/news",
      data: "GET /finance/data"
    },
    note: "This free version provides excellent financial advice without requiring any paid API services!"
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK (FREE)', 
    timestamp: new Date().toISOString(),
    services: {
      finance: financeService.lastUpdated ? 'active (free sources)' : 'initializing',
      ai: 'ready (intelligent pattern matching + free APIs)',
      cost: '$0.00 - completely free!'
    },
    uptime: process.uptime()
  });
});

// AI health check
app.get('/ai/health', async (req, res) => {
  try {
    const healthStatus = await aiService.healthCheck();
    res.json({
      ...healthStatus,
      cost: "FREE",
      note: "Using intelligent pattern matching and free AI APIs"
    });
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
      lastUpdated: financeService.lastUpdated,
      source: "Free APIs and intelligent fallbacks",
      cost: "FREE"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch finance data',
      message: error.message 
    });
  }
});

// Main chat endpoint - completely free!
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

    console.log(`[${new Date().toISOString()}] FREE Chat: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

    // Generate AI response using free services
    const aiResponse = await aiService.generateResponse(
      message.trim(), 
      conversationHistory || []
    );

    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      metadata: {
        service: 'FREE',
        cost: '$0.00',
        financeDataAge: financeService.lastUpdated ? 
          Date.now() - new Date(financeService.lastUpdated).getTime() : null,
        aiSource: 'Intelligent pattern matching + free APIs'
      }
    });

  } catch (error) {
    console.error('Error in free chat endpoint:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate response',
      message: 'Using free services - temporary issue resolved with fallback response',
      fallbackResponse: "I'm here to help with your financial questions! I specialize in investing, budgeting, retirement planning, and personal finance. What would you like to know? 💰"
    });
  }
});

// Get latest financial news (free)
app.get('/finance/news', (req, res) => {
  try {
    const news = financeService.getLatestNews();
    res.json({
      success: true,
      news: news,
      count: news.length,
      lastUpdated: financeService.lastUpdated,
      source: "Free news sources + Reddit + fallback analysis",
      cost: "FREE"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
      message: error.message
    });
  }
});

// Get market summary (free)
app.get('/finance/market', (req, res) => {
  try {
    const market = financeService.getMarketSummary();
    res.json({
      success: true,
      market: market,
      source: "Yahoo Finance (free) + intelligent fallbacks",
      cost: "FREE"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
      message: error.message
    });
  }
});

// Demo endpoint to show AI capabilities
app.get('/demo', (req, res) => {
  const demoQuestions = [
    "How should I start investing with $1000?",
    "What's the 50/30/20 budgeting rule?",
    "Should I pay off debt or invest first?",
    "What's the difference between 401k and Roth IRA?",
    "How much should I have in my emergency fund?",
    "What are index funds and why are they recommended?",
    "How do I create a diversified portfolio?",
    "What's dollar-cost averaging?"
  ];

  res.json({
    message: "🎯 Try these sample questions to test FinBuddy's expertise:",
    sampleQuestions: demoQuestions,
    note: "All responses are generated using free AI services with deep financial knowledge!"
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'Free service encountered an issue - using fallback response',
    cost: 'Still FREE! 😊'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.path} is not available`,
    availableEndpoints: ['GET /', 'GET /health', 'POST /chat', 'GET /finance/data', 'GET /demo'],
    cost: 'FREE to use!'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FinBuddy FREE Backend running on port ${PORT}`);
  console.log(`💰 100% FREE - No API keys required!`);
  console.log(`🤖 Intelligent AI with deep financial knowledge`);
  console.log(`📊 Real-time market data from free sources`);
  console.log(`🎯 Smart fallbacks ensure 24/7 availability`);
  console.log(`🔥 Zero costs - Perfect for development and production!`);
  console.log(`\n📈 Test it: curl http://localhost:${PORT}/demo`);
  console.log(`💬 Chat: POST http://localhost:${PORT}/chat`);
  console.log(`✅ Health: http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down FREE server gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down FREE server gracefully...');
  process.exit(0);
});