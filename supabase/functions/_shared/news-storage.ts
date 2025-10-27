/**
 * News Storage Service
 * Handles news fetching, storage, and cleanup operations
 */

import { NewsAPIClient, NewsItem as APINewsItem } from './news-api-client.ts'
import { supabaseClient } from './supabase-client.ts'
import { NewsInsert } from './types.ts'
import { NEWS_CONFIG } from './config.ts'

export interface NewsUpdateResult {
  success: boolean
  inserted: number
  deleted: number
  error?: string
  totalStored: number
}

export class NewsStorageService {
  private newsClient: NewsAPIClient

  constructor() {
    this.newsClient = new NewsAPIClient()
  }

  /**
   * Fetch latest news and update storage
   * @returns Result of the update operation
   */
  async updateNewsStorage(): Promise<NewsUpdateResult> {
    try {
      // Check if news API is configured
      if (!this.newsClient.isConfigured()) {
        return {
          success: false,
          inserted: 0,
          deleted: 0,
          totalStored: 0,
          error: 'No news API keys configured'
        }
      }

      // Fetch latest news from external API
      const apiResponse = await this.newsClient.fetchLatestNews()
      
      if (!apiResponse.success) {
        return {
          success: false,
          inserted: 0,
          deleted: 0,
          totalStored: 0,
          error: apiResponse.error || 'Failed to fetch news from external API'
        }
      }

      // Convert API news items to database format
      const newsInserts: NewsInsert[] = apiResponse.articles.map(article => ({
        headline: this.sanitizeHeadline(article.headline),
        url: article.url,
        published_at: article.published_at,
        source: article.source
      }))

      // Update database with new items and cleanup old ones
      const updateResult = await supabaseClient.updateNewsStorage(
        newsInserts,
        NEWS_CONFIG.maxStoredItems
      )

      // Get total count of stored items
      const currentNews = await supabaseClient.getLatestNews(NEWS_CONFIG.maxStoredItems)

      return {
        success: true,
        inserted: updateResult.inserted,
        deleted: updateResult.deleted,
        totalStored: currentNews.length
      }

    } catch (error) {
      console.error('News storage update failed:', error)
      return {
        success: false,
        inserted: 0,
        deleted: 0,
        totalStored: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get latest news for chat context
   * @param limit Maximum number of news items to retrieve
   * @returns Array of news items
   */
  async getLatestNewsForContext(limit: number = NEWS_CONFIG.maxNewsItems): Promise<APINewsItem[]> {
    try {
      const newsItems = await supabaseClient.getLatestNews(limit)
      
      return newsItems.map(item => ({
        headline: item.headline,
        url: item.url,
        published_at: item.published_at,
        source: item.source
      }))
    } catch (error) {
      console.error('Failed to get news for context:', error)
      return []
    }
  }

  /**
   * Sanitize headline text to prevent issues
   * @param headline Raw headline text
   * @returns Sanitized headline
   */
  private sanitizeHeadline(headline: string): string {
    return headline
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 500) // Limit length to prevent database issues
  }

  /**
   * Check database health and news freshness
   * @returns Health status information
   */
  async getHealthStatus(): Promise<{
    databaseHealthy: boolean
    newsCount: number
    lastUpdate?: string
    apiConfigured: boolean
  }> {
    try {
      const databaseHealthy = await supabaseClient.healthCheck()
      const newsItems = await supabaseClient.getLatestNews(1)
      
      return {
        databaseHealthy,
        newsCount: newsItems.length,
        lastUpdate: newsItems[0]?.created_at,
        apiConfigured: this.newsClient.isConfigured()
      }
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        databaseHealthy: false,
        newsCount: 0,
        apiConfigured: this.newsClient.isConfigured()
      }
    }
  }
}

// Export singleton instance
export const newsStorageService = new NewsStorageService()