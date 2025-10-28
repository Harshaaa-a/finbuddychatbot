import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ChatResponse {
  success: boolean
  message: string
  error?: string
}

// Simple financial advice responses based on keywords
const getFinancialAdvice = (message: string): string => {
  const lowerMessage = message.toLowerCase()
  
  // Investment advice
  if (lowerMessage.includes('mutual fund') || lowerMessage.includes('mutual funds')) {
    return "Mutual funds are investment vehicles that pool money from multiple investors to purchase a diversified portfolio of stocks, bonds, or other securities. They offer professional management and are great for beginners. Consider starting with index funds or balanced funds for lower risk. Always invest for the long term and do your research before investing."
  }
  
  if (lowerMessage.includes('sip') || lowerMessage.includes('systematic investment')) {
    return "SIP (Systematic Investment Plan) is an excellent way to invest regularly in mutual funds. It helps with rupee cost averaging and builds discipline. Start with an amount you're comfortable with, even ₹500-1000 per month can grow significantly over time. Choose equity funds for long-term goals (5+ years) and debt funds for shorter goals."
  }
  
  if (lowerMessage.includes('stock') || lowerMessage.includes('shares') || lowerMessage.includes('equity')) {
    return "Stock investing can be rewarding but requires research and patience. Start by learning about companies, their financials, and market trends. Consider blue-chip stocks for stability. Never invest money you can't afford to lose, and always diversify your portfolio. For beginners, mutual funds might be a safer starting point."
  }
  
  if (lowerMessage.includes('emergency fund')) {
    return "An emergency fund is crucial for financial security. Aim to save 6-12 months of expenses in a liquid, easily accessible account like a savings account or liquid fund. This should be your first priority before any investments. It protects you from unexpected expenses and job loss."
  }
  
  if (lowerMessage.includes('insurance')) {
    return "Insurance is essential for financial planning. Get term life insurance (10-15x your annual income) and health insurance first. Avoid mixing insurance with investment (like ULIPs). Keep insurance and investments separate for better returns and coverage."
  }
  
  if (lowerMessage.includes('retirement') || lowerMessage.includes('pension')) {
    return "Start retirement planning early to benefit from compounding. Consider PPF, EPF, and equity mutual funds for long-term wealth creation. The earlier you start, the less you need to save monthly. Aim to replace 70-80% of your current income in retirement."
  }
  
  if (lowerMessage.includes('tax') || lowerMessage.includes('80c')) {
    return "Tax planning should be part of your overall financial strategy. Use Section 80C investments like PPF, ELSS mutual funds, and life insurance premiums. Don't invest just for tax savings - ensure the investment aligns with your goals. ELSS funds offer good tax benefits with potential for higher returns."
  }
  
  if (lowerMessage.includes('budget') || lowerMessage.includes('expense')) {
    return "Budgeting is the foundation of good financial health. Follow the 50-30-20 rule: 50% for needs, 30% for wants, 20% for savings and investments. Track your expenses for a month to understand your spending patterns. Use apps or spreadsheets to monitor your budget regularly."
  }
  
  if (lowerMessage.includes('debt') || lowerMessage.includes('loan') || lowerMessage.includes('credit card')) {
    return "Pay off high-interest debt first, especially credit card debt. Consider debt consolidation if you have multiple loans. Avoid taking loans for consumption - only for assets that appreciate. Maintain a good credit score by paying bills on time and keeping credit utilization low."
  }
  
  if (lowerMessage.includes('gold')) {
    return "Gold can be part of a diversified portfolio (5-10% allocation). Consider digital gold, gold ETFs, or gold mutual funds instead of physical gold for convenience and lower costs. Gold acts as a hedge against inflation but doesn't provide regular income like stocks or bonds."
  }
  
  if (lowerMessage.includes('fixed deposit') || lowerMessage.includes('fd')) {
    return "Fixed deposits are safe but offer low returns that may not beat inflation. They're good for short-term goals and emergency funds. For long-term wealth creation, consider equity mutual funds or balanced funds which historically provide better inflation-adjusted returns."
  }
  
  // Market-related queries
  if (lowerMessage.includes('market') || lowerMessage.includes('nifty') || lowerMessage.includes('sensex')) {
    return "Market timing is difficult even for experts. Focus on time in the market rather than timing the market. Invest regularly through SIPs regardless of market conditions. Market volatility is normal - stay invested for long-term goals and avoid panic selling during downturns."
  }
  
  // General investment advice
  if (lowerMessage.includes('invest') || lowerMessage.includes('investment')) {
    return "Start investing early to benefit from compounding. Define your financial goals first, then choose appropriate investment vehicles. Diversify across asset classes (equity, debt, gold). Start with mutual funds if you're a beginner. Invest regularly and stay disciplined. Remember: higher returns come with higher risk."
  }
  
  // Beginner advice
  if (lowerMessage.includes('beginner') || lowerMessage.includes('start') || lowerMessage.includes('how to')) {
    return "Welcome to your financial journey! Start with these steps: 1) Build an emergency fund, 2) Get term life and health insurance, 3) Start a SIP in a diversified equity mutual fund, 4) Learn about different investment options gradually. Start small but start now - consistency is key to building wealth."
  }
  
  // Default response
  return "I'm here to help with your financial questions! I can provide guidance on mutual funds, SIPs, stocks, insurance, retirement planning, budgeting, and more. Please feel free to ask specific questions about investments, financial planning, or money management. Remember, this is general advice - always consult with a qualified financial advisor for personalized recommendations."
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        message: '',
        error: 'Method not allowed. Use POST.'
      }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }

  try {
    // Parse request body
    const body = await req.json()
    
    if (!body.message || typeof body.message !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          message: '',
          error: 'Message is required and must be a string'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    const userMessage = body.message.trim()
    
    if (userMessage.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '',
          error: 'Message cannot be empty'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    if (userMessage.length > 500) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '',
          error: 'Message too long. Maximum 500 characters allowed.'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    // Generate response
    const aiResponse = getFinancialAdvice(userMessage)
    
    const response: ChatResponse = {
      success: true,
      message: aiResponse
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error('Chat endpoint error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: '',
        error: 'Internal server error. Please try again later.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }
})