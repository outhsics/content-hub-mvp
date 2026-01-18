import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple entry point for now
async function main() {
  const port = process.env.PORT || 3001;

  console.log('🚀 ContentHub Backend Starting...');
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Port: ${port}`);

  // TODO: Initialize Fastify server in Phase 6
  // TODO: Start cron jobs in Phase 5

  console.log('✅ Backend initialized successfully!');
}

main().catch((error) => {
  console.error('❌ Failed to start backend:', error);
  process.exit(1);
});
