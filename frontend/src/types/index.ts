export interface FeedItem {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  link: string;
  description: string;
  content?: string;
  published_at: number;
  fetched_at: number;
  ai_analyzed: boolean;
  summary?: string;
  urgency?: 'critical' | 'high' | 'medium' | 'low';
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  category?: string;
  target_industry?: string[];
  threat_actor?: string[];
  target_country?: string[];
  ttps?: string[];
  tags?: string[];
  cve_ids?: string[];
  affected_products?: string[];
  malware_families?: string[];
}

export interface Source {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  fetch_full_content: boolean;
  added_at: number;
  last_fetched?: number;
}

export interface FeedStats {
  total: number;
  byUrgency: Record<string, number>;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface AISettings {
  provider: 'openai' | 'anthropic' | 'gemini' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AppSettings {
  ai: AISettings;
  feedWindowHours: number;
  refreshIntervalMinutes: number;
  theme: 'dark' | 'light';
  customKeywords: string[];
  customPromptAnalysis: string;
  customPromptSummary: string;
}

export interface CategoryItem {
  category: string;
  count: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface FeedsResponse {
  items: FeedItem[];
  total: number;
}
