import cron from 'node-cron';
import { RSSService } from './rss.service';

const rssService = new RSSService();

export class ScraperScheduler {
  private cronJobs: cron.ScheduledTask[] = [];

  /**
   * Start all scraper cron jobs
   */
  start() {
    console.log('🕙 Starting scraper scheduler...\n');

    // Run every hour at minute 0
    const hourlyJob = cron.schedule('0 * * * *', async () => {
      console.log('\n' + '='.repeat(60));
      console.log(`🤖 Hourly scraping started at ${new Date().toISOString()}`);
      console.log('='.repeat(60));

      try {
        await rssService.scrapeAllRSS();
      } catch (error) {
        console.error('❌ Scraping error:', error);
      }

      console.log('='.repeat(60) + '\n');
    });

    this.cronJobs.push(hourlyJob);

    // Log next run times
    console.log('✅ Scraper scheduler started successfully!');
    console.log('📅 Schedule: Every hour at minute 0');
    console.log('💡 Tip: First run will occur at the top of the next hour\n');

    return this;
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    console.log('\n🛑 Stopping scraper scheduler...');
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs = [];
    console.log('✅ Scheduler stopped\n');
  }

  /**
   * Manual trigger for testing
   */
  async triggerManually() {
    console.log('\n🔄 Manual scraping triggered...\n');
    return await rssService.scrapeAllRSS();
  }
}

export default ScraperScheduler;
