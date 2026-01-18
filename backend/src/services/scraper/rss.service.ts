import Parser from 'rss-parser';
import { db } from '../../db/connection';

const parser = new Parser({
  timeout: 10000, // 10 second timeout
  customFields: {
    item: [
      ['media:content', 'media'],
      ['content:encoded', 'encodedContent'],
      ['dc:creator', 'creator']
    ]
  }
});

export interface RSSArticle {
  title: string;
  content: string;
  link: string;
  pubDate?: Date;
  author?: string;
}

export class RSSService {
  /**
   * Scrape a single RSS source and save new articles
   */
  async scrapeRSS(sourceId: string, rssUrl: string): Promise<{
    success: boolean;
    count: number;
    error?: string;
  }> {
    try {
      console.log(`  📡 Scraping RSS: ${rssUrl}`);

      const feed = await parser.parseURL(rssUrl);
      const newArticles: RSSArticle[] = [];

      // Process each item in the feed
      for (const item of feed.items || []) {
        if (!item.link || !item.title) continue;

        const article: RSSArticle = {
          title: item.title,
          content: this.extractContent(item),
          link: item.link,
          pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
          author: item.creator || item.author || feed.title
        };

        // Check if article already exists
        const existing = await db.query(
          'SELECT id FROM raw_articles WHERE original_url = $1',
          [article.link]
        );

        if (existing.rows.length === 0) {
          newArticles.push(article);
        }
      }

      // Save new articles to database
      let savedCount = 0;
      for (const article of newArticles) {
        try {
          await db.query(
            `INSERT INTO raw_articles (source_id, title, content, original_url, author, published_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              sourceId,
              article.title,
              article.content,
              article.link,
              article.author,
              article.pubDate
            ]
          );
          savedCount++;
        } catch (error) {
          console.error(`    ❌ Failed to save article: ${article.title}`, error);
        }
      }

      // Update source's last checked time
      await db.query(
        'UPDATE sources SET last_checked_at = NOW() WHERE id = $1',
        [sourceId]
      );

      // Update last_found_at if we found new articles
      if (savedCount > 0) {
        await db.query(
          'UPDATE sources SET last_found_at = NOW() WHERE id = $1',
          [sourceId]
        );
      }

      console.log(`  ✅ Found ${savedCount} new articles from ${feed.title || rssUrl}`);

      return { success: true, count: savedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ RSS scraping error for ${rssUrl}:`, errorMessage);

      // Update source with error message
      await db.query(
        'UPDATE sources SET last_checked_at = NOW() WHERE id = $1',
        [sourceId]
      ).catch(() => {}); // Ignore errors on update

      return { success: false, count: 0, error: errorMessage };
    }
  }

  /**
   * Scrape all active RSS sources
   */
  async scrapeAllRSS(): Promise<Array<{
    sourceId: string;
    success: boolean;
    count: number;
    error?: string;
  }>> {
    console.log('\n🔄 Starting RSS scraping for all sources...');

    const sources = await db.query(
      "SELECT id, url FROM sources WHERE source_type = 'rss' AND is_active = true"
    );

    console.log(`  📊 Found ${sources.rows.length} active RSS sources`);

    const results = [];

    for (const source of sources.rows) {
      const result = await this.scrapeRSS(source.id, source.url);
      results.push({
        sourceId: source.id,
        ...result
      });

      // Small delay between requests to be polite
      await this.sleep(1000);
    }

    const totalNew = results.reduce((sum, r) => sum + r.count, 0);
    console.log(`\n✅ Scraping complete! Total new articles: ${totalNew}\n`);

    return results;
  }

  /**
   * Extract content from RSS item (try multiple fields)
   */
  private extractContent(item: any): string {
    // Priority: content:encoded > content > contentSnippet > description
    return (
      item['content:encoded'] ||
      item.content ||
      item.contentSnippet ||
      item.description ||
      ''
    );
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics for a source
   */
  async getSourceStats(sourceId: string) {
    const result = await db.query(
      `SELECT
         COUNT(*) as total_articles,
         COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
         COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
       FROM raw_articles
       WHERE source_id = $1`,
      [sourceId]
    );

    return result.rows[0];
  }
}
