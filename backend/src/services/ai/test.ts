import dotenv from 'dotenv';
import { ArticleScorer } from './scorer.service';
import { TitleOptimizer } from './title-optimizer.service';
import { ContentRewriter } from './rewriter.service';
import { db } from '../../db/connection';

dotenv.config();

async function testScoring() {
  console.log('🧪 Testing Article Scorer\n');

  const scorer = new ArticleScorer();

  // Test with a sample article
  const sampleArticle = {
    title: '5种提升生产力的方法',
    content: '在现代快节奏的工作环境中，提升生产力是每个人都关心的话题。本文将介绍5种经过验证的生产力提升方法，包括时间管理、任务优先级排序、消除干扰等。这些方法不仅适用于职场人士，也适合学生和自由职业者。通过实践这些技巧，你可以更高效地完成工作，腾出更多时间享受生活。'
  };

  console.log('Testing with sample article:');
  console.log(`Title: ${sampleArticle.title}`);
  console.log(`Content: ${sampleArticle.content.substring(0, 100)}...\n`);

  try {
    const result = await scorer.scoreArticle(
      'test-id',
      sampleArticle.title,
      sampleArticle.content
    );

    console.log('✅ Scoring result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

async function testTitleOptimizer() {
  console.log('🧪 Testing Title Optimizer\n');

  const optimizer = new TitleOptimizer();

  const sampleArticle = {
    title: '如何提升工作效率',
    content: '在现代职场中，工作效率是每个人都在关注的话题。本文将分享一些实用的工作效率提升技巧...'
  };

  try {
    const titles = await optimizer.generateTitles(
      sampleArticle.title,
      sampleArticle.content,
      'toutiao',
      10
    );

    console.log('✅ Generated titles:');
    titles.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.title} (CTR: ${(t.predicted_ctr * 100).toFixed(1)}%)`);
    });
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

async function testRewriter() {
  console.log('🧪 Testing Content Rewriter\n');

  const rewriter = new ContentRewriter();

  const sampleArticle = {
    id: 'test-article-id',
    title: '5种提升个人效率的方法',
    content: `在现代社会，高效率是成功的关键。本文将介绍5种经过验证的效率提升方法：

1. 时间管理：使用番茄工作法，25分钟专注工作，5分钟休息
2. 任务优先级：使用艾森豪威尔矩阵，区分重要和紧急
3. 消除干扰：关闭通知，创造专注的工作环境
4. 批量处理：相似任务一起处理，减少切换成本
5. 定期休息：保持工作与生活的平衡

这些方法经过验证，可以显著提升个人效率。`
  };

  try {
    console.log(`Original: "${sampleArticle.title}"\n`);

    const result = await rewriter.rewriteArticle(
      sampleArticle.id,
      sampleArticle.title,
      sampleArticle.content,
      'toutiao'
    );

    console.log('\n✅ Rewrite result:');
    console.log(`Title: ${result.title}`);
    console.log(`\nSummary: ${result.summary}`);
    console.log(`\nContent preview: ${result.content.substring(0, 200)}...`);
    console.log(`\nTags: ${result.tags.join(', ')}`);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

async function testBatchProcessing() {
  console.log('🧪 Testing Batch Processing\n');

  const scorer = new ArticleScorer();
  const rewriter = new ContentRewriter();

  try {
    // Step 1: Score pending articles
    console.log('Step 1: Scoring pending articles...\n');
    const scoreResult = await scorer.scorePendingArticles(10);

    // Step 2: Get top articles
    console.log('\nStep 2: Getting top articles...\n');
    const topArticles = await scorer.getTopArticles(5, 24);
    console.log(`Found ${topArticles.length} top articles\n`);

    if (topArticles.length > 0) {
      // Step 3: Rewrite in different styles
      console.log('Step 3: Rewriting articles...\n');
      const styles = ['toutiao', 'zhihu'];
      const rewriteResult = await rewriter.batchRewrite(topArticles, styles);

      console.log('\n✅ Batch processing complete!');
      console.log(JSON.stringify(rewriteResult, null, 2));
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

// Run specific test based on command
const testType = process.argv[2];

switch (testType) {
  case 'score':
    testScoring();
    break;
  case 'title':
    testTitleOptimizer();
    break;
  case 'rewrite':
    testRewriter();
    break;
  case 'batch':
    testBatchProcessing();
    break;
  default:
    console.log('Usage: npm run test:ai [score|title|rewrite|batch]');
    process.exit(1);
}
