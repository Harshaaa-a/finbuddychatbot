// Configuration constants for Supabase Edge Functions

/**
 * CORS headers for frontend integration
 * Allows requests from any origin for development and production flexibility
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Request timeout in milliseconds
 */
export const REQUEST_TIMEOUT = 30000 // 30 seconds

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 10, // 10 requests per minute per IP
}

/**
 * AI response configuration
 */
export const AI_CONFIG = {
  maxTokens: 500,
  temperature: 0.7,
  timeout: 25000, // 25 seconds for AI API calls
}

/**
 * News configuration
 */
export const NEWS_CONFIG = {
  maxNewsItems: 3, // Maximum news items to include in context
  cacheTimeout: 3600000, // 1 hour in milliseconds
  maxStoredItems: 10, // Maximum news items to store in database
  fetchTimeout: 30000, // 30 seconds timeout for news API calls
  retryAttempts: 3, // Number of retry attempts for failed requests
  retryDelay: 1000, // Initial delay between retries in milliseconds
}