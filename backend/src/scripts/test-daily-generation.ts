import dotenv from 'dotenv';
import { DailyGenerator } from '../services/daily-generator';

dotenv.config();

async function testDailyGeneration() {
  console.log('🧪 Testing Daily Content Generation\n');
  console.log('This will:');
  console.log('  1. Fetch new articles from RSS sources');
  console.log('  2. Score all pending articles');
  console.log('  3. Select top 5 articles');
  console.log('  4. Rewrite in 3 styles (15 articles total)');
  console.log('  5. Save everything to database\n');

  console.log('⏳ Starting...\n');

  const generator = new DailyGenerator();

  try {
    // Manual generation with smaller numbers for testing
    const result = await generator.manualGenerate(
      5, // 5 articles
      ['toutiao', 'zhihu', 'xiaohongshu'] // 3 styles
    );

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test Complete!');
    console.log('='.repeat(70));
    console.log('\n📊 Results:');
    console.log(`   Articles fetched:  ${result.articlesFetched}`);
    console.log(`   Articles scored:   ${result.articlesScored}`);
    console.log(`   Articles approved: ${result.articlesApproved}`);
    console.log(`   Articles selected: ${result.articlesSelected}`);
    console.log(`   Rewrites created:  ${result.rewritesCreated}`);
    console.log(`   Duration:          ${(result.duration / 1000).toFixed(1)}s`);
    console.log('='.repeat(70) + '\n');

    if (result.error) {
      console.log('⚠️  Warning:', result.error);
    }

    console.log('💡 Next steps:');
    console.log('  1. Check database for generated articles');
    console.log('  2. Review quality and adjust prompts if needed');
    console.log('  3. Use Dashboard (Phase 6) to view results\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testDailyGeneration();
