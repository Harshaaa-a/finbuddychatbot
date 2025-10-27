import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { NewsItem, NewsInsert } from './types.ts';

class SupabaseClientWrapper {
  private client: SupabaseClient;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    this.client = createClient(supabaseUrl, supabaseServiceKey);
  }

  private async retry<T>(operation: () => Promise<T>, retries = this.maxRetries): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        console.warn(`Operation failed, retrying in ${this.retryDelay}ms. Retries left: ${retries - 1}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retry(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Get the latest news items, ordered by creation date (most recent first)
   * @param limit Maximum number of items to retrieve (default: 10)
   * @returns Array of news items
   */
  async getLatestNews(limit = 10): Promise<NewsItem[]> {
    return this.retry(async () => {
      const { data, error } = await this.client
        .from('latest_news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch latest news: ${error.message}`);
      }

      return data || [];
    });
  }

  /**
   * Insert new news items into the database
   * @param newsItems Array of news items to insert
   * @returns Array of inserted news items with IDs
   */
  async insertNews(newsItems: NewsInsert[]): Promise<NewsItem[]> {
    return this.retry(async () => {
      const { data, error } = await this.client
        .from('latest_news')
        .insert(newsItems)
        .select();

      if (error) {
        throw new Error(`Failed to insert news items: ${error.message}`);
      }

      return data || [];
    });
  }

  /**
   * Delete old news items, keeping only the specified number of latest items
   * @param keepCount Number of latest items to keep (default: 10)
   * @returns Number of deleted items
   */
  async cleanupOldNews(keepCount = 10): Promise<number> {
    return this.retry(async () => {
      // First, get the IDs of items to keep
      const { data: itemsToKeep, error: selectError } = await this.client
        .from('latest_news')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(keepCount);

      if (selectError) {
        throw new Error(`Failed to select items to keep: ${selectError.message}`);
      }

      if (!itemsToKeep || itemsToKeep.length === 0) {
        return 0; // No items to delete
      }

      const idsToKeep = itemsToKeep.map(item => item.id);

      // Delete items not in the keep list
      const { data, error: deleteError } = await this.client
        .from('latest_news')
        .delete()
        .not('id', 'in', `(${idsToKeep.join(',')})`)
        .select('id');

      if (deleteError) {
        throw new Error(`Failed to cleanup old news: ${deleteError.message}`);
      }

      return data?.length || 0;
    });
  }

  /**
   * Check if a news item with the same headline already exists
   * @param headline The headline to check for duplicates
   * @returns True if duplicate exists, false otherwise
   */
  async isDuplicateHeadline(headline: string): Promise<boolean> {
    return this.retry(async () => {
      const { data, error } = await this.client
        .from('latest_news')
        .select('id')
        .eq('headline', headline)
        .limit(1);

      if (error) {
        throw new Error(`Failed to check for duplicate headline: ${error.message}`);
      }

      return (data?.length || 0) > 0;
    });
  }

  /**
   * Update news storage with new items and cleanup old ones
   * @param newsItems New news items to add
   * @param keepCount Number of latest items to keep after update
   * @returns Object with inserted count and deleted count
   */
  async updateNewsStorage(newsItems: NewsInsert[], keepCount = 10): Promise<{ inserted: number; deleted: number }> {
    // Filter out duplicates
    const uniqueItems: NewsInsert[] = [];
    for (const item of newsItems) {
      const isDuplicate = await this.isDuplicateHeadline(item.headline);
      if (!isDuplicate) {
        uniqueItems.push(item);
      }
    }

    // Insert new items
    const insertedItems = uniqueItems.length > 0 ? await this.insertNews(uniqueItems) : [];

    // Cleanup old items
    const deletedCount = await this.cleanupOldNews(keepCount);

    return {
      inserted: insertedItems.length,
      deleted: deletedCount
    };
  }

  /**
   * Get database connection health status
   * @returns True if connection is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('latest_news')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const supabaseClient = new SupabaseClientWrapper();