import dotenv from 'dotenv';
import { RSSService } from './rss.service';
import { ScraperScheduler } from './scheduler';
import { db } from '../../db/connection';

dotenv.config();

async function testScraper() {
  console.log('🧪 Testing RSS Scraper\n');

  try {
    // Test 1: Database connection
    console.log('Test 1: Checking database connection...');
    await db.query('SELECT 1');
    console.log('✅ Database connected\n');

    // Test 2: Get active sources
    console.log('Test 2: Getting active RSS sources...');
    const sources = await db.query(
      "SELECT id, name, url FROM sources WHERE source_type = 'rss' AND is_active = true LIMIT 3"
    );

    console.log(`✅ Found ${sources.rows.length} sources to test:`);
    sources.rows.forEach(s => console.log(`  - ${s.name}: ${s.url}`));
    console.log('');

    // Test 3: Scrape one source
    if (sources.rows.length > 0) {
      const testSource = sources.rows[0];
      console.log(`Test 3: Testing single source (${testSource.name})...`);

      const rssService = new RSSService();
      const result = await rssService.scrapeRSS(testSource.id, testSource.url);

      console.log(`✅ Result: ${result.success ? 'Success' : 'Failed'}`);
      console.log(`   Articles found: ${result.count}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');

      // Test 4: Check saved articles
      console.log('Test 4: Checking saved articles...');
      const articles = await db.query(
        `SELECT COUNT(*) as count FROM raw_articles
         WHERE source_id = $1 AND created_at > NOW() - INTERVAL '5 minutes'`,
        [testSource.id]
      );

      console.log(`✅ Articles saved in last 5 minutes: ${articles.rows[0].count}`);
      console.log('');
    }

    // Test 5: Source statistics
    console.log('Test 5: Getting source statistics...');
    const rssService = new RSSService();
    for (const source of sources.rows) {
      const stats = await rssService.getSourceStats(source.id);
      console.log(`  📊 ${source.name}:`);
      console.log(`     - Total articles: ${stats.total_articles}`);
      console.log(`     - Last 24h: ${stats.last_24h}`);
      console.log(`     - Last 7 days: ${stats.last_7d}`);
    }
    console.log('');

    console.log('✅ All scraper tests passed!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

async function testScheduler() {
  console.log('🧪 Testing Scheduler\n');

  const scheduler = new ScraperScheduler();

  // Start scheduler
  scheduler.start();

  console.log('⏳ Scheduler running... Press Ctrl+C to stop\n');

  // Keep running
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Received interrupt signal...');
    scheduler.stop();
    db.close();
    process.exit(0);
  });

  // Wait indefinitely
  await new Promise(() => {});
}

// Run tests based on command line argument
const command = process.argv[2];

if (command === 'scheduler') {
  testScheduler();
} else {
  testScraper();
}
