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



/**
 * Health check endpoint for monitoring
 * GET /fetchNews returns current status without triggering news fetch
 */
async function handleHealthCheck(): Promise<Response> {
  try {
    const healthStatus = await newsStorageService.getHealthStatus()
    
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

// Update the main handler to support both POST (for cron) and GET (for health check)
const mainHandler = async (req: Request): Promise<Response> => {
  if (req.method === 'GET') {
    return handleHealthCheck()
  }
  
  // For POST and other methods, proceed with the original news fetch logic
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    console.log(`[${timestamp}] Starting news fetch operation`)

    // Perform news update
    const updateResult = await newsStorageService.updateNewsStorage()

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