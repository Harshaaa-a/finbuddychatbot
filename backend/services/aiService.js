const OpenAI = require('openai');

class AIService {
  constructor(financeService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.financeService = financeService;
  }

  getSystemPrompt() {
    return `You are FinBuddy, an expert AI financial advisor and investment mentor with deep knowledge in:

CORE EXPERTISE:
- Personal finance and budgeting strategies
- Investment principles (stocks, bonds, ETFs, mutual funds, REITs)
- Portfolio diversification and asset allocation
- Retirement planning (401k, IRA, Roth IRA)
- Tax-efficient investing strategies
- Risk management and insurance
- Emergency fund planning
- Debt management and payoff strategies
- Dollar-cost averaging and market timing
- Value vs. growth investing
- Dividend investing strategies
- ESG and sustainable investing
- Cryptocurrency basics and risks
- Real estate investment fundamentals

FINANCIAL PRINCIPLES TO FOLLOW:
- Always emphasize diversification and long-term thinking
- Stress the importance of emergency funds (3-6 months expenses)
- Advocate for low-cost index funds for most investors
- Explain the power of compound interest
- Promote starting early with investing
- Discuss risk tolerance and time horizon
- Emphasize the importance of financial education
- Warn about common investment mistakes and scams
- Always mention that past performance doesn't guarantee future results

PERSONALITY:
- Friendly, approachable, and encouraging
- Use simple language to explain complex concepts
- Provide actionable advice with specific steps
- Include relevant examples and analogies
- Show enthusiasm for helping people build wealth
- Be patient with beginners but thorough in explanations
- Use emojis sparingly but effectively (💰, 📈, 🎯)

CURRENT MARKET AWARENESS:
You have access to real-time market data and news. Use this information to provide relevant, timely advice while maintaining focus on long-term principles.

RESPONSE FORMAT:
- Keep responses conversational but informative
- Break down complex topics into digestible parts
- Provide specific actionable steps when appropriate
- Always end with encouragement or next steps
- Adapt complexity to user's apparent knowledge level

Remember: You're not just answering questions, you're helping people build a better financial future.`;
  }

  formatFinanceContext(context) {
    if (!context || !context.news || !context.market) {
      return "Current market data is being updated.";
    }

    let contextString = "CURRENT MARKET CONTEXT:\n\n";
    
    // Add market summary
    if (context.market.summary) {
      contextString += `Market Overview: ${context.market.summary}\n\n`;
    }

    // Add key market data
    if (context.market.data && Object.keys(context.market.data).length > 0) {
      contextString += "Key Market ETFs Today:\n";
      Object.values(context.market.data).forEach(stock => {
        contextString += `- ${stock.symbol}: $${stock.price} (${stock.changePercent})\n`;
      });
      contextString += "\n";
    }

    // Add recent news
    if (context.news && context.news.length > 0) {
      contextString += "Recent Financial News:\n";
      context.news.slice(0, 3).forEach((article, index) => {
        contextString += `${index + 1}. ${article.title}\n   Summary: ${article.summary}\n   Sentiment: ${article.sentiment}\n\n`;
      });
    }

    contextString += `Data last updated: ${context.lastUpdated ? new Date(context.lastUpdated).toLocaleString() : 'Updating...'}\n\n`;
    contextString += "Use this current information to provide relevant, timely advice while maintaining focus on long-term investment principles.\n\n";

    return contextString;
  }

  async generateResponse(userMessage, conversationHistory = []) {
    try {
      // Get current finance context
      const financeContext = this.financeService.getFinanceContext();
      const formattedContext = this.formatFinanceContext(financeContext);

      // Build conversation messages
      const messages = [
        {
          role: "system",
          content: this.getSystemPrompt() + "\n\n" + formattedContext
        }
      ];

      // Add conversation history (last 10 messages to manage token usage)
      if (conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-10);
        recentHistory.forEach(msg => {
          messages.push({
            role: msg.isUser ? "user" : "assistant",
            content: msg.text
          });
        });
      }

      // Add current user message
      messages.push({
        role: "user",
        content: userMessage
      });

      // Generate AI response
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Free tier friendly
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      });

      return response.choices[0].message.content;

    } catch (error) {
      console.error('Error generating AI response:', error);
      
      if (error.code === 'insufficient_quota') {
        return "I'm temporarily unable to process requests due to API limits. Please try again later or check your OpenAI API credits. 💰";
      }
      
      if (error.code === 'invalid_api_key') {
        return "There's an issue with the API configuration. Please check that your OpenAI API key is properly set. 🔑";
      }

      // Fallback response with basic finance advice
      return this.getFallbackResponse(userMessage);
    }
  }

  getFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('invest') || lowerMessage.includes('stock')) {
      return "🎯 Great question about investing! While I'm temporarily having connection issues, here's some timeless advice: Start with low-cost index funds like VTI or VOO, diversify your portfolio, and focus on long-term growth. The key is to start early and be consistent. What's your investment timeline and risk tolerance?";
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('save')) {
      return "💰 Budgeting is the foundation of financial success! Try the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings and debt repayment. Start by tracking your expenses for a month to see where your money goes. What's your biggest budgeting challenge?";
    }
    
    if (lowerMessage.includes('retirement') || lowerMessage.includes('401k')) {
      return "🎯 Retirement planning is crucial! If you have a 401(k), contribute at least enough to get the full company match - it's free money! Consider maxing out contributions if possible. Also look into opening an IRA for additional tax-advantaged savings. How much are you currently saving for retirement?";
    }
    
    return "I'm having temporary connection issues, but I'm here to help with your financial questions! I can assist with investing, budgeting, retirement planning, debt management, and more. What specific financial topic would you like to discuss? 📈";
  }

  // Health check for AI service
  async healthCheck() {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10
      });
      return { status: 'healthy', message: 'AI service is operational' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = AIService;