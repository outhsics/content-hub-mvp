# Ralph Wiggum 24小时开发循环 - ContentHub 个人版

## 项目目标
构建一个 AI 驱动的个人内容生产系统，每天自动生成 10 篇高质量文章，用于多平台发布赚取收益。

**严格时间限制：每个 Phase 有最大迭代次数限制，达到后必须总结并进入下一阶段。**

---

## Phase 1: 项目初始化（最大 15 次迭代）

### 任务清单
1. **创建 Monorepo 结构**
   ```
   content-hub-personal/
   ├── backend/                 # Fastify 后端
   ├── frontend/               # Next.js 前端
   ├── shared/                 # 共享类型
   ├── docs/                   # 架构文档已存在
   └── .env.example
   ```

2. **Backend 初始化**
   ```bash
   cd backend
   npm init -y
   npm install:
   - @fastify/cors
   - @fastify/jwt
   - pg (PostgreSQL client)
   - dotenv
   - openai
   - rss-parser
   - twitter-api-v2
   - node-cron
   - tsx
   - typescript
   - @types/node
   - @types/node-cron
   ```

3. **Frontend 初始化**
   ```bash
   cd frontend
   npx create-next-app@latest . --typescript --tailwind --app
   npm install:
   - @supabase/supabase-js
   - react-markdown
   - date-fns
   - lucide-react
   ```

4. **TypeScript 配置**
   - Backend: tsconfig.json (strict mode)
   - Frontend: 使用 Next.js 默认配置
   - Shared: 共享类型定义

5. **环境变量模板**
   创建 `.env.example`:
   ```env
   # Database
   DATABASE_URL=
   SUPABASE_URL=
   SUPABASE_ANON_KEY=

   # OpenAI
   OPENAI_API_KEY=

   # Twitter
   TWITTER_API_KEY=
   TWITTER_API_SECRET=
   TWITTER_ACCESS_TOKEN=
   TWITTER_ACCESS_SECRET=

   # JWT Secret
   JWT_SECRET=

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

6. **Git 初始化**
   ```bash
   git init
   git add .
   git commit -m "Initial project structure"
   ```

### 完成标准
- [ ] Backend 可以运行 `tsx watch src/index.ts`
- [ ] Frontend 可以运行 `npm run dev`
- [ ] 所有依赖安装无错误
- [ ] TypeScript 编译无错误
- [ ] 环境变量模板创建完成

### 输出
```
<promise>PHASE1_COMPLETE</promise>
并在输出中列出所有创建的文件和目录结构。
```

---

## Phase 2: 数据库设置（最大 20 次迭代）

### 任务清单
1. **创建 Supabase 项目**
   - 在输出中指导用户手动创建（提供步骤）
   - 获取 DATABASE_URL 和 SUPABASE credentials

2. **创建数据库 Schema**
   创建文件 `backend/db/schema.sql`:
   ```sql
   -- Sources 表
   CREATE TABLE IF NOT EXISTS sources (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(100) NOT NULL,
     source_type VARCHAR(20) NOT NULL,
     url TEXT,
     twitter_handle VARCHAR(50),
     priority INTEGER DEFAULT 5,
     quality_score DECIMAL(3,2),
     is_active BOOLEAN DEFAULT true,
     check_interval_hours INTEGER DEFAULT 1,
     last_checked_at TIMESTAMPTZ,
     last_found_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Raw Articles 表
   CREATE TYPE article_status AS ENUM ('pending', 'approved', 'rejected', 'rewritten');

   CREATE TABLE IF NOT EXISTS raw_articles (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     source_id UUID REFERENCES sources(id),
     title TEXT NOT NULL,
     content TEXT,
     original_url TEXT UNIQUE NOT NULL,
     author VARCHAR(100),
     published_at TIMESTAMPTZ,
     quality_score DECIMAL(3,2),
     viral_potential DECIMAL(3,2),
     engagement_prediction DECIMAL(3,2),
     tags TEXT[],
     keywords TEXT[],
     category VARCHAR(50),
     status article_status DEFAULT 'pending',
     scraped_at TIMESTAMPTZ DEFAULT NOW(),
     created_at TIMESTAMPTZ DEFAULT NOW()
     );

   -- Rewrite Templates 表
   CREATE TABLE IF NOT EXISTS rewrite_templates (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(100) NOT NULL,
     style VARCHAR(50) NOT NULL,
     system_prompt TEXT NOT NULL,
     prompt_template TEXT NOT NULL,
     output_length INTEGER,
     tone VARCHAR(50),
     usage_count INTEGER DEFAULT 0,
     avg_rating DECIMAL(3,2),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Published Articles 表
   CREATE TABLE IF NOT EXISTS published_articles (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     raw_article_id UUID REFERENCES raw_articles(id),
     template_id UUID REFERENCES rewrite_templates(id),
     title TEXT NOT NULL,
     content TEXT NOT NULL,
     summary TEXT,
     seo_title TEXT,
     meta_description TEXT,
     keywords TEXT[],
     target_platforms VARCHAR(50)[],
     published_urls JSONB,
     views INTEGER DEFAULT 0,
     likes INTEGER DEFAULT 0,
     comments INTEGER DEFAULT 0,
     shares INTEGER DEFAULT 0,
     estimated_revenue DECIMAL(10,2),
     actual_revenue DECIMAL(10,2),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     published_at TIMESTAMPTZ
   );

   -- 创建索引
   CREATE INDEX IF NOT EXISTS idx_raw_articles_score ON raw_articles(quality_score DESC);
   CREATE INDEX IF NOT EXISTS idx_raw_articles_viral ON raw_articles(viral_potential DESC);
   CREATE INDEX IF NOT EXISTS idx_raw_articles_status ON raw_articles(status);
   CREATE INDEX IF NOT EXISTS idx_published_created ON published_articles(created_at DESC);
   ```

3. **创建数据库连接**
   文件：`backend/src/db/connection.ts`:
   ```typescript
   import { Pool } from 'pg';
   import dotenv from 'dotenv';

   dotenv.config();

   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
   });

   export const db = {
     query: (text: string, params?: any[]) => pool.query(text, params),
     close: () => pool.end(),
   };

   export default db;
   ```

4. **插入初始数据**
   创建 `backend/src/db/seed.sql`:
   ```sql
   -- 预设高质量信源
   INSERT INTO sources (name, source_type, url, priority) VALUES
   ('TechCrunch RSS', 'rss', 'https://techcrunch.com/feed/', 9),
   ('Hacker News', 'rss', 'https://news.ycombinator.com/rss', 8),
   ('IndieHackers', 'rss', 'https://www.indiehackers.com/latest.rss', 8),
   ('The Verge', 'rss', 'https://www.theverge.com/rss/index.xml', 8)
   ON CONFLICT DO NOTHING;

   -- 预设改写模板（使用架构文档中的模板）
   INSERT INTO rewrite_templates (name, style, system_prompt, prompt_template) VALUES
   ('今日头条爆款', 'toutiao', '你是今日头条的爆款内容创作者...', 'template_here'),
   ('知乎深度回答', 'zhihu', '你是知乎的优质回答者...', 'template_here'),
   ('小红书种草', 'xiaohongshu', '你是小红书的生活方式博主...', 'template_here')
   ON CONFLICT DO NOTHING;
   ```

5. **验证数据库连接**
   创建测试脚本 `backend/src/db/test.ts` 验证连接和表创建

### 完成标准
- [ ] Supabase 项目创建指导清晰
- [ ] 所有表创建成功
- [ ] 索引创建成功
- [ ] 初始数据插入成功
- [ ] 数据库连接测试通过

### 输出
```
<promise>PHASE2_COMPLETE</promise>
并提供 Supabase 设置步骤的总结。
```

---

## Phase 3: 抓取服务（最大 25 次迭代）

### 任务清单

#### 3.1 RSS 抓取服务
文件：`backend/src/services/scraper/rss.service.ts`

```typescript
import Parser from 'rss-parser';
import { db } from '../../db/connection';

const parser = new Parser();

interface RSSArticle {
  title: string;
  content: string;
  link: string;
  pubDate?: Date;
  author?: string;
}

export class RSSService {
  async scrapeRSS(sourceId: string, rssUrl: string) {
    try {
      const feed = await parser.parseURL(rssUrl);
      const articles: RSSArticle[] = [];

      for (const item of feed.items) {
        const article = {
          title: item.title || '',
          content: item.contentSnippet || item['content:encoded'] || '',
          link: item.link || '',
          pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
          author: item.creator || item.author || feed.title,
        };

        // 检查是否已存在
        const existing = await db.query(
          'SELECT id FROM raw_articles WHERE original_url = $1',
          [article.link]
        );

        if (existing.rows.length === 0) {
          articles.push(article);
        }
      }

      // 保存到数据库
      for (const article of articles) {
        await db.query(
          `INSERT INTO raw_articles (source_id, title, content, original_url, author, published_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [sourceId, article.title, article.content, article.link, article.author, article.pubDate]
        );
      }

      // 更新信源的最后检查时间
      await db.query(
        'UPDATE sources SET last_checked_at = NOW() WHERE id = $1',
        [sourceId]
      );

      return { success: true, count: articles.length };
    } catch (error) {
      console.error('RSS scraping error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async scrapeAllRSS() {
    const sources = await db.query(
      "SELECT id, url FROM sources WHERE source_type = 'rss' AND is_active = true"
    );

    const results = [];
    for (const source of sources.rows) {
      const result = await this.scrapeRSS(source.id, source.url);
      results.push({ sourceId: source.id, ...result });
    }

    return results;
  }
}
```

#### 3.2 Twitter 抓取服务（简化版，可选）
文件：`backend/src/services/scraper/twitter.service.ts`

- 使用 twitter-api-v2 或简化为 RSS（Twitter 提供 RSS feed）
- 如果 API 认证复杂，先跳过，后续手动添加

#### 3.3 抓取调度器
文件：`backend/src/services/scraper/scheduler.ts`

```typescript
import cron from 'node-cron';
import { RSSService } from './rss.service';

const rssService = new RSSService();

export class ScraperScheduler {
  start() {
    // 每小时抓取一次
    cron.schedule('0 * * * *', async () => {
      console.log('Starting RSS scraping...');
      const results = await rssService.scrapeAllRSS();
      console.log('Scraping results:', results);

      // 触发 AI 评分（下一阶段实现）
    });

    console.log('Scraper scheduler started');
  }
}
```

#### 3.4 测试
创建 `backend/src/services/scraper/test.ts`:
- 手动触发一次抓取
- 验证数据保存到数据库
- 检查去重逻辑

### 完成标准
- [ ] RSS 抓取功能完整
- [ ] 数据正确保存到数据库
- [ ] 去重逻辑有效
- [ ] Cron 调度器可以运行
- [ ] 测试脚本验证成功

### 输出
```
<promise>PHASE3_COMPLETE</promise>
```

---

## Phase 4: AI 服务（最大 30 次迭代）

### 任务清单

#### 4.1 OpenAI 客户端
文件：`backend/src/services/ai/openai.client.ts`

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

export const MODELS = {
  FAST: 'gpt-4o-mini',      // 评分、标题生成
  QUALITY: 'gpt-4o',        // 内容改写
};
```

#### 4.2 文章评分服务
文件：`backend/src/services/ai/scorer.service.ts`

```typescript
import openai, { MODELS } from './openai.client';

interface ScoreResult {
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
  async scoreArticle(articleId: string, title: string, content: string) {
    const prompt = `
你是一个内容质量评估专家。请给这篇文章打分（0-1）：

标题：${title}
内容：${content.substring(0, 2000)}

评分维度：
1. 原创性 (0-1) - 内容是否独特
2. 实用性 (0-1) - 对读者是否有实际价值
3. 时效性 (0-1) - 是否是当前热点
4. 爆款潜力 (0-1) - 标题是否吸引、是否有争议性
5. 受众广度 (0-1) - 大众关心还是小众

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
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: MODELS.FAST,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}') as ScoreResult;

      // 更新数据库
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

      return result;
    } catch (error) {
      console.error('Scoring error:', error);
      throw error;
    }
  }

  async scorePendingArticles() {
    const { rows } = await db.query(
      "SELECT id, title, content FROM raw_articles WHERE status = 'pending' LIMIT 50"
    );

    for (const article of rows) {
      await this.scoreArticle(article.id, article.title, article.content);
    }

    return { scored: rows.length };
  }
}
```

#### 4.3 标题优化服务
文件：`backend/src/services/ai/title-optimizer.service.ts`

```typescript
import openai, { MODELS } from './openai.client';

interface TitleOption {
  title: string;
  predicted_ctr: number;
}

export class TitleOptimizer {
  async generateTitles(originalTitle: string, content: string, platform: string, count: number = 10) {
    const prompt = `
基于原文，生成 ${count} 个高点击率标题：

原标题：${originalTitle}
核心内容：${content.substring(0, 500)}
目标平台：${platform}

要求：
1. 30字以内
2. 包含数字或疑问句
3. 制造好奇心或紧迫感
4. 正能量或痛点切入
5. 符合平台调性

返回 JSON 数组：
[
  {"title": "标题1", "predicted_ctr": 0.15},
  {"title": "标题2", "predicted_ctr": 0.12}
]
`;

    const response = await openai.chat.completions.create({
      model: MODELS.FAST,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.titles as TitleOption[];
  }
}
```

#### 4.4 内容改写服务
文件：`backend/src/services/ai/rewriter.service.ts`

```typescript
import openai, { MODELS } from './openai.client';
import { TitleOptimizer } from './title-optimizer.service';

interface RewriteResult {
  title: string;
  summary: string;
  content: string;
  tags: string[];
}

export class ContentRewriter {
  private titleOptimizer = new TitleOptimizer();

  private getStylePrompt(style: string): string {
    const prompts = {
      toutiao: `
你是今日头条的爆款内容创作者。
要求：
- 标题：30字内，包含热点关键词，使用数字、疑问句
- 正文：开头用热点/数据/痛点吸引；中间3-5段，每段有小标题；结尾引导互动
- 语气：专业但不失亲和力
- 标签：3-5个相关话题标签
`,
      zhihu: `
你是知乎的优质回答者。
要求：
- 标题：有深度、有观点，20-40字
- 正文：开头故事或观点引入；中间深度分析、案例、数据；结尾总结+引导关注
- 格式：分段清晰，适当加粗重点
- 语气：专业、有观点、有温度
`,
      xiaohongshu: `
你是小红书的生活方式博主。
要求：
- 标题：emoji + 短标题 + 吸引点
- 正文：开头emoji+话题引入；中间分段+emoji+个人体验；结尾话题标签+引导互动
- 格式：大量emoji、短段落、空行
- 语气：亲切、有代入感、分享感
- 标签：#话题1 #话题2
`,
    };

    return prompts[style as keyof typeof prompts] || prompts.toutiao;
  }

  async rewriteArticle(
    rawArticleId: string,
    originalTitle: string,
    originalContent: string,
    style: string
  ): Promise<RewriteResult> {
    // 1. 生成优化标题
    const titles = await this.titleOptimizer.generateTitles(
      originalTitle,
      originalContent,
      style,
      10
    );
    const bestTitle = titles[0].title;

    // 2. 改写内容
    const stylePrompt = this.getStylePrompt(style);

    const prompt = `
${stylePrompt}

原标题：${originalTitle}
原文内容：${originalContent.substring(0, 3000)}

目标标题：${bestTitle}

请改写上述内容，要求：
1. 保持核心观点，但完全重新表达
2. 添加个人见解和分析
3. 举例说明（如果适用）
4. 确保原创性，避免被检测为重复内容

输出格式：
标题：${bestTitle}

摘要：[100字摘要]

正文：
[改写后的内容，1000-2000字]

标签：#标签1 #标签2 #标签3
`;

    const response = await openai.chat.completions.create({
      model: MODELS.QUALITY,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 3000,
    });

    const result = response.choices[0].message.content || '';

    // 解析结果
    const parsed = this.parseRewriteResult(result, bestTitle);

    // 保存到数据库
    const template = await db.query(
      "SELECT id FROM rewrite_templates WHERE style = $1 LIMIT 1",
      [style]
    );

    await db.query(
      `INSERT INTO published_articles (raw_article_id, template_id, title, content, summary, keywords, target_platforms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        rawArticleId,
        template.rows[0]?.id,
        parsed.title,
        parsed.content,
        parsed.summary,
        parsed.tags,
        [style],
      ]
    );

    // 更新原文状态
    await db.query(
      "UPDATE raw_articles SET status = 'rewritten' WHERE id = $1",
      [rawArticleId]
    );

    return parsed;
  }

  private parseRewriteResult(text: string, defaultTitle: string): RewriteResult {
    // 简单解析，实际应该更robust
    const lines = text.split('\n');
    let title = defaultTitle;
    let summary = '';
    let content = '';
    const tags: string[] = [];

    let currentSection = '';
    const contentLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('标题：')) {
        title = line.replace('标题：', '').trim();
      } else if (line.startsWith('摘要：')) {
        summary = line.replace('摘要：', '').trim();
      } else if (line.startsWith('标签：')) {
        const tagStr = line.replace('标签：', '').trim();
        tags.push(...tagStr.split('#').filter(t => t));
      } else if (line.startsWith('正文：')) {
        currentSection = 'content';
      } else if (currentSection === 'content' && line.trim()) {
        contentLines.push(line);
      }
    }

    content = contentLines.join('\n');

    return { title, summary, content, tags };
  }
}
```

### 完成标准
- [ ] 所有 AI 服务实现完成
- [ ] 评分服务可以正确评分文章
- [ ] 标题优化服务可以生成多个标题
- [ ] 改写服务可以生成高质量改写
- [ ] 所有结果正确保存到数据库
- [ ] 错误处理完善

### 输出
```
<promise>PHASE4_COMPLETE</promise>
```

---

## Phase 5: 每日内容生成流程（最大 20 次迭代）

### 任务清单
文件：`backend/src/services/daily-generator.ts`

```typescript
import cron from 'node-cron';
import { ArticleScorer } from './ai/scorer.service';
import { ContentRewriter } from './ai/rewriter.service';
import { RSSService } from './scraper/rss.service';
import { db } from '../db/connection';

export class DailyGenerator {
  private articleScorer = new ArticleScorer();
  private contentRewriter = new ContentRewriter();
  private rssService = new RSSService();

  // 每天早上 8 点生成内容
  scheduleDailyGeneration() {
    cron.schedule('0 8 * * *', async () => {
      console.log('Starting daily content generation...');
      await this.generateDailyContent();
    });

    console.log('Daily generator scheduled for 8:00 AM');
  }

  async generateDailyContent() {
    try {
      // 1. 先抓取最新内容
      console.log('Step 1: Fetching new articles...');
      await this.rssService.scrapeAllRSS();

      // 2. 评分未评分的文章
      console.log('Step 2: Scoring articles...');
      await this.articleScorer.scorePendingArticles();

      // 3. 获取过去 24 小时最高分的 10 篇文章
      console.log('Step 3: Selecting top articles...');
      const { rows: topArticles } = await db.query(
        `SELECT id, title, content
         FROM raw_articles
         WHERE created_at > NOW() - INTERVAL '24 hours'
           AND status = 'approved'
         ORDER BY quality_score DESC, viral_potential DESC
         LIMIT 10`
      );

      console.log(`Found ${topArticles.length} top articles`);

      // 4. 为每篇文章生成 3 种风格的改写
      console.log('Step 4: Rewriting articles...');
      const styles = ['toutiao', 'zhihu', 'xiaohongshu'];
      let totalRewrites = 0;

      for (const article of topArticles) {
        for (const style of styles) {
          try {
            await this.contentRewriter.rewriteArticle(
              article.id,
              article.title,
              article.content,
              style
            );
            totalRewrites++;
            console.log(`Rewritten article ${article.id} in ${style} style`);
          } catch (error) {
            console.error(`Failed to rewrite ${article.id} in ${style}:`, error);
          }
        }
      }

      console.log(`Daily generation complete: ${totalRewrites} articles created`);

      return {
        success: true,
        articlesProcessed: topArticles.length,
        rewritesCreated: totalRewrites,
      };
    } catch (error) {
      console.error('Daily generation error:', error);
      throw error;
    }
  }

  // 手动触发（用于测试）
  async manualGenerate() {
    return await this.generateDailyContent();
  }
}
```

### 测试脚本
文件：`backend/src/scripts/test-daily-generation.ts`

```typescript
import { DailyGenerator } from '../services/daily-generator';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  const generator = new DailyGenerator();

  console.log('Running manual daily generation test...');
  const result = await generator.manualGenerate();

  console.log('Result:', result);
  process.exit(0);
}

test().catch(console.error);
```

### 完成标准
- [ ] 每日生成流程完整
- [ ] Cron 调度器正确配置
- [ ] 手动触发测试通过
- [ ] 生成 30 篇文章（10 篇 × 3 种风格）
- [ ] 数据正确保存

### 输出
```
<promise>PHASE5_COMPLETE</promise>
```

---

## Phase 6: 简单 Dashboard（最大 25 次迭代）

### 任务清单

#### 6.1 前端 API 集成
文件：`frontend/lib/supabase.ts`

#### 6.2 Dashboard 页面
文件：`frontend/app/page.tsx`

显示：
- 今日生成内容数量
- 平均质量分
- 待审核文章列表
- 快速查看和复制功能

#### 6.3 文章列表组件
文件：`frontend/components/ArticleList.tsx`

- 按质量分排序
- 显示标题、摘要、分数
- 一键复制功能

#### 6.4 文章查看器
文件：`frontend/components/ArticleViewer.tsx`

- 显示完整改写内容
- 标记：✅ 可发布 / ⚠️ 需编辑 / ❌ 删除
- 一键复制到剪贴板

### 完成标准
- [ ] Dashboard 显示基础统计
- [ ] 文章列表加载正常
- [ ] 文章查看器功能完整
- [ ] 一键复制功能正常
- [ ] 响应式设计

### 输出
```
<promise>PHASE6_COMPLETE</promise>
```

---

## Phase 7: 部署和测试（最大 20 次迭代）

### 任务清单

#### 7.1 后端部署
1. 创建 Railway/Render 项目
2. 配置环境变量
3. 部署并验证

#### 7.2 前端部署
1. 部署到 Vercel
2. 配置环境变量
3. 连接到后端

#### 7.3 端到端测试
- [ ] 抓取功能测试
- [ ] AI 评分测试
- [ ] 内容改写测试
- [ ] 每日生成测试
- [ ] Dashboard 功能测试

#### 7.4 生成第一天内容
- [ ] 手动触发每日生成
- [ ] 验证 30 篇文章生成
- [ ] 检查内容质量
- [ ] 优化 Prompt（如果需要）

### 完成标准
- [ ] 后端成功部署
- [ ] 前端成功部署
- [ ] 所有测试通过
- [ ] 第一天的 30 篇内容生成成功
- [ ] README 文档完整

### 输出
```
<promise>PHASE7_COMPLETE</promise>
```

---

## 📋 开发规则

1. **严格遵循迭代限制** - 每个阶段达到最大迭代次数后，必须总结并进入下一阶段
2. **增量开发** - 每完成一个功能立即测试
3. **错误优先** - 遇到错误立即修复，不要跳过
4. **代码质量** - TypeScript 类型完整，必要注释
5. **Git 提交** - 每个 Phase 完成后提交代码

## 🎯 最终目标

24 小时后：
- ✅ 完整的内容生产系统
- ✅ 每天自动生成 30 篇高质量文章
- ✅ Dashboard 管理界面
- ✅ 准备发布到各平台赚取收益

---

**现在开始执行！从 Phase 1 开始。**
