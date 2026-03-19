import type { FeedItem } from '../types';

const URGENCY_ORDER = ['low', 'medium', 'high', 'critical'] as const;
const SEVERITY_ORDER = ['informational', 'low', 'medium', 'high', 'critical'] as const;

function boostUrgency(level: string | undefined): string {
  if (!level) return 'medium';
  const idx = URGENCY_ORDER.indexOf(level as typeof URGENCY_ORDER[number]);
  if (idx === -1) return level;
  return URGENCY_ORDER[Math.min(idx + 1, URGENCY_ORDER.length - 1)];
}

function boostSeverity(level: string | undefined): string {
  if (!level) return 'medium';
  const idx = SEVERITY_ORDER.indexOf(level as typeof SEVERITY_ORDER[number]);
  if (idx === -1) return level;
  return SEVERITY_ORDER[Math.min(idx + 1, SEVERITY_ORDER.length - 1)];
}

export interface KeywordMatchResult {
  matchedKeywords: string[];
  boostedUrgency: string | undefined;
  boostedSeverity: string | undefined;
  isKeywordMatch: boolean;
}

export function applyKeywordMatch(item: FeedItem, keywords: string[]): KeywordMatchResult {
  if (!keywords.length) {
    return { matchedKeywords: [], boostedUrgency: item.urgency, boostedSeverity: item.severity, isKeywordMatch: false };
  }

  // Build the searchable text from all relevant fields
  const searchText = [
    item.title,
    item.description,
    item.summary,
    item.content,
    ...(item.tags ?? []),
    ...(item.threat_actor ?? []),
    ...(item.target_country ?? []),
    ...(item.target_industry ?? []),
    ...(item.affected_products ?? []),
    ...(item.malware_families ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matchedKeywords = keywords.filter((kw) => {
    if (!kw.trim()) return false;
    return searchText.includes(kw.trim().toLowerCase());
  });

  if (matchedKeywords.length === 0) {
    return { matchedKeywords: [], boostedUrgency: item.urgency, boostedSeverity: item.severity, isKeywordMatch: false };
  }

  return {
    matchedKeywords,
    boostedUrgency: boostUrgency(item.urgency),
    boostedSeverity: boostSeverity(item.severity),
    isKeywordMatch: true,
  };
}
