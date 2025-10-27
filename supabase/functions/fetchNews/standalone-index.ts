// Standalone FetchNews Function for FinBuddy
// All dependencies included in this single file for reliable deployment

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

// Configuration constants
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface FetchNewsResponse {
  success: boolean
  message: string
  data?: {
    inserted: number
    deleted: number
    totalStored: number
  }
  error?: string
  timestamp: string
}

interface NewsItem {
  headline: string
  url?: string
  published_at?: string
  source?: string
}

/**
 * Get Supabase client configuration
 */
function getSupabaseConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY')
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing')
  }
  
  return { supabaseUrl, supabaseKey }
}

/**
 * Fetch news from external API
 */
async function fetchExternalNews(): Promise<NewsItem[]> {
  const newsApiKey = Deno.env.get('NEWS_API_KEY')
  
  if (!newsApiKey) {
    console.warn('NEWS_API_KEY not configured, returning mock news')
    return getMockNews()
  }

  try {
    // Try NewsData.io API
    const response = await fetch(
      `https://newsdata.io/api/1/news?apikey=${newsApiKey}&category=business&country=in&language=en&size=10`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`NewsData API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.results && Array.isArray(data.results)) {
      return data.results.map((item: any) => ({
        headline: item.title || 'No title',
        url: item.link || '',
        published_at: item.pubDate || new Date().toISOString(),
        source: item.source_id || 'NewsData.io'
      }))
    }

    throw new Error('Invalid API response format')

  } catch (error) {
    console.warn('External news API failed:', error.message)
    return getMockNews()
  }
}

/**
 * Get mock news data when external API is unavailable
 */
function getMockNews(): NewsItem[] {
  return [
    {
      headline: "Indian Stock Market Shows Steady Growth Amid Global Uncertainty",
      url: "https://example.com/news1",
      published_at: new Date().toISOString(),
      source: "Financial Express"
    },
    {
      headline: "RBI Maintains Repo Rate at 6.5% in Latest Policy Review",
      url: "https://example.com/news2", 
      published_at: new Date(Date.now() - 3600000).toISOString(),
      source: "Economic Times"
    },
    {
      headline: "Mutual Fund Inflows Hit Record High This Quarter",
      url: "https://example.com/news3",
      published_at: new Date(Date.now() - 7200000).toISOString(),
      source: "Business Standard"
    },
    {
      headline: "Tech Stocks Rally on Positive Earnings Outlook",
      url: "https://example.com/news4",
      published_at: new Date(Date.now() - 10800000).toISOString(),
      source: "Mint"
    },
    {
      headline: "Gold Prices Stabilize After Recent Volatility",
      url: "https://example.com/news5",
      published_at: new Date(Date.now() - 14400000).toISOString(),
      source: "MoneyControl"
    }
  ]
}

/**
 * Get existing news from database
 */
async function getExistingNews(): Promise<any[]> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig()
  
  const response = await fetch(`${supabaseUrl}/rest/v1/latest_news?select=*&order=created_at.desc`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch existing news: ${response.status}`)
  }

  return await response.json()
}

/**
 * Check if headline already exists
 */
async function isDuplicateHeadline(headline: string): Promise<boolean> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig()
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/latest_news?select=id&headline=eq.${encodeURIComponent(headline)}`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!response.ok) {
    return false // Assume not duplicate if check fails
  }

  const results = await response.json()
  return Array.isArray(results) && results.length > 0
}

/**
 * Insert new news items
 */
async function insertNewsItems(newsItems: NewsItem[]): Promise<number> {
  if (newsItems.length === 0) return 0
  
  const { supabaseUrl, supabaseKey } = getSupabaseConfig()
  
  const response = await fetch(`${supabaseUrl}/rest/v1/latest_news`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(newsItems)
  })

  if (!response.ok) {
    throw new Error(`Failed to insert news: ${response.status}`)
  }

  return newsItems.length
}

/**
 * Delete old news items (keep only latest 10)
 */
async function deleteOldNews(): Promise<number> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig()
  
  // Get IDs of items to delete (all except the latest 10)
  const response = await fetch(
    `${supabaseUrl}/rest/v1/latest_news?select=id&order=created_at.desc&offset=10`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!response.ok) {
    return 0
  }

  const oldItems = await response.json()
  
  if (!Array.isArray(oldItems) || oldItems.length === 0) {
    return 0
  }

  // Delete old items
  const deleteResponse = await fetch(
    `${supabaseUrl}/rest/v1/latest_news?id=in.(${oldItems.map(item => item.id).join(',')})`,
    {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!deleteResponse.ok) {
    throw new Error(`Failed to delete old news: ${deleteResponse.status}`)
  }

  return oldItems.length
}

/**
 * Get database health status
 */
async function getHealthStatus() {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig()
    
    const response = await fetch(`${supabaseUrl}/rest/v1/latest_news?select=count&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    })

    const newsCount = response.headers.get('content-range')?.split('/')[1] || '0'
    
    return {
      databaseHealthy: response.ok,
      newsCount: parseInt(newsCount),
      apiConfigured: !!Deno.env.get('NEWS_API_KEY'),
      lastCheck: new Date().toISOString()
    }
  } catch (error) {
    return {
      databaseHealthy: false,
      newsCount: 0,
      apiConfigured: !!Deno.env.get('NEWS_API_KEY'),
      lastCheck: new Date().toISOString(),
      error: error.message
    }
  }
}

/**
 * Update news storage with latest news
 */
async function updateNewsStorage() {
  try {
    console.log('Starting news update process...')
    
    // Fetch new news from external API
    const newNewsItems = await fetchExternalNews()
    console.log(`Fetched ${newNewsItems.length} news items from external API`)
    
    // Filter out duplicates
    const uniqueNewsItems = []
    for (const item of newNewsItems) {
      const isDuplicate = await isDuplicateHeadline(item.headline)
      if (!isDuplicate) {
        uniqueNewsItems.push(item)
      }
    }
    
    console.log(`${uniqueNewsItems.length} unique news items to insert`)
    
    // Insert new items
    const insertedCount = await insertNewsItems(uniqueNewsItems)
    
    // Clean up old items (keep only latest 10)
    const deletedCount = await deleteOldNews()
    
    // Get final count
    const existingNews = await getExistingNews()
    const totalStored = existingNews.length
    
    console.log(`News update complete: +${insertedCount}, -${deletedCount}, total: ${totalStored}`)
    
    return {
      success: true,
      inserted: insertedCount,
      deleted: deletedCount,
      totalStored: totalStored
    }
    
  } catch (error) {
    console.error('News update failed:', error)
    return {
      success: false,
      inserted: 0,
      deleted: 0,
      totalStored: 0,
      error: error.message
    }
  }
}

/**
 * Health check endpoint for monitoring
 */
async function handleHealthCheck(): Promise<Response> {
  try {
    const healthStatus = await getHealthStatus()
    
    return new Response(JSON.stringify({
      success: true,
      message: 'News fetcher service is operational',
      status: healthStatus,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
}

// Main handler
const mainHandler = async (req: Request): Promise<Response> => {
  if (req.method === 'GET') {
    return handleHealthCheck()
  }
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  // For POST and other methods, proceed with news fetch
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  try {
    console.log(`[${timestamp}] Starting news fetch operation`)

    // Perform news update
    const updateResult = await updateNewsStorage()

    const executionTime = Date.now() - startTime

    if (updateResult.success) {
      const response: FetchNewsResponse = {
        success: true,
        message: `News updated successfully. Inserted ${updateResult.inserted} new items, deleted ${updateResult.deleted} old items. Total stored: ${updateResult.totalStored}`,
        data: {
          inserted: updateResult.inserted,
          deleted: updateResult.deleted,
          totalStored: updateResult.totalStored
        },
        timestamp
      }

      console.log(`[${timestamp}] News fetch completed successfully in ${executionTime}ms:`, response.data)

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      })
    } else {
      const response: FetchNewsResponse = {
        success: false,
        message: 'Failed to update news',
        error: updateResult.error,
        timestamp
      }

      console.error(`[${timestamp}] News fetch failed in ${executionTime}ms:`, updateResult.error)

      return new Response(JSON.stringify(response), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      })
    }

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    const response: FetchNewsResponse = {
      success: false,
      message: 'News fetch operation failed',
      error: errorMessage,
      timestamp
    }

    console.error(`[${timestamp}] News fetch operation failed in ${executionTime}ms:`, error)

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
}

serve(mainHandler)