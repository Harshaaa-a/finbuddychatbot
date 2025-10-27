// Standalone Chat Function for FinBuddy AI Assistant
// All dependencies included in this single file for reliable deployment

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

// Configuration constants
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const REQUEST_TIMEOUT = 30000 // 30 seconds
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60000 // 1 minute
}

// Types
interface ChatRequest {
  message: string
}

interface ChatResponse {
  success: boolean
  message: string
  error?: string
}

// Simple in-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  return forwarded?.split(',')[0] || realIP || cfConnectingIP || 'unknown'
}

/**
 * Check rate limit for client IP
 */
function checkRateLimit(clientIP: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now()
  const key = clientIP
  const limit = rateLimitStore.get(key)
  
  // Clean up expired entries
  if (limit && now > limit.resetTime) {
    rateLimitStore.delete(key)
  }
  
  const currentLimit = rateLimitStore.get(key)
  
  if (!currentLimit) {
    // First request from this IP
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs
    })
    return { allowed: true }
  }
  
  if (currentLimit.count >= RATE_LIMIT.maxRequests) {
    return { 
      allowed: false, 
      resetTime: currentLimit.resetTime 
    }
  }
  
  // Increment count
  currentLimit.count++
  rateLimitStore.set(key, currentLimit)
  
  return { allowed: true }
}

/**
 * Validate chat request body
 */
function validateChatRequest(body: any): { isValid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be a JSON object' }
  }
  
  if (!body.message) {
    return { isValid: false, error: 'Missing required field: message' }
  }
  
  if (typeof body.message !== 'string') {
    return { isValid: false, error: 'Message field must be a string' }
  }
  
  const trimmedMessage = body.message.trim()
  if (!trimmedMessage) {
    return { isValid: false, error: 'Message cannot be empty' }
  }
  
  if (trimmedMessage.length > 1000) {
    return { isValid: false, error: 'Message too long. Maximum 1000 characters allowed.' }
  }
  
  if (trimmedMessage.length < 3) {
    return { isValid: false, error: 'Message too short. Minimum 3 characters required.' }
  }
  
  return { isValid: true }
}

/**
 * Determine if message requires news context
 */
function requiresNewsContext(message: string): boolean {
  const newsKeywords = [
    'current', 'today', 'latest', 'recent', 'now', 'this week', 'this month',
    'market conditions', 'market today', 'stock market', 'sensex', 'nifty',
    'should i invest', 'buy stocks', 'sell stocks', 'market trends',
    'investment advice', 'market analysis', 'current prices',
    'news', 'headlines', 'breaking', 'update', 'happening'
  ]
  
  const messageText = message.toLowerCase()
  return newsKeywords.some(keyword => messageText.includes(keyword))
}

/**
 * Generate AI response using HuggingFace
 */
async function generateAIResponse(message: string, newsContext?: any[]): Promise<ChatResponse> {
  try {
    const hfApiKey = Deno.env.get('HF_API_KEY')
    
    if (!hfApiKey) {
      return {
        success: false,
        message: '',
        error: 'AI service not configured. Please contact support.'
      }
    }

    // Build prompt
    let prompt = `You are FinBuddy, a helpful financial advisor AI assistant. Provide clear, accurate, and helpful financial advice.

User Question: ${message}

`

    // Add news context if available
    if (newsContext && newsContext.length > 0) {
      prompt += `Recent Financial News Context:
${newsContext.map(item => `- ${item.headline} (${item.source})`).join('\n')}

`
    }

    prompt += `Please provide a helpful, accurate response about this financial topic. Keep it concise but informative.

Response:`

    // Call HuggingFace API
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
            max_new_tokens: 200,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.error) {
      throw new Error(result.error)
    }

    let aiMessage = ''
    if (Array.isArray(result) && result.length > 0) {
      aiMessage = result[0].generated_text || ''
    } else if (result.generated_text) {
      aiMessage = result.generated_text
    }

    // Fallback response if AI doesn't generate proper content
    if (!aiMessage || aiMessage.trim().length < 10) {
      aiMessage = generateFallbackResponse(message)
    }

    return {
      success: true,
      message: aiMessage.trim()
    }

  } catch (error) {
    console.error('AI generation error:', error)
    
    // Return fallback response
    return {
      success: true,
      message: generateFallbackResponse(message)
    }
  }
}

/**
 * Generate fallback response when AI is unavailable
 */
function generateFallbackResponse(message: string): string {
  const messageText = message.toLowerCase()
  
  if (messageText.includes('mutual fund')) {
    return "Mutual funds are investment vehicles that pool money from multiple investors to purchase a diversified portfolio of stocks, bonds, or other securities. They offer professional management and diversification, making them suitable for investors who want exposure to various assets without picking individual securities."
  }
  
  if (messageText.includes('sip')) {
    return "SIP (Systematic Investment Plan) is a method of investing in mutual funds where you invest a fixed amount regularly (monthly/quarterly). It helps in rupee cost averaging and disciplined investing, making it easier to build wealth over time regardless of market volatility."
  }
  
  if (messageText.includes('stock') || messageText.includes('equity')) {
    return "Stocks represent ownership shares in a company. When you buy stocks, you become a partial owner and can benefit from the company's growth through capital appreciation and dividends. However, stocks can be volatile, so it's important to research companies and diversify your investments."
  }
  
  if (messageText.includes('invest')) {
    return "Investment is the process of putting money into financial instruments or assets with the expectation of generating returns over time. Key principles include: start early, diversify your portfolio, understand your risk tolerance, and invest regularly. Consider consulting with a financial advisor for personalized advice."
  }
  
  return "Thank you for your financial question. While I'm experiencing some technical difficulties with my AI service, I recommend consulting with a qualified financial advisor for personalized investment advice. Always do thorough research before making any investment decisions."
}

/**
 * Get news context from database
 */
async function getNewsContext(): Promise<any[]> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase not configured, skipping news context')
      return []
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/latest_news?select=headline,source&order=created_at.desc&limit=3`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      return await response.json()
    } else {
      console.warn('Failed to fetch news context:', response.status)
      return []
    }
  } catch (error) {
    console.warn('Error fetching news context:', error)
    return []
  }
}

/**
 * Create timeout promise
 */
function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), ms)
  })
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

  // Get client IP for rate limiting
  const clientIP = getClientIP(req)
  
  // Check rate limit
  const rateLimitCheck = checkRateLimit(clientIP)
  if (!rateLimitCheck.allowed) {
    const resetTime = rateLimitCheck.resetTime || Date.now()
    const waitTime = Math.ceil((resetTime - Date.now()) / 1000)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: '', 
        error: `Rate limit exceeded. Please try again in ${waitTime} seconds.` 
      }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Retry-After": waitTime.toString()
        } 
      }
    )
  }

  try {
    // Wrap the entire request processing in a timeout
    const requestPromise = processRequest(req)
    const timeoutPromise = createTimeoutPromise(REQUEST_TIMEOUT)
    
    return await Promise.race([requestPromise, timeoutPromise])
    
  } catch (error) {
    console.error('Chat endpoint error:', error)
    
    // Handle specific error types
    if (error.message === 'Request timeout') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '', 
          error: 'Request timed out. Please try again with a shorter message.' 
        }),
        { 
          status: 408, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }
    
    // Return generic error response for unexpected errors
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

/**
 * Process the chat request with validation and AI response generation
 */
async function processRequest(req: Request): Promise<Response> {
  // Parse request body with timeout
  let requestBody: any
  try {
    const bodyText = await req.text()
    if (!bodyText.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '', 
          error: 'Request body cannot be empty' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }
    
    requestBody = JSON.parse(bodyText)
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: '', 
        error: 'Invalid JSON in request body' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }

  // Validate request body
  const validation = validateChatRequest(requestBody)
  if (!validation.isValid) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: '', 
        error: validation.error 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }

  const userMessage = requestBody.message.trim()

  try {
    // Analyze message to determine if news context is needed
    const needsNewsContext = requiresNewsContext(userMessage)
    
    // Get latest news if needed
    let newsItems: any[] = []
    if (needsNewsContext) {
      try {
        // Add timeout for database operations
        const newsPromise = getNewsContext()
        const newsTimeout = createTimeoutPromise(5000) // 5 second timeout for DB
        
        newsItems = await Promise.race([newsPromise, newsTimeout])
      } catch (error) {
        console.warn('Failed to fetch news context:', error)
        // Continue without news context rather than failing the request
      }
    }

    // Generate AI response with timeout
    const aiResponse: ChatResponse = await generateAIResponse(userMessage, newsItems)

    // Return the response
    return new Response(
      JSON.stringify(aiResponse),
      { 
        status: aiResponse.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )

  } catch (error) {
    console.error('Request processing error:', error)
    
    // Handle specific error types
    if (error.message?.includes('timeout')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '', 
          error: 'The request is taking too long. Please try again.' 
        }),
        { 
          status: 408, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }
    
    // Generic error for other cases
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
}