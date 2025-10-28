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


interface ChatResponse {
  success: boolean
  message: string
  error?: string
}

// Simple in-memory rate limiting store
// In production, consider using Redis or similar
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
    const needsNewsContext = needsNewsContext(userMessage)

    // Get latest news if needed
    let newsItems: any = undefined
    if (needsNewsContext) {
      try {
        // Add timeout for database operations
        const newsPromise = newsStorageService.getLatestNewsForContext(3)
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
        status: aiResponse.success ? 200 : (aiResponse.error?.includes('rate limit') ? 429 : 500),
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

    if (error.message?.includes('rate limit')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '',
          error: 'Service is currently busy. Please try again in a few minutes.'
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    // Generic error for other cases
    throw error
  }
}