# ContentHub MVP - 部署指南

## 📋 部署前准备

### 1. 所需服务账号

- ✅ **Supabase** - 数据库（免费计划足够）
- ✅ **OpenAI** - AI API（需要充值余额）
- ⭐ **Railway/Render** - 后端部署（可选，也可本地运行）
- ⭐ **Vercel** - 前端部署（可选，也可本地运行）

### 2. 环境变量清单

创建一个 `checklist.md` 确保所有凭证就绪：

```markdown
## 部署检查清单

### Supabase
- [ ] Project URL
- [ ] Anon Key
- [ ] Service Role Key
- [ ] Database Password

### OpenAI
- [ ] API Key (sk-...)
- [ ] 预估成本：每天 30 篇 ≈ $0.30-0.90/天

### 部署平台
- [ ] Railway/API Token (如需部署)
- [ ] Vercel Token (如需部署)
```

---

## 🚀 部署方案 A：本地运行（推荐用于测试）

### 优点
- 完全免费（除 OpenAI API）
- 完全控制
- 易于调试

### 步骤

#### 1. 设置数据库

```bash
# 访问 https://supabase.com 创建项目
# 在 SQL Editor 中运行：
cd ~/content-hub-mvp/backend/db
cat schema.sql | pbcopy  # 复制到剪贴板
# 粘贴到 Supabase SQL Editor 并运行

# 然后运行：
cat seed.sql | pbcopy
# 同样粘贴并运行
```

#### 2. 配置后端

```bash
cd ~/content-hub-mvp/backend

# 创建 .env 文件
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-key
PORT=3001
NODE_ENV=development
EOF

# 安装依赖
npm install

# 测试连接
npm test
```

#### 3. 配置前端

```bash
cd ~/content-hub-mvp/frontend

# 创建 .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EOF

# 安装依赖
npm install
```

#### 4. 启动服务

**终端 1 - 启动后端:**
```bash
cd ~/content-hub-mvp/backend
npm run dev
```

**终端 2 - 启动前端:**
```bash
cd ~/content-hub-mvp/frontend
npm run dev
```

**终端 3 - 手动触发测试:**
```bash
cd ~/content-hub-mvp/backend
npm run test:daily
```

#### 5. 访问 Dashboard

打开浏览器访问：http://localhost:3000

#### 6. 设置自动化（可选）

使用 **PM2** 让后端在后台持续运行：

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd ~/content-hub-mvp/backend
pm2 start "npm run dev" --name content-hub-backend

# 查看日志
pm2 logs content-hub-backend

# 设置开机自启
pm2 startup
pm2 save
```

---

## 🌐 部署方案 B：云端部署（推荐用于生产）

### 后端部署到 Railway

#### 1. 准备代码

```bash
cd ~/content-hub-mvp

# 创建 .gitignore 排除不必要的文件
echo "node_modules/" >> .gitignore
echo ".env" >> .gitignore
echo "dist/" >> .gitignore

# 提交到 GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. 部署到 Railway

1. 访问 [https://railway.app](https://railway.app)
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库
4. 配置环境变量（从 backend/.env 复制）
5. 设置 Root Directory: `backend`
6. 设置 Start Command: `npm run build && npm start`
7. 点击 "Deploy"

#### 3. 获取后端 URL

部署完成后，Railway 会提供一个 URL，如：
```
https://content-hub-backend.up.railway.app
```

### 前端部署到 Vercel

#### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 部署

```bash
cd ~/content-hub-mvp/frontend

# 登录 Vercel
vercel login

# 部署
vercel
```

按照提示操作：
- 项目名称：`content-hub-mvp`
- 构建命令：`npm run build`
- 输出目录：`.next`
- 环境变量：从 `frontend/.env.local` 添加

#### 3. 完成部署

部署成功后，Vercel 会提供一个 URL，如：
```
https://content-hub-mvp.vercel.app
```

---

## 🧪 部署后测试

### 1. 测试后端

```bash
# 测试数据库连接
curl https://your-backend-url/test

# 触发每日生成
curl https://your-backend-url/api/generate
```

### 2. 测试前端

访问部署的 URL，检查：
- Dashboard 是否正常加载
- 文章列表是否显示
- 复制功能是否工作

### 3. 测试 Cron 任务

检查 Railway Logs 或 PM2 Logs，确认：
- RSS 抓取器每小时运行
- 每日生成器在 8:00 AM 运行

---

## 📊 监控和维护

### 查看日志

**本地 (PM2):**
```bash
pm2 logs content-hub-backend
```

**Railway:**
- 在 Railway Dashboard 点击项目
- 查看 "Deployments" → "Logs"

**Supabase:**
- Table Editor 查看数据
- SQL Editor 运行查询

### 性能监控

#### 1. 数据库大小
```sql
-- 在 Supabase SQL Editor 运行
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 2. 文章统计
```sql
-- 查看今天的文章数
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as today
FROM published_articles;
```

#### 3. AI 成本
```bash
# 在 OpenAI Dashboard 查看
# https://platform.openai.com/usage
```

### 定期维护

**每周:**
- [ ] 检查文章质量
- [ ] 删除低质量文章
- [ ] 查看各平台表现数据

**每月:**
- [ ] 调整信源优先级
- [ ] 优化 AI Prompt
- [ ] 检查 AI 成本
- [ ] 备份数据库

---

## 🔧 故障排查

### 问题 1: RSS 抓取失败

**症状**: 没有新文章被抓取

**解决方案**:
```bash
# 测试单个信源
cd backend
npm run test:scraper

# 检查网络连接
curl https://techcrunch.com/feed/

# 检查日志
pm2 logs content-hub-backend
```

### 问题 2: AI 评分很慢

**症状**: 评分文章需要很长时间

**解决方案**:
- 使用 gpt-4o-mini（更快）
- 减少并发请求数
- 检查 OpenAI API 限额

### 问题 3: Dashboard 无数据

**症状**: 前端显示"暂无文章"

**解决方案**:
```bash
# 1. 检查 Supabase 连接
cd frontend
npm run dev
# 打开浏览器控制台查看错误

# 2. 检查 RLS 策略
# 在 Supabase SQL Editor 运行：
ALTER TABLE published_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON published_articles;
CREATE POLICY "Enable read access for all users" ON published_articles
  FOR SELECT USING (true);
```

### 问题 4: Cron 任务不运行

**症状**: 每天没有自动生成内容

**解决方案**:
```bash
# 手动触发测试
cd backend
npm run test:daily

# 检查系统时区
date

# 检查 PM2 进程
pm2 list

# 重启后端
pm2 restart content-hub-backend
```

---

## 🎯 下一步优化

### 性能优化
1. **添加 Redis 缓存**
   - 缓存评分结果
   - 缓存改写模板

2. **优化 AI 调用**
   - 批量评分
   - 使用流式 API

3. **数据库优化**
   - 添加更多索引
   - 定期归档旧数据

### 功能增强
1. **自动发布** (Phase 2)
   - 今日头条 API
   - Puppeteer 自动化

2. **收益追踪** (Phase 3)
   - 各平台收益统计
   - ROI 计算器

3. **A/B 测试**
   - 标题变体测试
   - 自动选择最佳版本

---

## 💡 最佳实践

1. **内容质量优先**
   - 定期检查生成质量
   - 手动编辑优化
   - 删除低质量文章

2. **平台规则遵守**
   - 避免频繁发布
   - 确保内容原创
   - 尊重社区规范

3. **成本控制**
   - 设置 OpenAI 预算上限
   - 定期检查使用量
   - 优化 Prompt 减少 token 消耗

4. **数据驱动**
   - 记录每篇文章的表现
   - 分析什么类型的内容表现好
   - 持续优化策略

---

## 📞 获取帮助

- **GitHub Issues**: [项目仓库]
- **文档**: 查看项目 README.md
- **日志**: 检查 PM2/Railway 日志

---

**祝你部署顺利，早日实现被动收入！** 🚀💰
