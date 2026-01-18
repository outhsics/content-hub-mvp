// Shared types between frontend and backend

export interface Source {
  id: string;
  name: string;
  source_type: 'rss' | 'twitter' | 'youtube' | 'webpage';
  url?: string;
  twitter_handle?: string;
  priority: number;
  quality_score?: number;
  is_active: boolean;
  check_interval_hours: number;
  last_checked_at?: Date;
  last_found_at?: Date;
  created_at: Date;
}

export interface RawArticle {
  id: string;
  source_id: string;
  title: string;
  content: string;
  original_url: string;
  author?: string;
  published_at?: Date;
  quality_score?: number;
  viral_potential?: number;
  engagement_prediction?: number;
  tags?: string[];
  keywords?: string[];
  category?: string;
  status: 'pending' | 'approved' | 'rejected' | 'rewritten';
  scraped_at: Date;
  created_at: Date;
}

export interface RewriteTemplate {
  id: string;
  name: string;
  style: string;
  system_prompt: string;
  prompt_template: string;
  output_length?: number;
  tone?: string;
  usage_count: number;
  avg_rating?: number;
  created_at: Date;
}

export interface PublishedArticle {
  id: string;
  raw_article_id: string;
  template_id: string;
  title: string;
  content: string;
  summary?: string;
  seo_title?: string;
  meta_description?: string;
  keywords?: string[];
  target_platforms: string[];
  published_urls?: Record<string, string>;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  estimated_revenue?: number;
  actual_revenue?: number;
  created_at: Date;
  published_at?: Date;
}

export interface ArticleScore {
  overall_score: number;
  originality: number;
  utility: number;
  timeliness: number;
  viral_potential: number;
  audience_breadth: number;
  should_rewrite: boolean;
  reason: string;
}

export interface TitleOption {
  title: string;
  predicted_ctr: number;
}

export interface RewriteResult {
  title: string;
  summary: string;
  content: string;
  tags: string[];
}
