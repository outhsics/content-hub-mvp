# ContentHub MVP - 个人版架构设计

## 🎯 项目目标（调整后）
**24 小时内构建一个 AI 驱动的个人内容生产系统，每天自动生成 10 篇高质量文章，用于多平台发布赚取收益**

### 核心需求
1. ✅ **自动监控** - 优质信源自动抓取
2. ✅ **智能改写** - AI 重写成原创内容（3种风格）
3. ✅ **质量筛选** - 自动评分和排序
4. ✅ **批量导出** - 每天生成 10 篇，手动发布到各平台
5. ✅ **内容优化** - 标题优化、关键词提取

---

## 🏗️ 简化技术栈（个人版）

```
Frontend: Next.js 14 (简单的管理界面)
Backend: Fastify + TypeScript
Database: PostgreSQL (Supabase)
AI: OpenAI gpt-4o-mini + gpt-4o (标题优化)
Cron: node-cron (本地定时任务)
Deployment: 本地运行或 Railway
```

### 不需要的功能（节省时间）
- ❌ 多用户系统（只有你 1 个用户）
- ❌ 复杂的权限管理
- ❌ Stripe 支付集成
- ❌ Redis 缓存
- ❌ BullMQ（先用简单队列）
- ❌ Puppeteer（阶段 2）

---

## 📊 简化数据库 Schema

### 1. Sources 表（信源）
```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  source_type VARCHAR(20) NOT NULL, -- 'rss', 'twitter'
  url TEXT,
  twitter_handle VARCHAR(50),

  -- 质量控制
  priority INTEGER DEFAULT 5, -- 1-10，优先级
  quality_score DECIMAL(3,2), -- 该信源的平均质量分

  -- 监控配置
  is_active BOOLEAN DEFAULT true,
  check_interval_hours INTEGER DEFAULT 1, -- 检查频率
  last_checked_at TIMESTAMPTZ,
  last_found_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 预设 10 个高质量信源
INSERT INTO sources (name, source_type, url, priority) VALUES
('TechCrunch RSS', 'rss', 'https://techcrunch.com/feed/', 9),
('Hacker News', 'rss', 'https://news.ycombinator.com/rss', 8),
('IndieHackers', 'rss', 'https://www.indiehackers.com/latest.rss', 8),
-- ... 更多
```

### 2. Raw Articles 表（原始文章）
```sql
CREATE TYPE article_status AS ENUM ('pending', 'approved', 'rejected', 'rewritten');

CREATE TABLE raw_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id),

  -- 原始内容
  title TEXT NOT NULL,
  content TEXT,
  original_url TEXT UNIQUE NOT NULL,
  author VARCHAR(100),
  published_at TIMESTAMPTZ,

  -- AI 评分（关键！）
  quality_score DECIMAL(3,2), -- 0-1，AI 评分
  viral_potential DECIMAL(3,2), -- 爆款潜力
  engagement_prediction DECIMAL(3,2), -- 预测互动率

  -- 标签和关键词
  tags TEXT[],
  keywords TEXT[], -- SEO 关键词
  category VARCHAR(50),

  -- 状态
  status article_status DEFAULT 'pending',

  -- 时间戳
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_raw_articles_score ON raw_articles(quality_score DESC);
CREATE INDEX idx_raw_articles_viral ON raw_articles(viral_potential DESC);
CREATE INDEX idx_raw_articles_status ON raw_articles(status);
```

### 3. Rewrite Templates 表（改写模板）
```sql
CREATE TABLE rewrite_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  style VARCHAR(50) NOT NULL, -- 'toutiao', 'wechat', 'zhihu', 'xiaohongshu'

  -- AI Prompt
  system_prompt TEXT NOT NULL,
  prompt_template TEXT NOT NULL,

  -- 输出格式
  output_length INTEGER, -- 目标字数
  tone VARCHAR(50), -- 语气

  -- 性能统计
  usage_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 预设模板
INSERT INTO rewrite_templates (name, style, system_prompt) VALUES
('今日头条爆款', 'toutiao', '...'),
('知乎深度回答', 'zhihu', '...'),
('小红书种草', 'xiaohongshu', '...'),
('百家号资讯', 'baijiahao', '...');
```

### 4. Published Articles 表（改写后的文章）
```sql
CREATE TABLE published_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_article_id UUID REFERENCES raw_articles(id),
  template_id UUID REFERENCES rewrite_templates(id),

  -- 改写内容
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT, -- AI 生成的摘要

  -- SEO 优化
  seo_title TEXT, -- SEO 优化后的标题
  meta_description TEXT,
  keywords TEXT[],

  -- 平台发布
  target_platforms VARCHAR(50)[], -- ['toutiao', 'zhihu', 'weixin']
  published_urls JSONB, -- {'toutiao': 'url1', 'zhihu': 'url2'}

  -- 效果追踪
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,

  -- 收益计算
  estimated_revenue DECIMAL(10,2), -- 预估收益
  actual_revenue DECIMAL(10,2), -- 实际收益

  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_published_created ON published_articles(created_at DESC);
CREATE INDEX idx_published_revenue ON published_articles(estimated_revenue DESC);
```

---

## 🤖 AI 改写策略（核心）

### 阶段 1: 质量评分（Article Scorer）
```typescript
// 每抓取一篇文章，立即评分
const scorePrompt = `
你是一个内容质量评估专家。请给这篇文章打分（0-1）：

标题：${title}
内容：${content}

评分维度：
1. 原创性 (0-1)
2. 实用性 (0-1)
3. 时效性 (0-1)
4. 爆款潜力 (0-1) - 标题是否吸引、是否有争议性
5. 受众广度 (0-1) - 大众关心还是小众

输出 JSON：
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
```

### 阶段 2: 标题优化（Title Optimizer）
```typescript
// 改写前，先生成 10 个爆款标题
const titlePrompt = `
基于原文，生成 10 个高点击率标题：

原标题：${originalTitle}
核心内容：${summary}

目标平台：${platform}

要求：
1. 30 字以内
2. 包含数字或疑问句
3. 制造好奇心或紧迫感
4. 正能量或痛点切入
5. 符合平台调性

输出 JSON 数组：
[
  {"title": "...", "predicted_ctr": 0.15},
  {"title": "...", "predicted_ctr": 0.12},
  ...
]
`;
```

### 阶段 3: 内容改写（Content Rewriter）
```typescript
// 使用选定的标题和风格改写
const rewritePrompt = `
你是 ${platform} 的爆款内容创作者。

原文标题：${originalTitle}
原文内容：${originalContent}

目标标题：${optimizedTitle} // 使用优化后的标题
目标风格：${style}
目标字数：${targetLength}

改写要求：
1. ${styleSpecificRequirements}
2. 保持核心观点，但完全重新表达
3. 添加个人见解和分析
4. 举例说明（如果适用）
5. 结尾引导互动

输出格式：
标题：${optimizedTitle}

摘要：[100字摘要]

正文：
[改写后的内容]

标签：#标签1 #标签2 #标签3
`;
```

---

## 🔄 每日工作流程

### 自动化流程（每小时运行）
```typescript
// 1. 抓取新内容
async function fetchNewArticles() {
  const sources = await getActiveSources();
  for (const source of sources) {
    const articles = await scrapeSource(source);
    for (const article of articles) {
      // 2. 立即评分
      const score = await scoreArticle(article);
      if (score.overall_score > 0.7) { // 只保留高质量
        await saveArticle({ ...article, ...score });
      }
    }
  }
}

// 2. 每天早上 8 点：生成当天内容
async function generateDailyContent() {
  // 获取过去 24 小时最高分的 10 篇文章
  const topArticles = await getTopArticles(10, 24);

  for (const article of topArticles) {
    // 生成优化标题
    const titles = await generateTitles(article, 'toutiao');
    const bestTitle = titles[0];

    // 改写成多种风格
    const styles = ['toutiao', 'zhihu', 'xiaohongshu'];
    for (const style of styles) {
      const rewritten = await rewriteArticle(article, bestTitle, style);
      await savePublishedArticle(rewritten);
    }
  }

  // 发送通知：今日内容已生成
  await sendNotification('今日 10 篇内容已就绪！');
}
```

### 人工审核流程
```
1. 每天 9 点登录 Dashboard
2. 查看"今日内容"列表（30 篇：10 篇 × 3 种风格）
3. 快速浏览，标记：
   - ✅ 立即可发布
   - ⚠️ 需要微调（手动编辑）
   - ❌ 质量不行（删除）
4. 一键复制到各平台发布
```

---

## 📁 简化项目结构

```
content-hub-personal/
├── backend/
│   ├── src/
│   │   ├── api/               # API（只用于前端管理）
│   │   │   └── admin.ts       # 单个管理接口
│   │   ├── services/
│   │   │   ├── scraper/       # RSS/Twitter 抓取
│   │   │   │   ├── rss.service.ts
│   │   │   │   └── twitter.service.ts
│   │   │   ├── ai/            # AI 服务
│   │   │   │   ├── scorer.service.ts       # 评分
│   │   │   │   ├── title-optimizer.service.ts
│   │   │   │   └── rewriter.service.ts
│   │   │   └── cron/          # 定时任务
│   │   │       └── scheduler.ts
│   │   ├── models/            # 数据模型
│   │   ├── db/                # 数据库
│   │   └── index.ts
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Dashboard
│   │   ├── articles/          # 文章管理
│   │   └── settings/          # 信源配置
│   └── components/
│       ├── ArticleList.tsx
│       ├── ArticleViewer.tsx
│       └── StatsCard.tsx
└── scripts/
    └── daily-generator.ts     # 每日内容生成脚本
```

---

## 🎯 24 小时开发计划（调整后）

### Phase 1: 项目初始化（2h）
- ✅ Next.js + Fastify 项目
- ✅ Supabase PostgreSQL 设置
- ✅ 基础数据库表（简化版）
- ✅ OpenAI API 配置

### Phase 2: 核心抓取（4h）
- ✅ RSS 抓取服务
- ✅ Twitter API 集成
- ✅ 数据存储逻辑
- ✅ 基础测试

### Phase 3: AI 评分 + 改写（8h）
- ✅ Article Scorer（质量评分）
- ✅ Title Optimizer（标题优化）
- ✅ Content Rewriter（3种风格）
- ✅ Prompt 工程和调优

### Phase 4: 定时任务（3h）
- ✅ node-cron 调度器
- ✅ 每日内容生成流程
- ✅ 错误处理和重试

### Phase 5: 简单 Dashboard（5h）
- ✅ 文章列表（按评分排序）
- ✅ 改写结果查看器
- ✅ 一键复制功能
- ✅ 基础统计（今日生成、平均分）

### Phase 6: 测试 + 部署（2h）
- ✅ 端到端测试
- ✅ 部署到 Railway/Render
- ✅ 配置 cron 任务
- ✅ 生成第一天的内容

---

## 💰 收益策略（24小时后）

### Week 1: 测试和优化
- 每天 10 篇 × 3 个平台 = 30 篇
- 测试不同平台的表现
- 优化标题和内容

### Week 2-4: 规模化
- 根据数据调整信源优先级
- 保留高收益模板，丢弃低效模板
- 目标：每天 50-100 元收益

### Month 2: 扩展
- 添加更多平台（百家号、知乎）
- 增加信源数量（20+）
- 优化 AI Prompt（提升原创度）

---

## 📋 高质量信源推荐（预设）

### 科技类
- TechCrunch RSS
- Hacker News
- The Verge
- Ars Technica

### 创业/商业
- IndieHackers
- Harvard Business Review
- Forbes Entrepreneurs

### 个人成长
- Medium (Topics: Productivity, Self-improvement)
- Psychology Today

### 趋势/热点
- Google Trends (RSS)
- Reddit (热门 r/technology, r/programming)

每个信源都配置优先级和质量阈值。
