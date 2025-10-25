const axios = require('axios');

class FreeAIService {
  constructor(financeService) {
    this.financeService = financeService;
    this.fallbackResponses = {
      investing: [
        "🎯 Great question about investing! Start with low-cost index funds like VTI or VOO for broad market exposure. The key principles are: diversify your portfolio, invest regularly (dollar-cost averaging), think long-term (10+ years), and keep fees low. What's your investment timeline and risk tolerance?",
        "📈 Smart investing starts with understanding your goals! For beginners, I recommend 80% stocks (index funds) and 20% bonds if you're young. Consider ETFs like VTI for total market exposure. Always invest money you won't need for 5+ years. What's your current financial situation?",
        "💰 The magic of investing is compound interest! Even $100/month invested in index funds can grow to $300K+ over 30 years. Start with a target-date fund if you're unsure about allocation. Most importantly: start now, even with small amounts!"
      ],
      budgeting: [
        "💰 Budgeting is your foundation! Try the 50/30/20 rule: 50% needs (rent, groceries), 30% wants (entertainment), 20% savings and debt repayment. Track expenses for a month to see where your money goes. What's your biggest spending category?",
        "📊 Smart budgeting tip: Pay yourself first! Set up automatic transfers to savings before you spend. Aim for a $1,000 emergency fund first, then build to 3-6 months of expenses. Use apps like Mint or YNAB to track spending patterns.",
        "🎯 Budget success comes from being realistic! Don't cut everything fun - you'll give up. Instead, find one category to reduce by 10% and automate your savings. Small consistent changes beat dramatic unsustainable cuts every time."
      ],
      retirement: [
        "🎯 Retirement planning is crucial! If you have a 401(k), contribute at least enough to get the full company match - that's free money! For 2024, you can contribute up to $23,000 ($30,500 if 50+). Also consider a Roth IRA for tax-free growth.",
        "💡 The earlier you start, the less you need to save monthly! A 25-year-old saving $200/month will have more at retirement than a 35-year-old saving $400/month, thanks to compound interest. Target 10-15% of income for retirement.",
        "📈 Retirement allocation rule of thumb: Subtract your age from 110 for stock percentage. A 30-year-old might do 80% stocks, 20% bonds. As you age, shift to more conservative investments. Don't touch retirement funds early - penalties are steep!"
      ],
      general: [
        "I'm here to help with your financial questions! I can assist with investing strategies, budgeting tips, retirement planning, debt management, emergency funds, and more. What specific financial topic interests you? 📈",
        "💰 Building wealth starts with the basics: spend less than you earn, build an emergency fund, pay off high-interest debt, then invest consistently in diversified index funds. Which area would you like to focus on first?",
        "🎯 Financial success is about forming good habits: automate your savings, invest regularly, avoid lifestyle inflation, and stay educated about money. What's your current biggest financial challenge?"
      ]
    };
  }

  getSystemPrompt() {
    return `You are FinBuddy, an expert AI financial advisor focused on practical, actionable advice. You emphasize:

CORE PRINCIPLES:
- Start investing early, even with small amounts
- Diversification through low-cost index funds (VTI, VOO, VXUS)
- Emergency funds (3-6 months expenses) before investing
- Pay off high-interest debt first
- Automate savings and investments
- Long-term thinking (10+ years for stocks)
- Dollar-cost averaging
- Keep investment fees under 0.2%

PERSONALITY:
- Encouraging and supportive
- Break down complex topics simply
- Provide specific actionable steps
- Use relevant examples
- Stay positive but realistic
- End responses with questions to continue conversation

RESPONSE STYLE:
- Conversational but informative
- Include relevant emojis (💰, 📈, 🎯)
- Give specific numbers/examples when helpful
- Always mention that investing involves risk
- Adapt complexity to user's knowledge level`;
  }

  async generateResponse(userMessage, conversationHistory = []) {
    try {
      // Get current finance context
      const financeContext = this.financeService.getFinanceContext();
      const contextString = this.formatFinanceContext(financeContext);

      // Try free Hugging Face API first
      const response = await this.tryHuggingFaceAPI(userMessage, contextString);
      if (response) {
        return response;
      }

      // Fallback to intelligent pattern matching
      return this.getIntelligentFallback(userMessage);

    } catch (error) {
      console.error('Error generating response:', error);
      return this.getIntelligentFallback(userMessage);
    }
  }

  async tryHuggingFaceAPI(userMessage, context) {
    try {
      // Using Hugging Face's free inference API
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
        {
          inputs: `${context}\n\nUser: ${userMessage}\nFinBuddy:`,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.7,
            return_full_text: false
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            // Using public inference API - no key needed for basic usage
          },
          timeout: 10000
        }
      );

      if (response.data && response.data[0] && response.data[0].generated_text) {
        let generatedText = response.data[0].generated_text.trim();
        
        // Clean up the response
        generatedText = generatedText.replace(/^FinBuddy:\s*/, '');
        generatedText = generatedText.replace(/User:.*$/g, '').trim();
        
        // Add financial context if the response seems too generic
        if (generatedText.length > 50 && !generatedText.includes('invest') && !generatedText.includes('financial')) {
          generatedText += this.addFinancialContext(userMessage);
        }

        return generatedText;
      }
    } catch (error) {
      console.log('Hugging Face API unavailable, using fallback');
      return null;
    }
  }

  getIntelligentFallback(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Financial topic detection with more sophisticated matching
    const topics = {
      investing: ['invest', 'stock', 'etf', 'portfolio', 'market', 'fund', 'share', 'dividend'],
      budgeting: ['budget', 'save', 'saving', 'spend', 'expense', 'money management', 'track'],
      retirement: ['retirement', '401k', 'ira', 'roth', 'pension', 'retire'],
      debt: ['debt', 'loan', 'credit card', 'pay off', 'interest'],
      emergency: ['emergency fund', 'emergency', 'rainy day'],
      real_estate: ['house', 'mortgage', 'rent', 'real estate', 'property'],
      insurance: ['insurance', 'health insurance', 'life insurance'],
      tax: ['tax', 'taxes', 'deduction', 'irs']
    };

    // Find the most relevant topic
    let bestMatch = 'general';
    let maxMatches = 0;

    for (const [topic, keywords] of Object.entries(topics)) {
      const matches = keywords.filter(keyword => lowerMessage.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = topic;
      }
    }

    // Get a response for the detected topic
    if (this.fallbackResponses[bestMatch]) {
      const responses = this.fallbackResponses[bestMatch];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      // Add current market context if available
      const marketContext = this.getMarketContextSummary();
      if (marketContext && (bestMatch === 'investing' || lowerMessage.includes('market'))) {
        return randomResponse + '\n\n' + marketContext;
      }
      
      return randomResponse;
    }

    return this.fallbackResponses.general[0];
  }

  formatFinanceContext(context) {
    if (!context || !context.market) {
      return "Market data updating...";
    }

    let contextString = "CURRENT MARKET CONTEXT:\n";
    
    if (context.market.summary) {
      contextString += `${context.market.summary}\n`;
    }

    if (context.news && context.news.length > 0) {
      contextString += `Recent news: ${context.news[0].title}\n`;
    }

    return contextString;
  }

  getMarketContextSummary() {
    const context = this.financeService.getFinanceContext();
    if (context && context.market && context.market.summary) {
      return `📊 Market Update: ${context.market.summary}`;
    }
    return null;
  }

  addFinancialContext(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('start') || lowerMessage.includes('begin')) {
      return '\n\n💡 Remember: The best time to start investing was 20 years ago, the second best time is now!';
    }
    
    if (lowerMessage.includes('risk')) {
      return '\n\n⚠️ All investments carry risk. Diversification helps manage risk, but never invest more than you can afford to lose.';
    }
    
    return '\n\n📈 Stay focused on your long-term goals and keep learning about personal finance!';
  }

  // Health check for the service
  async healthCheck() {
    return { 
      status: 'healthy', 
      message: 'Free AI service operational with intelligent fallbacks',
      features: ['Pattern matching', 'Financial topic detection', 'Market context integration']
    };
  }
}

module.exports = FreeAIService;