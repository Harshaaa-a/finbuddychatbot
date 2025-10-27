import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

async function fetchExternalNews(): Promise<any[]> {
  const newsApiKey = Deno.env.get('NEWS_API_KEY')
  
  if (!newsApiKey) {
    console.log('NEWS_API_KEY not configured, using mock news')
    return getMockNews()
  }

  try {
    console.log('Fetching news from NewsData.io API...')
    const response = await fetch(
      `https://newsdata.io/api/1/news?apikey=${newsApiKey}&category=business&country=in&language=en&size=10`,
      {
        headers: { 'Accept': 'application/json' }
      }
    )

    if (!response.ok) {
      throw new Error(`NewsData API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.results && Array.isArray(data.results)) {
      console.log(`Fetched ${data.results.length} news items from API`)
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

function getMockNews(): any[] {
  const now = new Date()
  return [
    {
      headline: "Indian Stock Market Shows Steady Growth Amid Global Uncertainty",
      url: "https://example.com/news1",
      published_at: now.toISOString(),
      source: "Financial Express"
    },
    {
      headline: "RBI Maintains Repo Rate at 6.5% in Latest Policy Review",
      url: "https://example.com/news2",
      published_at: new Date(now.getTime() - 3600000).toISOString(),
      source: "Economic Times"
    },
    {
      headline: "Mutual Fund Inflows Hit Record High This Quarter",
      url: "https://example.com/news3",
      published_at: new Date(now.getTime() - 7200000).toISOString(),
      source: "Business Standard"
    },
    {
      headline: "Tech Stocks Rally on Positive Earnings Outlook",
      url: "https://example.com/news4",
      published_at: new Date(now.getTime() - 10800000).toISOString(),
      source: "Mint"
    },
    {
      headline: "Gold Prices Stabilize After Recent Volatility",
      url: "https://example.com/news5",
      published_at: new Date(now.getTime() - 14400000).toISOString(),
      source: "MoneyControl"
    }
  ]
}

async function updateNewsStorage() {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase not configured')
    }

    console.log('Starting news update process...')

    // Fetch new news
    const newNews = await fetchExternalNews()
    console.log(`Processing ${newNews.length} news items`)
    
    // Insert new items (avoiding duplicates)
    let inserted = 0
    for (const item of newNews) {
      try {
        // Check if headline already exists
        const checkResponse = await fetch(
          `${supabaseUrl}/rest/v1/latest_news?select=id&headline=eq.${encodeURIComponent(item.headline)}`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }
        )
        
        if (checkResponse.ok) {
          const existing = await checkResponse.json()
          if (existing.length > 0) {
            console.log(`Skipping duplicate: ${item.headline.substring(0, 50)}...`)
            continue
          }
        }
        
        // Insert new item
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/latest_news`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(item)
        })
        
        if (insertResponse.ok) {
          inserted++
          console.log(`Inserted: ${item.headline.substring(0, 50)}...`)
        } else {
          console.warn(`Failed to insert: ${item.headline.substring(0, 50)}...`)
        }
      } catch (error) {
        console.warn(`Error processing item: ${error.message}`)
      }
    }
    
    // Clean up old items (keep only latest 10)
    try {
      const oldItemsResponse = await fetch(
        `${supabaseUrl}/rest/v1/latest_news?select=id&order=created_at.desc&offset=10`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      )
      
      if (oldItemsResponse.ok) {
        const oldItems = await oldItemsResponse.json()
        
        if (oldItems.length > 0) {
          const deleteResponse = await fetch(
            `${supabaseUrl}/rest/v1/latest_news?id=in.(${oldItems.map((item: any) => item.id).join(',')})`,
            {
              method: 'DELETE',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            }
          )
          
          if (deleteResponse.ok) {
            console.log(`Deleted ${oldItems.length} old news items`)
          }
        }
      }
    } catch (error) {
      console.warn('Error cleaning up old news:', error.message)
    }
    
    // Get final count
    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/latest_news?select=count`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'count=exact'
        }
      }
    )
    
    let totalStored = inserted
    if (countResponse.ok) {
      const countHeader = countResponse.headers.get('content-range')
      if (countHeader) {
        totalStored = parseInt(countHeader.split('/')[1]) || inserted
      }
    }
    
    console.log(`News update complete: +${inserted}, total: ${totalStored}`)
    
    return {
      success: true,
      inserted: inserted,
      deleted: 0,
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

async function getHealthStatus() {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        databaseHealthy: false,
        newsCount: 0,
        apiConfigured: !!Deno.env.get('NEWS_API_KEY'),
        lastCheck: new Date().toISOString(),
        error: 'Supabase not configured'
      }
    }
    
    const response = await fetch(`${supabaseUrl}/rest/v1/latest_news?select=count`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'count=exact'
      }
    })

    let newsCount = 0
    if (response.ok) {
      const countHeader = response.headers.get('content-range')
      if (countHeader) {
        newsCount = parseInt(countHeader.split('/')[1]) || 0
      }
    }
    
    return {
      databaseHealthy: response.ok,
      newsCount: newsCount,
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

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const timestamp = new Date().toISOString()

  if (req.method === 'GET') {
    try {
      const healthStatus = await getHealthStatus()
      
      return new Response(JSON.stringify({
        success: true,
        message: 'News fetcher service is operational',
        status: healthStatus,
        timestamp
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Health check failed',
        error: error.message,
        timestamp
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  // POST request - update news
  try {
    console.log(`[${timestamp}] Starting news fetch operation`)
    const startTime = Date.now()

    const result = await updateNewsStorage()
    const executionTime = Date.now() - startTime

    if (result.success) {
      console.log(`[${timestamp}] News fetch completed successfully in ${executionTime}ms`)
      
      return new Response(JSON.stringify({
        success: true,
        message: `News updated successfully. Inserted ${result.inserted} new items. Total stored: ${result.totalStored}`,
        data: {
          inserted: result.inserted,
          deleted: result.deleted,
          totalStored: result.totalStored
        },
        timestamp
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      console.error(`[${timestamp}] News fetch failed in ${executionTime}ms:`, result.error)
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to update news',
        error: result.error,
        timestamp
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error(`[${timestamp}] News fetch operation failed:`, error)

    return new Response(JSON.stringify({
      success: false,
      message: 'News fetch operation failed',
      error: errorMessage,
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})