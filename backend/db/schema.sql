-- ContentHub MVP Database Schema
-- This file defines all tables, indexes, and initial data

-- Sources table - 信源配置
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('rss', 'twitter', 'youtube', 'webpage')),
  url TEXT,
  twitter_handle VARCHAR(50),
  twitter_user_id VARCHAR(50),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  quality_score DECIMAL(3,2),
  is_active BOOLEAN DEFAULT true,
  check_interval_hours INTEGER DEFAULT 1,
  last_checked_at TIMESTAMPTZ,
  last_found_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw Articles table - 抓取的原始文章
CREATE TYPE article_status AS ENUM ('pending', 'approved', 'rejected', 'rewritten');

CREATE TABLE IF NOT EXISTS raw_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  original_url TEXT UNIQUE NOT NULL,
  author VARCHAR(100),
  published_at TIMESTAMPTZ,
  quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  viral_potential DECIMAL(3,2) CHECK (viral_potential >= 0 AND viral_potential <= 1),
  engagement_prediction DECIMAL(3,2) CHECK (engagement_prediction >= 0 AND engagement_prediction <= 1),
  tags TEXT[],
  keywords TEXT[],
  category VARCHAR(50),
  status article_status DEFAULT 'pending',
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewrite Templates table - 改写模板
CREATE TABLE IF NOT EXISTS rewrite_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  style VARCHAR(50) NOT NULL,
  system_prompt TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  output_length INTEGER,
  tone VARCHAR(50),
  usage_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) CHECK (avg_rating >= 0 AND avg_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Published Articles table - 改写后的文章
CREATE TABLE IF NOT EXISTS published_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_article_id UUID REFERENCES raw_articles(id) ON DELETE CASCADE,
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

-- ============================================
-- INDEXES for performance
-- ============================================

-- Sources indexes
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources(is_active) WHERE is_active = true;

-- Raw Articles indexes
CREATE INDEX IF NOT EXISTS idx_raw_articles_source ON raw_articles(source_id);
CREATE INDEX IF NOT EXISTS idx_raw_articles_original_url ON raw_articles(original_url);
CREATE INDEX IF NOT EXISTS idx_raw_articles_score ON raw_articles(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_raw_articles_viral ON raw_articles(viral_potential DESC);
CREATE INDEX IF NOT EXISTS idx_raw_articles_status ON raw_articles(status);
CREATE INDEX IF NOT EXISTS idx_raw_articles_published ON raw_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_articles_created ON raw_articles(created_at DESC);

-- Rewrite Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_style ON rewrite_templates(style);

-- Published Articles indexes
CREATE INDEX IF NOT EXISTS idx_published_raw_article ON published_articles(raw_article_id);
CREATE INDEX IF NOT EXISTS idx_published_template ON published_articles(template_id);
CREATE INDEX IF NOT EXISTS idx_published_created ON published_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_published_revenue ON published_articles(estimated_revenue DESC);
