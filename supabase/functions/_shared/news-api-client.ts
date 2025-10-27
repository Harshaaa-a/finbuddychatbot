/**
 * News API Client for fetching financial news from external sources
 * Supports NewsData.io and Finnhub.io APIs with Indian market focus
 */

import { NEWS_CONFIG } from './config.ts'

export interface NewsItem {
  headline: string
  url?: string
  published_at: string
  source: string
}

export interface NewsAPIResponse {
  success: boolean
  articles: NewsItem[]
  error?: string
}

/**
 * NewsData.io API client for Indian financial news
 */
class NewsDataClient {
  private apiKey: string
  private baseUrl = 'https://newsdata.io/api/1/news'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetchFinancialNews(): Promise<NewsAPIResponse> {
    try {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        country: 'in',
        category: 'business',
        language: 'en',
        size: '10'
      })

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`NewsData API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.status !== 'success') {
        throw new Error(`NewsData API returned error: ${data.message || 'Unknown error'}`)
      }

      const articles: NewsItem[] = data.results?.map((article: any) => ({
        headline: article.title || 'No title available',
        url: article.link || undefined,
        published_at: article.pubDate || new Date().toISOString(),
        source: article.source_id || 'NewsData.io'
      })) || []

      return {
        success: true,
        articles: articles.slice(0, 10) // Limit to 10 articles
      }
    } catch (error) {
      console.error('NewsData API error:', error)
      return {
        success: false,
        articles: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}/**

 * Finnhub.io API client as fallback for financial news
 */
class FinnhubClient {
  private apiKey: string
  private baseUrl = 'https://finnhub.io/api/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetchFinancialNews(): Promise<NewsAPIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/news?category=general&token=${this.apiKey}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!Array.isArray(data)) {
        throw new Error('Finnhub API returned invalid data format')
      }

      const articles: NewsItem[] = data
        .filter((article: any) => article.headline && article.headline.length > 0)
        .slice(0, 10)
        .map((article: any) => ({
          headline: article.headline,
          url: article.url || undefined,
          published_at: new Date(article.datetime * 1000).toISOString(),
          source: article.source || 'Finnhub.io'
        }))

      return {
        success: true,
        articles
      }
    } catch (error) {
      console.error('Finnhub API error:', error)
      return {
        success: false,
        articles: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}

/**
 * Rate limiting helper to prevent API abuse
 */
class RateLimiter {
  private lastRequest: number = 0
  private minInterval: number

  constructor(requestsPerHour: number = 200) {
    // Calculate minimum interval between requests in milliseconds
    this.minInterval = (60 * 60 * 1000) / requestsPerHour
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequest
    
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequest = Date.now()
  }
}

/**
 * Main news client with fallback support and rate limiting
 */
export class NewsAPIClient {
  private newsDataClient?: NewsDataClient
  private finnhubClient?: FinnhubClient
  private rateLimiter: RateLimiter

  constructor() {
    const newsDataKey = Deno.env.get('NEWS_API_KEY')
    const finnhubKey = Deno.env.get('FINNHUB_API_KEY')

    if (newsDataKey) {
      this.newsDataClient = new NewsDataClient(newsDataKey)
    }
    
    if (finnhubKey) {
      this.finnhubClient = new FinnhubClient(finnhubKey)
    }

    this.rateLimiter = new RateLimiter(200) // 200 requests per hour for free tier
  }

  async fetchLatestNews(): Promise<NewsAPIResponse> {
    // Apply rate limiting
    await this.rateLimiter.waitIfNeeded()

    // Try NewsData.io first (better for Indian news)
    if (this.newsDataClient) {
      const result = await this.newsDataClient.fetchFinancialNews()
      if (result.success && result.articles.length > 0) {
        return result
      }
      console.warn('NewsData.io failed or returned no articles, trying fallback')
    }

    // Fallback to Finnhub.io
    if (this.finnhubClient) {
      const result = await this.finnhubClient.fetchFinancialNews()
      if (result.success) {
        return result
      }
      console.warn('Finnhub.io also failed')
    }

    // If both fail, return error
    return {
      success: false,
      articles: [],
      error: 'All news API sources are unavailable'
    }
  }

  /**
   * Check if any news API is configured
   */
  isConfigured(): boolean {
    return !!(this.newsDataClient || this.finnhubClient)
  }
}