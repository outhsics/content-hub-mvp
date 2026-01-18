import openai, { MODELS, rateLimiter } from './openai.client';
import { TitleOptimizer } from './title-optimizer.service';
import { db } from '../../db/connection';

export interface RewriteResult {
  title: string;
  summary: string;
  content: string;
  tags: string[];
}

export class ContentRewriter {
  private titleOptimizer = new TitleOptimizer();

  /**
   * Get style-specific system prompt
   */
  private getStylePrompt(style: string): string {
    const prompts = {
      toutiao: `你是今日头条的爆款内容创作者。

改写要求：
【标题】30字内，包含热点关键词，使用数字、疑问句，吸引点击

【开头】用热点/数据/痛点立即吸引读者（100-150字）

【正文】3-5段，每段有小标题，结构清晰：
- 第1段：问题/现象引入
- 第2段：深度分析或案例
- 第3段：实用建议或方法
- 第4段：总结启示

【结尾】引导互动：提问、鼓励评论转发

【语气】专业但不失亲和力，正能量导向

【标签】3-5个相关话题标签`,

      zhihu: `你是知乎的优质答主，以深度思考和独到见解著称。

改写要求：
【标题】有深度、有观点，20-40字，体现思考

【开头】故事、观点或问题引入主题（150-200字）

【正文】深度分析，逻辑严密：
- 第1部分：现象描述
- 第2部分：多角度分析
- 第3部分：案例和数据支撑
- 第4部分：独到见解

【结尾】总结观点，引发思考，升华主题

【格式】分段清晰，适当加粗重点

【语气】专业、有观点、有温度，避免说教`,

      xiaohongshu: `你是小红书的生活方式博主，擅长分享真实体验。

改写要求：
【标题】emoji + 短标题 + 吸引点（15-25字）

【开头】emoji + 话题引入，第一人称视角（50-80字）

【正文】分段 + emoji + 个人体验，短段落：
- 💡 要点1：我的发现/体验
- 📌 要点2：具体建议
- ✨ 要点3：总结感受

【结尾】话题标签 + 引导互动（收藏、评论、关注）

【格式】大量emoji、短段落、留白，视觉友好

【语气】亲切、有代入感、分享感

【标签】#话题1 #话题2 #话题3`,

      baijiahao: `你是百家号的优质创作者，擅长创作热门资讯内容。

改写要求：
【标题】结合热点，信息准确，15-25字

【开头】简明扼要，直击要点（80-100字）

【正文】信息密度高，结构紧凑：
- 第1段：核心信息
- 第2段：背景或详情
- 第3段：影响或意义

【结尾】总结或展望

【语气】客观、准确、及时

【格式】适合快速阅读，段落简短`
    };

    return prompts[style as keyof typeof prompts] || prompts.toutiao;
  }

  /**
   * Rewrite an article in specified style
   */
  async rewriteArticle(
    rawArticleId: string,
    originalTitle: string,
    originalContent: string,
    style: string
  ): Promise<RewriteResult> {
    console.log(`\n  🎨 Rewriting article in ${style} style...`);
    console.log(`  📰 Original: "${originalTitle.substring(0, 50)}..."`);

    try {
      // Step 1: Generate optimized titles
      const titles = await this.titleOptimizer.generateTitles(
        originalTitle,
        originalContent,
        style,
        10
      );
      const bestTitle = this.titleOptimizer.selectBestTitle(titles);

      // Step 2: Generate rewrite
      const stylePrompt = this.getStylePrompt(style);
      const truncatedContent = originalContent.substring(0, 3000);

      const prompt = `${stylePrompt}

---

原标题：${originalTitle}
原文内容：${truncatedContent}

目标标题：${bestTitle.title}

请按照上述要求改写内容。

**重要要求：**
1. 保持核心观点，但完全重新表达
2. 添加个人见解和分析
3. 举例说明（如果适用）
4. 确保原创性，避免被检测为重复内容
5. 字数控制在建议范围内

输出格式（严格按此格式）：

标题：${bestTitle.title}

摘要：[100字左右的内容摘要]

正文：
[改写后的正文内容]

标签：#标签1 #标签2 #标签3`;

      await rateLimiter.wait();

      const response = await openai.chat.completions.create({
        model: MODELS.QUALITY,
        messages: [
          {
            role: 'system',
            content: '你是专业的内容创作者，擅长将现有内容改写成不同风格，确保原创性和可读性。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 3500,
      });

      const resultText = response.choices[0].message.content || '';
      const parsed = this.parseRewriteResult(resultText, bestTitle.title);

      // Step 3: Save to database
      const template = await db.query(
        "SELECT id FROM rewrite_templates WHERE style = $1 LIMIT 1",
        [style]
      );

      if (template.rows.length === 0) {
        throw new Error(`Template not found for style: ${style}`);
      }

      await db.query(
        `INSERT INTO published_articles (raw_article_id, template_id, title, content, summary, keywords, target_platforms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          rawArticleId,
          template.rows[0].id,
          parsed.title,
          parsed.content,
          parsed.summary,
          parsed.tags,
          [style],
        ]
      );

      // Update template usage count
      await db.query(
        "UPDATE rewrite_templates SET usage_count = usage_count + 1 WHERE id = $1",
        [template.rows[0].id]
      );

      // Update raw article status
      await db.query(
        "UPDATE raw_articles SET status = 'rewritten' WHERE id = $1",
        [rawArticleId]
      );

      console.log(`  ✅ Rewrite complete: "${parsed.title.substring(0, 50)}..."`);

      return parsed;
    } catch (error) {
      console.error(`  ❌ Rewrite error:`, error);
      throw error;
    }
  }

  /**
   * Parse AI response into structured result
   */
  private parseRewriteResult(text: string, defaultTitle: string): RewriteResult {
    const lines = text.split('\n');
    let title = defaultTitle;
    let summary = '';
    let content = '';
    const tags: string[] = [];

    let currentSection = '';
    const contentLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('标题：') || line.startsWith('标题:')) {
        title = line.replace(/^标题[：:]\s*/, '').trim();
      } else if (line.startsWith('摘要：') || line.startsWith('摘要:')) {
        summary = line.replace(/^摘要[：:]\s*/, '').trim();
      } else if (line.startsWith('标签：') || line.startsWith('标签:')) {
        const tagStr = line.replace(/^标签[：:]\s*/, '').trim();
        const extractedTags = tagStr.split('#').filter(t => t.trim());
        tags.push(...extractedTags);
      } else if (line.startsWith('正文：') || line.startsWith('正文:')) {
        currentSection = 'content';
      } else if (currentSection === 'content' && line.trim()) {
        contentLines.push(line);
      }
    }

    content = contentLines.join('\n').trim();

    // Fallback: if parsing failed, use entire text as content
    if (!content) {
      content = text;
    }

    // Extract tags from content if not found
    if (tags.length === 0) {
      const tagMatch = content.match(/#[\u4e00-\u9fa5a-zA-Z0-9_]+/g);
      if (tagMatch) {
        tags.push(...tagMatch.map(t => t.replace('#', '')));
      }
    }

    return { title, summary, content, tags };
  }

  /**
   * Batch rewrite articles
   */
  async batchRewrite(
    articles: Array<{ id: string; title: string; content: string }>,
    styles: string[]
  ): Promise<{ total: number; successful: number; failed: number }> {
    console.log(`\n🔄 Batch rewriting ${articles.length} articles in ${styles.length} styles...`);

    let successful = 0;
    let failed = 0;
    const total = articles.length * styles.length;

    for (const article of articles) {
      for (const style of styles) {
        try {
          await this.rewriteArticle(article.id, article.title, article.content, style);
          successful++;
        } catch (error) {
          console.error(`Failed to rewrite ${article.id} in ${style}:`, error);
          failed++;
        }
      }
    }

    console.log(`\n✅ Batch rewrite complete:`);
    console.log(`   - Total: ${total}`);
    console.log(`   - Successful: ${successful}`);
    console.log(`   - Failed: ${failed}\n`);

    return { total, successful, failed };
  }
}
