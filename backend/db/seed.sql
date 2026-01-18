-- ContentHub MVP - Initial Seed Data
-- This file populates the database with high-quality sources and templates

-- ============================================
-- HIGH-QUALITY RSS SOURCES
-- ============================================
INSERT INTO sources (name, source_type, url, priority, is_active) VALUES
-- Tech & Startup
('TechCrunch', 'rss', 'https://techcrunch.com/feed/', 9, true),
('Hacker News', 'rss', 'https://news.ycombinator.com/rss', 8, true),
('IndieHackers', 'rss', 'https://www.indiehackers.com/latest.rss', 8, true),
('The Verge', 'rss', 'https://www.theverge.com/rss/index.xml', 8, true),
('Ars Technica', 'rss', 'https://feeds.arstechnica.com/arstechnica/index', 8, true),

-- Business & Entrepreneurship
('Harvard Business Review', 'rss', 'https://hbr.org/feed', 9, true),
('Forbes Entrepreneurs', 'rss', 'https://www.forbes.com/entrepreneurs/feed/', 7, true),
('Entrepreneur', 'rss', 'https://www.entrepreneur.com/latest.rss', 7, true),

-- Personal Development
('Medium Productivity', 'rss', 'https://medium.com/feed/tag/productivity', 7, true),
('Psychology Today', 'rss', 'https://www.psychologytoday.com/us/blog/rss', 7, true),
('Mark Manson', 'rss', 'https://markmanson.net/feed', 8, true),

-- AI & Tech Trends
('MIT Technology Review', 'rss', 'https://www.technologyreview.com/feed/', 9, true),
('Wired', 'rss', 'https://www.wired.com/feed/rss', 8, true),
('AI News', 'rss', 'https://artificialintelligence-news.com/feed/', 7, true)

ON CONFLICT DO NOTHING;

-- ============================================
-- REWRITE TEMPLATES
-- ============================================

-- Toutiao Style (今日头条爆款)
INSERT INTO rewrite_templates (name, style, system_prompt, prompt_template, output_length, tone) VALUES
('今日头条爆款', 'toutiao',
'你是今日头条的爆款内容创作者。你的文章总是能获得高阅读量和互动率。
核心原则：
1. 标题要吸引点击：30字内，包含热点关键词，使用数字、疑问句
2. 开头要抓眼球：用热点/数据/痛点立即吸引读者
3. 结构要清晰：3-5段，每段有小标题
4. 结尾要引导：鼓励评论、转发、点赞
5. 语气要专业但不失亲和力',
'将以下内容改写成今日头条爆款风格：
原标题：{original_title}
原文内容：{original_content}

目标标题：{target_title}

改写要求：
1. 保持核心观点，但完全重新表达
2. 添加个人见解和分析
3. 举例说明（如果适用）
4. 确保原创性
5. 目标字数：1200-2000字',
1500, '专业但不失亲和力'),

-- Zhihu Style (知乎深度)
INSERT INTO rewrite_templates (name, style, system_prompt, prompt_template, output_length, tone) VALUES
('知乎深度回答', 'zhihu',
'你是知乎的优质答主，以深度思考和独到见解著称。
核心原则：
1. 标题有深度：20-40字，体现观点和思考
2. 开头引入：用故事、观点或问题引入主题
3. 深度分析：提供多角度分析，数据和案例支撑
4. 结构清晰：逻辑严密，层次分明
5. 结尾升华：总结观点，引发思考',
'将以下内容改写成知乎深度回答风格：
原标题：{original_title}
原文内容：{original_content}

目标标题：{target_title}

改写要求：
1. 深入分析，不仅要描述现象，要解释本质
2. 提供独特见解
3. 用数据和案例支撑观点
4. 保持专业性和可读性的平衡
5. 目标字数：1500-2500字',
2000, '专业、有观点、有温度'),

-- Xiaohongshu Style (小红书种草)
INSERT INTO rewrite_templates (name, style, system_prompt, prompt_template, output_length, tone) VALUES
('小红书种草', 'xiaohongshu',
'你是小红书的生活方式博主，擅长分享真实体验和种草推荐。
核心原则：
1. 标题吸睛：emoji + 短标题 + 吸引点
2. 亲切表达：用"我"的视角，分享真实体验
3. 视觉友好：大量emoji、短段落、留白
4. 实用性：提供具体建议和经验
5. 互动引导：鼓励收藏、评论、关注',
'将以下内容改写成小红书种草风格：
原标题：{original_title}
原文内容：{original_content}

目标标题：{target_title}

改写要求：
1. 用第一人称"我"分享
2. 加入真实感受和体验
3. 分点说明，但要口语化
4. 使用大量emoji
5. 结尾引导互动
6. 目标字数：500-1000字',
800, '亲切、有代入感、分享感'),

-- Baijiahao Style (百家号资讯)
INSERT INTO rewrite_templates (name, style, system_prompt, prompt_template, output_length, tone) VALUES
('百家号资讯', 'baijiahao',
'你是百家号的优质创作者，擅长创作热门资讯内容。
核心原则：
1. 标题要热点：结合当前热点和话题
2. 信息准确：事实可靠，数据真实
3. 观点明确：立场清晰，观点鲜明
4. 结构紧凑：信息密度高，不啰嗦
5. 时效性强：快速响应热点事件',
'将以下内容改写成百家号资讯风格：
原标题：{original_title}
原文内容：{original_content}

目标标题：{target_title}

改写要求：
1. 确保信息准确
2. 提供明确观点
3. 结构紧凑，信息密度高
4. 适合快速阅读
5. 目标字数：800-1500字',
1200, '客观、准确、及时')

ON CONFLICT DO NOTHING;

-- ============================================
-- QUALITY THRESHOLDS (for reference)
-- ============================================
-- Minimum quality score to approve: 0.70
-- Minimum viral potential for priority: 0.75
-- Minimum audience breadth for general content: 0.60
