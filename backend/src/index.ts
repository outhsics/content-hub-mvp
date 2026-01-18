import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  const port = process.env.PORT || 3001;

  console.log('🚀 ContentHub Backend Starting...\n');
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Port: ${port}\n`);

  // Import services
  const { ScraperScheduler } = await import('./services/scraper/scheduler');
  const { DailyGenerator } = await import('./services/daily-generator');
  const { db } = await import('./db/connection');

  // Start the scraper scheduler (runs every hour)
  console.log('🕙 Starting scraper scheduler...');
  const scraperScheduler = new ScraperScheduler();
  scraperScheduler.start();
  console.log('✅ Scraper scheduler running (every hour)\n');

  // Start the daily generator (runs every day at 8:00 AM)
  console.log('📅 Starting daily generator...');
  const dailyGenerator = new DailyGenerator();
  dailyGenerator.schedule(8, 0); // 8:00 AM
  console.log('✅ Daily generator scheduled (8:00 AM daily)\n');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    scraperScheduler.stop();
    dailyGenerator.stop();
    db.close();
    process.exit(0);
  });

  console.log('='.repeat(70));
  console.log('✅ ContentHub Backend is now running!');
  console.log('='.repeat(70));
  console.log('\n📋 Active Services:');
  console.log('  📡 RSS Scraper: Every hour at minute 0');
  console.log('  📅 Daily Generator: Every day at 8:00 AM');
  console.log('\n💡 Next scheduled tasks:');
  console.log('  🤖 AI Scoring: Will run after next scraper cycle');
  console.log('  🎨 Content Generation: Will run at 8:00 AM');
  console.log('\n📝 Logs:');
  console.log('  - All activities are logged to console');
  console.log('  - Check database for articles and rewrites');
  console.log('\n💡 Press Ctrl+C to stop\n');
}

main().catch((error) => {
  console.error('❌ Failed to start backend:', error);
  process.exit(1);
});
