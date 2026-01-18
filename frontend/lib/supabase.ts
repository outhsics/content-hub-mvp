import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface PublishedArticle {
  id: string;
  title: string;
  content: string;
  summary?: string;
  keywords?: string[];
  target_platforms: string[];
  created_at: string;
  raw_article_id: string;
}

export interface RawArticle {
  id: string;
  title: string;
  content: string;
  quality_score?: number;
  viral_potential?: number;
  status: string;
  created_at: string;
}
