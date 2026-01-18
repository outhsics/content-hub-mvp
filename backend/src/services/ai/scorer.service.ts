import openai, { MODELS, rateLimiter } from './openai.client';
import { db } from '../../db/connection';

export interface ScoreResult {
  overall_score: number;
  originality: number;
  utility: number;
  timeliness: number;
  viral_potential: number;
  audience_breadth: number;
  should_rewrite: boolean;
  reason: string;
}

export class ArticleScorer {
  /**
   * Score a single article
   */
  async scoreArticle(articleId: string, title: string, content: string): Promise<ScoreResult> {
    // Truncate content if too long (to save tokens)
    const truncatedContent = content.substring(0, 2000);

    const prompt = `你是一个内容质量评估专家。请给这篇文章打分（0-1）：

标题：${title}
内容：${truncatedContent}

评分维度：
1. 原创性 (0-1) - 内容是否独特、有新意
2. 实用性 (0-1) - 对读者是否有实际价值
3. 时效性 (0-1) - 是否是当前热点或具有长期价值
4. 爆款潜力 (0-1) - 标题是否吸引、是否有争议性、能否引发讨论
5. 受众广度 (0-1) - 大众关心还是小众领域

只返回 JSON，不要其他内容：
{
  "overall_score": 0.85,
  "originality": 0.7,
  "utility": 0.9,
  "timeliness": 0.8,
  "viral_potential": 0.75,
  "audience_breadth": 0.85,
  "should_rewrite": true,
  "reason": "高实用性的技术文章，适合改写"
}`;

    try {
      // Rate limiting
      await rateLimiter.wait();

      console.log(`  🤖 Scoring article: ${title.substring(0, 50)}...`);

      const response = await openai.chat.completions.create({
        model: MODELS.FAST,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的内容质量评估专家，善于识别有价值的文章。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}') as ScoreResult;

      // Validate scores
      if (typeof result.overall_score !== 'number' || result.overall_score < 0 || result.overall_score > 1) {
        throw new Error('Invalid score returned');
      }

      // Update database
      await db.query(
        `UPDATE raw_articles
         SET quality_score = $1, viral_potential = $2, engagement_prediction = $3, status = $4
         WHERE id = $5`,
        [
          result.overall_score,
          result.viral_potential,
          result.audience_breadth,
          result.should_rewrite ? 'approved' : 'rejected',
          articleId,
        ]
      );

      console.log(`  ✅ Scored: ${result.overall_score.toFixed(2)} - ${result.reason}`);

      return result;
    } catch (error) {
      console.error(`  ❌ Scoring error for article ${articleId}:`, error);

      // Mark as failed
      await db.query(
        "UPDATE raw_articles SET status = 'rejected' WHERE id = $1",
        [articleId]
      ).catch(() => {});

      throw error;
    }
  }

  /**
   * Score all pending articles (batch processing)
   */
  async scorePendingArticles(limit: number = 50): Promise<{
    scored: number;
    approved: number;
    rejected: number;
  }> {
    console.log('\n🤖 Scoring pending articles...\n');

    const { rows } = await db.query(
      `SELECT id, title, content
       FROM raw_articles
       WHERE status = 'pending'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    console.log(`  📊 Found ${rows.length} articles to score\n`);

    let approved = 0;
    let rejected = 0;

    for (const article of rows) {
      try {
        const result = await this.scoreArticle(article.id, article.title, article.content);

        if (result.should_rewrite) {
          approved++;
        } else {
          rejected++;
        }
      } catch (error) {
        console.error(`Failed to score article ${article.id}:`, error);
        rejected++;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n✅ Scoring complete!`);
    console.log(`   - Scored: ${rows.length}`);
    console.log(`   - Approved: ${approved}`);
    console.log(`   - Rejected: ${rejected}\n`);

    return { scored: rows.length, approved, rejected };
  }

  /**
   * Get top articles by quality score
   */
  async getTopArticles(limit: number = 10, hours: number = 24) {
    const { rows } = await db.query(
      `SELECT id, title, content, quality_score, viral_potential
       FROM raw_articles
       WHERE created_at > NOW() - INTERVAL '${hours} hours'
         AND status = 'approved'
       ORDER BY quality_score DESC, viral_potential DESC
       LIMIT $1`,
      [limit]
    );

    return rows;
  }
}
