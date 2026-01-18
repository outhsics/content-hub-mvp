import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple entry point for now
async function main() {
  const port = process.env.PORT || 3001;

  console.log('🚀 ContentHub Backend Starting...\n');
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Port: ${port}\n`);

  // Import and start scheduler
  const { ScraperScheduler } = await import('./services/scraper/scheduler');
  const { db } = await import('./db/connection');

  // Start the scraper scheduler
  const scheduler = new ScraperScheduler();
  scheduler.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    scheduler.stop();
    db.close();
    process.exit(0);
  });

  console.log('✅ Backend initialized successfully!');
  console.log('💡 Press Ctrl+C to stop\n');
}

main().catch((error) => {
  console.error('❌ Failed to start backend:', error);
  process.exit(1);
});
