import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function requiresNewsContext(message: string): boolean {
  const newsKeywords = [
    'current', 'today', 'latest', 'market conditions', 'should i invest', 
    'buy stocks', 'market trends', 'sensex', 'nifty'
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
    let prompt = `You are FinBuddy, a helpful financial advisor. Provide clear advice in 2-3 sentences.

Question: ${message}

`

    if (newsContext && newsContext.length > 0) {
      prompt += `Recent News: ${newsContext.map(item => item.headline).join(', ')}

`
    }

    prompt += `Response:`

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
            max_new_tokens: 100,
            temperature: 0.7
          }
        })
      }
    )

    if (response.ok) {
      const result = await response.json()
      if (Array.isArray(result) && result[0]?.generated_text) {
        return { success: true, message: result[0].generated_text.trim() }
      }
    }
    
    return { success: true, message: generateFallbackResponse(message) }
    
  } catch (error) {
    return { success: true, message: generateFallbackResponse(message) }
  }
}

function generateFallbackResponse(message: string): string {
  const messageText = message.toLowerCase()
  
  if (messageText.includes('mutual fund')) {
    return "Mutual funds pool money from multiple investors to buy diversified portfolios. They offer professional management and are great for beginners. Consider starting with large-cap equity funds or balanced funds based on your risk tolerance."
  }
  
  if (messageText.includes('sip')) {
    return "SIP (Systematic Investment Plan) lets you invest a fixed amount monthly in mutual funds. It helps with rupee cost averaging and builds discipline. Start with ₹1000-5000 monthly in a diversified equity fund."
  }
  
  if (messageText.includes('stock')) {
    return "Stocks can provide good long-term returns but are volatile. Start with blue-chip companies, diversify across sectors, and invest only money you won't need for 5+ years. Consider mutual funds if you're new to investing."
  }
  
  if (messageText.includes('invest')) {
    return "Start investing early with a diversified portfolio. Build an emergency fund first, then invest in mutual funds through SIP for long-term goals. Consider your risk tolerance and investment horizon."
  }
  
  return "I'm here to help with your financial questions! Ask me about mutual funds, SIPs, stock investing, or building your investment portfolio. For personalized advice, consult with a qualified financial advisor."
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
    }

    const aiResponse = await generateAIResponse(message, newsItems)

    return new Response(
      JSON.stringify(aiResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: '', error: 'Invalid request format' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})