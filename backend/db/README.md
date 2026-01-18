# 数据库设置指南 - ContentHub MVP

## 🚀 快速开始（5分钟）

### 步骤 1: 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 "Start your project"
3. 使用 GitHub 账号登录
4. 创建新项目：
   - **Name**: content-hub-mvp
   - **Database Password**: 设置一个强密码（记住它！）
   - **Region**: 选择离你最近的区域
   - **Pricing Plan**: 选择 Free（足够 MVP 使用）

### 步骤 2: 获取数据库凭证

1. 在项目仪表板，点击 **Settings** → **Database**
2. 复制以下信息：
   - **Connection string**（包含 DATABASE_URL）
   - **Project URL**（SUPABASE_URL）
   - **anon public** key（SUPABASE_ANON_KEY）

### 步骤 3: 执行 Schema

#### 方法 A: 使用 Supabase SQL Editor（推荐）

1. 在 Supabase 项目中，点击 **SQL Editor**
2. 点击 "New query"
3. 复制 `backend/db/schema.sql` 的全部内容
4. 粘贴到编辑器
5. 点击 "Run" ▶️
6. 等待执行完成（应该看到 "Success"）

#### 方法 B: 使用 psql 命令行

```bash
# 从项目设置中获取连接字符串
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f backend/db/schema.sql
```

### 步骤 4: 导入初始数据

1. 仍在 SQL Editor 中，点击 "New query"
2. 复制 `backend/db/seed.sql` 的全部内容
3. 粘贴并点击 "Run"
4. 应该看到 4 个模板和 13 个信源插入成功

### 步骤 5: 配置环境变量

1. 复制 `.env.example` 到 `.env`:
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入你的凭证：
   ```env
   # 使用 Supabase 的连接字符串格式
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

   SUPABASE_URL=https://[PROJECT-REF].supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_KEY=your-service-role-key-here

   # OpenAI API Key（从 https://platform.openai.com/api-keys）
   OPENAI_API_KEY=sk-your-key-here
   ```

### 步骤 6: 测试连接

```bash
cd backend
npm install
npm run test
```

你应该看到：
```
✅ Database connected successfully
Test 1: Testing connection...
✅ Connection successful! ...
✅ All database tests passed!
```

---

## 📋 数据库结构概览

### 核心表

1. **sources** - 信源配置（RSS、Twitter）
   - 预置 13 个高质量 RSS 信源
   - 优先级 1-10，质量评分

2. **raw_articles** - 抓取的原始文章
   - 自动评分：quality_score, viral_potential
   - 状态流转：pending → approved → rewritten

3. **rewrite_templates** - AI 改写模板
   - 4 种内置风格：头条、知乎、小红书、百家号
   - 可自定义

4. **published_articles** - 改写后的文章
   - 多平台发布追踪
   - 收益统计

---

## 🔧 常见问题

### Q: 忘记数据库密码怎么办？
A: 在 Supabase 项目设置中，可以重置数据库密码。

### Q: 如何查看数据库内容？
A: 使用 Supabase 的 **Table Editor**，可以直接查看和编辑数据。

### Q: 需要备份吗？
A: Supabase 免费计划自动备份。也可以手动导出：
- Table Editor → 选择表 → Export

### Q: 如何重置数据库？
A: 在 SQL Editor 中运行：
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```
然后重新执行 schema.sql 和 seed.sql。

---

## 🎯 下一步

数据库设置完成后，继续：
- ✅ Phase 3: 构建抓取服务
- ✅ Phase 4: AI 评分和改写引擎
- ✅ Phase 5: 每日内容生成流程

准备好后，运行：
```bash
npm run dev
```
