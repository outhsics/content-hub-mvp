# 🚀 快速配置指南 - ContentHub MVP

## 步骤 1: 配置 Backend 环境变量

编辑文件：`~/content-hub-mvp/backend/.env`

```bash
cd ~/content-hub-mvp/backend
nano .env
# 或者用你喜欢的编辑器
```

### 1.1 配置 Supabase

```env
DATABASE_URL=postgresql://postgres:[你的密码]@db.[项目ID].supabase.co:5432/postgres
SUPABASE_URL=https://[项目ID].supabase.co
SUPABASE_ANON_KEY=你的anon-key
SUPABASE_SERVICE_KEY=你的service-key
```

**如何获取这些信息：**
1. 访问 https://supabase.com/dashboard
2. 选择你的项目
3. 点击左侧 "Settings" → "API"
4. 复制以下内容：
   - Project URL
   - anon public key
   - service_role key（仅在 backend 使用）
5. 点击左侧 "Settings" → "Database"
6. 复制 "Connection string" 中的密码部分

### 1.2 配置 AI Provider（选择一个）

#### 选项 A: OpenRouter（推荐）

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
```

#### 选项 B: GLM（智谱 AI）

```env
AI_PROVIDER=glm
GLM_API_KEY=你的GLM密钥
```

#### 选项 C: OpenAI

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### 1.3 其他配置

```env
JWT_SECRET=随机字符串-建议32位以上
FRONTEND_URL=http://localhost:3000
PORT=3001
NODE_ENV=development
```

---

## 步骤 2: 配置 Frontend 环境变量

编辑文件：`~/content-hub-mvp/frontend/.env.local`

```bash
cd ~/content-hub-mvp/frontend
nano .env.local
```

填入 Supabase 信息（与 backend 相同）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://[项目ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon-key
```

---

## 步骤 3: 初始化数据库

### 3.1 创建数据库表

1. 访问 https://supabase.com/dashboard
2. 选择你的项目
3. 点击左侧 "SQL Editor"
4. 点击 "New query"
5. 复制 `backend/db/schema.sql` 的内容
6. 粘贴并点击 "Run" ▶️

### 3.2 导入初始数据

1. 在 SQL Editor 中，点击 "New query"
2. 复制 `backend/db/seed.sql` 的内容
3. 粘贴并点击 "Run" ▶️

---

## 步骤 4: 安装依赖

```bash
# Backend
cd ~/content-hub-mvp/backend
npm install

# Frontend
cd ~/content-hub-mvp/frontend
npm install
```

---

## 步骤 5: 测试数据库连接

```bash
cd ~/content-hub-mvp/backend
npm test
```

你应该看到：
```
✅ Database connected successfully
✅ All database tests passed!
```

---

## 步骤 6: 启动服务

### 方式 A: 开发模式（推荐用于测试）

**终端 1 - 启动 Backend:**
```bash
cd ~/content-hub-mvp/backend
npm run dev
```

**终端 2 - 启动 Frontend:**
```bash
cd ~/content-hub-mvp/frontend
npm run dev
```

**终端 3 - 手动触发测试:**
```bash
cd ~/content-hub-mvp/backend
npm run test:daily
```

### 方式 B: 生产模式（使用 PM2）

```bash
# 安装 PM2
npm install -g pm2

# 启动 Backend
cd ~/content-hub-mvp/backend
pm2 start "npm run dev" --name content-hub-backend

# 查看日志
pm2 logs content-hub-backend
```

---

## 步骤 7: 访问 Dashboard

打开浏览器访问：http://localhost:3000

---

## 🎯 快速测试命令

```bash
# 1. 测试数据库
cd ~/content-hub-mvp/backend
npm test

# 2. 测试 RSS 抓取
npm run test:scraper

# 3. 测试 AI 评分
npm run test:ai:score

# 4. 测试每日生成（完整流程）
npm run test:daily
```

---

## ❓ 遇到问题？

### 数据库连接失败
- 检查 `DATABASE_URL` 是否正确
- 确认 Supabase 项目是否正常运行
- 检查密码是否正确

### AI API 调用失败
- 检查 API Key 是否正确
- 确认 `AI_PROVIDER` 设置正确
- 检查账户余额（OpenRouter/GLM）

### Frontend 无法加载数据
- 确认 Supabase URL 和 Key 正确
- 检查 Backend 是否正在运行
- 查看浏览器控制台错误信息

---

## 📝 下一步

配置完成后：
1. 运行 `npm run test:daily` 生成第一天的内容
2. 访问 http://localhost:3000 查看结果
3. 开始发布到各平台赚取收益！
