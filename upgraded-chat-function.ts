import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 'unknown'
}

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now()
  const limit = rateLimitStore.get(clientIP)
  
  if (limit && now > limit.resetTime) {
    rateLimitStore.delete(clientIP)
  }
  
  const currentLimit = rateLimitStore.get(clientIP)
  
  if (!currentLimit) {
    rateLimitStore.set(clientIP, { count: 1, resetTime: now + 60000 })
    return true
  }
  
  if (currentLimit.count >= 10) return false
  
  currentLimit.count++
  return true
}

function requiresNewsContext(message: string): boolean {
  const newsKeywords = [
    'current', 'today', 'latest', 'recent', 'market conditions', 'market today',
    'should i invest', 'buy stocks', 'sell stocks', 'market trends', 'sensex', 'nifty',
    'investment advice', 'market analysis', 'current prices', 'stock market now',
    'news', 'headlines', 'breaking', 'update', 'happening now'
  ]
  
  return newsKeywords.some(keyword => message.toLowerCase().includes(keyword))
}

async function getNewsContext(): Promise<any[]> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY')
    
    if (!supabaseUrl || !supabaseKey) return []

    const response = await fetch(`${supabaseUrl}/rest/v1/latest_news?select=headline,source&order=created_at.desc&limit=3`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })

    return response.ok ? await response.json() : []
  } catch {
    return []
  }
}

async function generateAIResponse(message: string, newsContext?: any[]): Promise<any> {
  const hfApiKey = Deno.env.get('HF_API_KEY')
  
  if (!hfApiKey) {
    return { success: true, message: generateFallbackResponse(message) }
  }

  try {
    let prompt = `You are FinBuddy, a helpful Indian financial advisor AI. Provide clear, practical financial advice in 2-3 sentences.

User Question: ${message}

`

    if (newsContext && newsContext.length > 0) {
      prompt += `Recent Financial News Context:
${newsContext.map(item => `- ${item.headline} (${item.source})`).join('\n')}

Consider this news context when providing advice.

`
    }

    prompt += `Provide helpful, specific financial advice. Be concise but informative.

Response:`

    const response = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 150,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false
          }
        })
      }
    )

    if (response.ok) {
      const result = await response.json()
      let aiMessage = ''
      
      if (Array.isArray(result) && result[0]?.generated_text) {
        aiMessage = result[0].generated_text.trim()
      }
      
      // Clean up the response
      if (aiMessage && aiMessage.length > 20) {
        // Remove any prompt repetition
        aiMessage = aiMessage.replace(/^(Response:|FinBuddy:|AI:)/i, '').trim()
        return { success: true, message: aiMessage }
      }
    }
    
    // Fallback if AI response is poor
    return { success: true, message: generateFallbackResponse(message) }
    
  } catch (error) {
    console.error('AI generation error:', error)
    return { success: true, message: generateFallbackResponse(message) }
  }
}

function generateFallbackResponse(message: string): string {
  const messageText = message.toLowerCase()
  
  if (messageText.includes('mutual fund')) {
    return "Mutual funds pool money from multiple investors to buy diversified portfolios. They offer professional management and are great for beginners. Consider starting with large-cap equity funds or balanced funds based on your risk tolerance. SIP investments of ₹1000-5000 monthly can help build long-term wealth."
  }
  
  if (messageText.includes('sip')) {
    return "SIP (Systematic Investment Plan) lets you invest a fixed amount monthly in mutual funds. It helps with rupee cost averaging and builds discipline. Start with ₹1000-5000 monthly in a diversified equity fund for long-term wealth creation. Choose funds with good track records and low expense ratios."
  }
  
  if (messageText.includes('stock') || messageText.includes('equity')) {
    return "Stocks can provide good long-term returns but are volatile. Start with blue-chip companies, diversify across sectors, and invest only money you won't need for 5+ years. Consider mutual funds if you're new to investing. Always research company fundamentals before investing."
  }
  
  if (messageText.includes('invest') || messageText.includes('portfolio')) {
    return "Start investing early with a diversified portfolio. Allocate based on your age: (100 - age)% in equity, rest in debt. Build an emergency fund first (6 months expenses), then invest in mutual funds through SIP for long-term goals. Review and rebalance annually."
  }
  
  if (messageText.includes('tax') || messageText.includes('elss')) {
    return "ELSS mutual funds offer tax deduction up to ₹1.5 lakh under 80C with only 3-year lock-in. They're equity funds, so expect volatility but good long-term returns. Don't invest just for tax saving - ensure it fits your portfolio. Consider your overall asset allocation."
  }
  
  if (messageText.includes('current') || messageText.includes('market') || messageText.includes('today')) {
    return "Market conditions change daily, but focus on long-term investing principles. Don't try to time the market. If you're investing for 5+ years, current volatility shouldn't matter much. Continue your SIPs and stay disciplined. Consider consulting a financial advisor for personalized advice."
  }
  
  return "I'm here to help with your financial questions! Ask me about mutual funds, SIPs, stock investing, tax planning, or building your investment portfolio. For personalized advice, always consult with a qualified financial advisor who can understand your specific situation."
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: '', error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const clientIP = getClientIP(req)
  
  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ success: false, message: '', error: 'Rate limit exceeded. Please try again in a minute.' }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    const { message } = await req.json()
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: '', error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const needsNews = requiresNewsContext(message)
    let newsItems: any[] = []
    
    if (needsNews) {
      newsItems = await getNewsContext()
      console.log(`Retrieved ${newsItems.length} news items for context`)
    }

    const aiResponse = await generateAIResponse(message, newsItems)

    return new Response(
      JSON.stringify(aiResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error('Chat error:', error)
    return new Response(
      JSON.stringify({ success: false, message: '', error: 'Invalid request format' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})