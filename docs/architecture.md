# ContentHub MVP - 系统架构设计

## 🎯 项目概述
**ContentHub** - AI 驱动的内容监控与重构平台（MVP 版本）

### 核心功能（24小时实现）
1. **Monitor Engine** - 信源监控（RSS + Twitter API）
2. **Refactor Brain** - AI 内容重构（3种风格）
3. **Dashboard** - 手动复制改写结果
4. **基础用户系统** - 注册/登录/使用追踪

### 不在 MVP 范围内（后续版本）
- ❌ 自动发布到平台（阶段2）
- ❌ Puppeteer/Playwright（阶段2）
- ❌ BullMQ 任务队列（阶段2）
- ❌ Redis 缓存（阶段2）
- ❌ 收益追踪（阶段3）
- ❌ DALL-E 配图（阶段3）

---

## 🏗️ 技术架构

### 系统分层
```
┌─────────────────────────────────────────┐
│         Frontend (Next.js 14)           │
│  - Dashboard UI                         │
│  - Source Management                    │
│  - Article Viewing                      │
│  - Rewrite Result Display               │
└──────────────┬──────────────────────────┘
               │ REST API
┌──────────────▼──────────────────────────┐
│      Backend API (Fastify + TS)         │
│  - Auth API (Supabase)                  │
│  - Sources API                          │
│  - Articles API                         │
│  - Rewrite API                          │
│  - Monitoring Cron Jobs                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Services Layer                  │
│  - RSS Monitor Service                  │
│  - Twitter Monitor Service              │
│  - AI Rewrite Service (OpenAI)          │
│  - Template Manager                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Data Layer                      │
│  - PostgreSQL (主要数据)                │
│  - OpenAI API (AI 服务)                 │
│  - Twitter API (信源)                   │
└─────────────────────────────────────────┘
```

---

## 📊 数据库 Schema (PostgreSQL)

### 1. Users 表 - 用户
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Supabase Auth 管理
  full_name VARCHAR(100),
  avatar_url TEXT,

  -- 订阅信息
  subscription_tier VARCHAR(20) DEFAULT 'free', -- 'free' | 'pro'
  credits_remaining INTEGER DEFAULT 50, -- 免费用户50次改写

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Supabase Auth 关联
  auth_id UUID UNIQUE REFERENCES auth.users(id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription ON users(subscription_tier);
```

### 2. Sources 表 - 信源配置
```sql
CREATE TYPE source_type AS ENUM ('rss', 'twitter', 'youtube', 'webpage');
CREATE TYPE source_status AS ENUM ('active', 'paused', 'error');

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 信源信息
  name VARCHAR(100) NOT NULL, -- 用户自定义名称
  source_type source_type NOT NULL,
  url TEXT, -- RSS URL 或网页 URL

  -- Twitter 特定字段
  twitter_handle VARCHAR(50), -- @username
  twitter_user_id VARCHAR(50),

  -- 监控配置
  check_interval_minutes INTEGER DEFAULT 60, -- 检查频率
  last_checked_at TIMESTAMPTZ,
  last_found_at TIMESTAMPTZ, -- 最后一次发现新内容

  -- 状态
  status source_status DEFAULT 'active',
  error_message TEXT,

  -- 自动改写配置
  auto_rewrite BOOLEAN DEFAULT false, -- 是否自动改写
  default_templates TEXT[], -- 默认改写模板

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sources_user ON sources(user_id);
CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_sources_status ON sources(status);
```

### 3. Articles 表 - 抓取的文章
```sql
CREATE TYPE article_status AS ENUM ('pending', 'processed', 'failed');

CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,

  -- 原始内容
  title TEXT NOT NULL,
  content TEXT, -- 正文内容
  author VARCHAR(100),
  original_url TEXT UNIQUE NOT NULL, -- 原文链接
  published_at TIMESTAMPTZ,

  -- 元数据
  platform VARCHAR(50), -- 'twitter', 'rss', etc.
  external_id VARCHAR(100), -- Tweet ID, etc.
  image_urls TEXT[], -- 图片链接
  tags TEXT[], -- 提取的标签

  -- 抓取信息
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  status article_status DEFAULT 'pending',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_source ON articles(source_id);
CREATE INDEX idx_articles_original_url ON articles(original_url);
CREATE INDEX idx_articles_published ON articles(published_at DESC);
CREATE INDEX idx_articles_status ON articles(status);
```

### 4. Rewrite Templates 表 - 改写模板
```sql
CREATE TABLE rewrite_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = 系统模板

  -- 模板信息
  name VARCHAR(100) NOT NULL,
  description TEXT,
  style VARCHAR(50) NOT NULL, -- 'toutiao', 'wechat', 'xiaohongshu', 'custom'

  -- AI Prompt 配置
  system_prompt TEXT NOT NULL, -- 系统提示词
  output_format JSONB, -- 输出格式要求

  -- 配置
  is_public BOOLEAN DEFAULT false, -- 是否公开模板
  is_system BOOLEAN DEFAULT false, -- 是否系统内置模板

  -- 使用统计
  usage_count INTEGER DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_user ON rewrite_templates(user_id);
CREATE INDEX idx_templates_style ON rewrite_templates(style);
CREATE INDEX idx_templates_public ON rewrite_templates(is_public) WHERE is_public = true;
```

### 5. Rewrites 表 - AI 改写记录
```sql
CREATE TYPE rewrite_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE rewrites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES rewrite_templates(id),

  -- 改写结果
  rewritten_title TEXT,
  rewritten_content TEXT NOT NULL,

  -- AI 配置
  model_used VARCHAR(50) DEFAULT 'gpt-4o-mini',
  tokens_used INTEGER,

  -- 评价
  status rewrite_status DEFAULT 'completed',
  error_message TEXT,

  -- 用户反馈
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rewrites_user ON rewrites(user_id);
CREATE INDEX idx_rewrites_article ON rewrites(article_id);
CREATE INDEX idx_rewrites_template ON rewrites(template_id);
CREATE INDEX idx_rewrites_created ON rewrites(created_at DESC);
```

### 6. Usage Logs 表 - 使用记录（计费）
```sql
CREATE TYPE usage_type AS ENUM ('rewrite', 'monitor', 'api_call');

CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- 使用信息
  usage_type usage_type NOT NULL,
  credits_used INTEGER DEFAULT 1, -- 消耗的 credits

  -- 关联信息
  resource_type VARCHAR(50), -- 'rewrite', 'article', etc.
  resource_id UUID,

  -- 元数据
  metadata JSONB, -- 额外信息

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_user ON usage_logs(user_id);
CREATE INDEX idx_usage_created ON usage_logs(created_at DESC);
```

---

## 🔌 API 端点设计

### Auth API
```
POST   /api/auth/register     - 注册
POST   /api/auth/login        - 登录
POST   /api/auth/logout       - 登出
GET    /api/auth/me           - 获取当前用户信息
```

### Sources API
```
GET    /api/sources           - 获取所有信源
POST   /api/sources           - 创建信源
GET    /api/sources/:id       - 获取单个信源
PUT    /api/sources/:id       - 更新信源
DELETE /api/sources/:id       - 删除信源
POST   /api/sources/:id/test  - 测试信源连接
```

### Articles API
```
GET    /api/articles          - 获取文章列表
GET    /api/articles/:id      - 获取单篇文章
POST   /api/articles/:id/rewrite - 改写文章
GET    /api/articles/:id/rewrites - 获取文章的所有改写版本
```

### Rewrites API
```
GET    /api/rewrites          - 获取改写记录
GET    /api/rewrites/:id      - 获取单条改写
POST   /api/rewrites/:id/rate - 评价改写质量
```

### Templates API
```
GET    /api/templates         - 获取模板列表（系统+自定义）
POST   /api/templates         - 创建自定义模板
GET    /api/templates/:id     - 获取模板详情
PUT    /api/templates/:id     - 更新模板
DELETE /api/templates/:id     - 删除模板
```

---

## 🤖 AI 改写模板设计

### 3 种内置风格

#### 1. Toutiao Style (今日头条风)
```
角色：专业自媒体编辑
目标：吸引点击、SEO优化、正能量/热点导向

要求：
- 标题：30字内，包含热点关键词，使用数字、疑问句
- 正文：
  * 开头：用热点、数据、痛点吸引
  * 中间：3-5段，每段有小标题
  * 结尾：引导互动（评论、转发）
- 语气：专业但不失亲和力
- 标签：3-5个相关话题标签
```

#### 2. WeChat Official Account (公众号深度风)
```
角色：深度内容创作者
目标：建立信任、提供价值、引导关注

要求：
- 标题：有深度、有观点，20-40字
- 正文：
  * 开头：故事或观点引入
  * 中间：深度分析、案例、数据
  * 结尾：总结 + 引导关注
- 格式：分段清晰，适当加粗重点
- 语气：专业、有观点、有温度
```

#### 3. Xiaohongshu Style (小红书风)
```
角色：生活方式博主
目标：种草、分享、引发共鸣

要求：
- 标题：emoji + 短标题 + 吸引点
- 正文：
  * 开头：emoji + 话题引入
  * 中间：分段 + emoji + 个人体验
  * 结尾：话题标签 + 引导互动
- 格式：大量 emoji、短段落、空行
- 语气：亲切、有代入感、分享感
- 标签：#话题1 #话题2
```

---

## 📁 项目目录结构

```
content-hub-mvp/
├── backend/
│   ├── src/
│   │   ├── api/              # API 路由
│   │   │   ├── auth/
│   │   │   ├── sources/
│   │   │   ├── articles/
│   │   │   ├── rewrites/
│   │   │   └── templates/
│   │   ├── services/         # 业务逻辑
│   │   │   ├── monitor/      # 监控服务
│   │   │   │   ├── rss.service.ts
│   │   │   │   └── twitter.service.ts
│   │   │   ├── ai/           # AI 服务
│   │   │   │   └── openai.service.ts
│   │   │   └── template/     # 模板管理
│   │   ├── models/           # 数据模型
│   │   ├── db/               # 数据库连接
│   │   ├── utils/            # 工具函数
│   │   └── index.ts          # 入口
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # Dashboard
│   │   ├── sources/
│   │   ├── articles/
│   │   └── layout.tsx
│   ├── components/           # React 组件
│   │   ├── ui/               # shadcn/ui
│   │   ├── SourceCard.tsx
│   │   ├── ArticleCard.tsx
│   │   └── RewriteViewer.tsx
│   └── package.json
├── docs/
│   └── architecture.md       # 本文档
├── .env.example              # 环境变量模板
└── README.md
```

---

## 🚀 部署架构（MVP）

```
Frontend (Next.js)  →  Vercel
Backend (Fastify)   →  Railway/Render
Database (PostgreSQL) → Supabase
```

---

## 📈 扩展路线图

### Phase 2 (1周)
- ✅ BullMQ + Redis 任务队列
- ✅ 今日头条自动发布（API）
- ✅ Puppeteer 集成
- ✅ 多账号管理

### Phase 3 (2周)
- ✅ 微信公众号发布
- ✅ 知乎自动发布
- ✅ 收益追踪 Dashboard
- ✅ DALL-E 自动配图

### Phase 4 (1个月)
- ✅ 反爬对抗策略
- ✅ 分布式爬虫
- ✅ A/B 测试标题
- ✅ 数据分析优化
