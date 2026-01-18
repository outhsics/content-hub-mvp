import cron from 'node-cron';
import { ArticleScorer } from './ai/scorer.service';
import { ContentRewriter } from './ai/rewriter.service';
import { RSSService } from './scraper/rss.service';
import { db } from '../db/connection';

export interface GenerationResult {
  success: boolean;
  articlesFetched: number;
  articlesScored: number;
  articlesApproved: number;
  articlesSelected: number;
  rewritesCreated: number;
  duration: number;
  error?: string;
}

export class DailyGenerator {
  private articleScorer = new ArticleScorer();
  private contentRewriter = new ContentRewriter();
  private rssService = new RSSService();
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Schedule daily content generation
   * Runs every day at 8:00 AM by default
   */
  schedule(hour: number = 8, minute: number = 0) {
    console.log(`🕙 Scheduling daily content generation for ${hour}:${minute.toString().padStart(2, '0')}...\n`);

    // Cron expression: minute hour * * *
    const cronExpression = `${minute} ${hour} * * *`;

    this.cronJob = cron.schedule(cronExpression, async () => {
      console.log('\n' + '='.repeat(70));
      console.log(`🚀 Daily Content Generation Started at ${new Date().toISOString()}`);
      console.log('='.repeat(70) + '\n');

      try {
        const result = await this.generateDailyContent();

        console.log('\n' + '='.repeat(70));
        console.log('✅ Daily Content Generation Complete!');
        console.log('='.repeat(70));
        console.log(`📊 Results:`);
        console.log(`   - Articles fetched: ${result.articlesFetched}`);
        console.log(`   - Articles scored: ${result.articlesScored}`);
        console.log(`   - Articles approved: ${result.articlesApproved}`);
        console.log(`   - Articles selected: ${result.articlesSelected}`);
        console.log(`   - Rewrites created: ${result.rewritesCreated}`);
        console.log(`   - Duration: ${(result.duration / 1000).toFixed(1)}s`);
        console.log('='.repeat(70) + '\n');

        // TODO: Send notification (Phase 6)
      } catch (error) {
        console.error('\n❌ Daily generation failed:', error);
      }
    });

    console.log(`✅ Scheduled for daily execution at ${hour}:${minute.toString().padStart(2, '0')}`);
    console.log(`⏰ Next run: ${this.getNextRunTime(hour, minute)}\n`);

    return this;
  }

  /**
   * Generate daily content (main workflow)
   */
  async generateDailyContent(
    articleCount: number = 10,
    styles: string[] = ['toutiao', 'zhihu', 'xiaohongshu']
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    let articlesFetched = 0;
    let articlesScored = 0;
    let articlesApproved = 0;
    let articlesSelected = 0;
    let rewritesCreated = 0;

    try {
      // Step 1: Fetch new articles from RSS sources
      console.log('📡 Step 1: Fetching new articles from RSS sources...\n');
      const fetchResults = await this.rssService.scrapeAllRSS();
      articlesFetched = fetchResults.reduce((sum, r) => sum + r.count, 0);
      console.log(`✅ Fetched ${articlesFetched} new articles\n`);

      // Small delay to let database settle
      await this.sleep(2000);

      // Step 2: Score pending articles
      console.log('🤖 Step 2: Scoring pending articles...\n');
      const scoreResult = await this.articleScorer.scorePendingArticles(100);
      articlesScored = scoreResult.scored;
      articlesApproved = scoreResult.approved;
      console.log('');

      // Step 3: Select top articles from last 24 hours
      console.log(`📊 Step 3: Selecting top ${articleCount} articles from last 24 hours...\n`);
      const topArticles = await this.articleScorer.getTopArticles(articleCount, 24);
      articlesSelected = topArticles.length;

      console.log(`✅ Selected ${articlesSelected} articles:\n`);
      topArticles.forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.title.substring(0, 60)}...`);
        console.log(`      Score: ${article.quality_score?.toFixed(2)} | Viral: ${article.viral_potential?.toFixed(2)}`);
      });
      console.log('');

      if (articlesSelected === 0) {
        console.log('⚠️  No approved articles found. Skipping rewrite step.\n');
        return {
          success: true,
          articlesFetched,
          articlesScored,
          articlesApproved,
          articlesSelected,
          rewritesCreated: 0,
          duration: Date.now() - startTime
        };
      }

      // Step 4: Rewrite articles in different styles
      console.log(`🎨 Step 4: Rewriting ${articlesSelected} articles in ${styles.length} styles...\n`);
      const rewriteResult = await this.contentRewriter.batchRewrite(topArticles, styles);
      rewritesCreated = rewriteResult.successful;

      const duration = Date.now() - startTime;

      return {
        success: true,
        articlesFetched,
        articlesScored,
        articlesApproved,
        articlesSelected,
        rewritesCreated,
        duration
      };

    } catch (error) {
      console.error('❌ Generation error:', error);

      return {
        success: false,
        articlesFetched,
        articlesScored,
        articlesApproved,
        articlesSelected,
        rewritesCreated,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Manual trigger for testing
   */
  async manualGenerate(
    articleCount: number = 10,
    styles: string[] = ['toutiao', 'zhihu', 'xiaohongshu']
  ): Promise<GenerationResult> {
    console.log('\n🔄 Manual generation triggered...\n');
    return await this.generateDailyContent(articleCount, styles);
  }

  /**
   * Get statistics for today's generation
   */
  async getTodayStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { rows } = await db.query(
      `SELECT
         COUNT(*) as total_articles,
         COUNT(DISTINCT raw_article_id) as unique_sources,
         AVG(quality_score) as avg_quality
       FROM published_articles
       WHERE created_at >= $1`,
      [startOfDay]
    );

    return rows[0];
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      console.log('\n🛑 Stopping daily generator...\n');
      this.cronJob.stop();
      this.cronJob = null;
      console.log('✅ Daily generator stopped\n');
    }
  }

  /**
   * Helper: Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: Get next run time
   */
  private getNextRunTime(hour: number, minute: number): string {
    const now = new Date();
    const next = new Date();

    next.setHours(hour, minute, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default DailyGenerator;
