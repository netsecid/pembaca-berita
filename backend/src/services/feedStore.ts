import db from '../db/database';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const FEEDS_JSON_PATH = path.resolve(__dirname, '../../feeds.json');

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
  urgency?: string;
  severity?: string;
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

export interface FeedItemRow {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  link: string;
  description: string;
  content?: string;
  published_at: number;
  fetched_at: number;
  ai_analyzed: number;
  summary?: string;
  urgency?: string;
  severity?: string;
  category?: string;
  target_industry?: string;
  threat_actor?: string;
  target_country?: string;
  ttps?: string;
  tags?: string;
  cve_ids?: string;
  affected_products?: string;
  malware_families?: string;
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

export interface SourceRow {
  id: string;
  name: string;
  url: string;
  enabled: number;
  fetch_full_content: number;
  added_at: number;
  last_fetched?: number;
}

export interface FeedFilters {
  windowHours?: number;
  category?: string;
  urgency?: string;
  severity?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FeedStats {
  total: number;
  byUrgency: Record<string, number>;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
}

function parseJsonField(val: string | undefined | null): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToFeedItem(row: FeedItemRow): FeedItem {
  return {
    id: row.id,
    source_id: row.source_id,
    source_name: row.source_name,
    title: row.title,
    link: row.link,
    description: row.description,
    content: row.content,
    published_at: row.published_at,
    fetched_at: row.fetched_at,
    ai_analyzed: row.ai_analyzed === 1,
    summary: row.summary,
    urgency: row.urgency,
    severity: row.severity,
    category: row.category,
    target_industry: parseJsonField(row.target_industry),
    threat_actor: parseJsonField(row.threat_actor),
    target_country: parseJsonField(row.target_country),
    ttps: parseJsonField(row.ttps),
    tags: parseJsonField(row.tags),
    cve_ids: parseJsonField(row.cve_ids),
    affected_products: parseJsonField(row.affected_products),
    malware_families: parseJsonField(row.malware_families),
  };
}

function rowToSource(row: SourceRow): Source {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    enabled: row.enabled === 1,
    fetch_full_content: row.fetch_full_content === 1,
    added_at: row.added_at,
    last_fetched: row.last_fetched,
  };
}

export function getAllFeeds(filters: FeedFilters = {}): { items: FeedItem[]; total: number } {
  const {
    windowHours = Number(process.env.FEED_WINDOW_HOURS) || 24,
    category,
    urgency,
    severity,
    search,
    page = 1,
    limit = 50,
  } = filters;

  const cutoffTs = Date.now() - windowHours * 60 * 60 * 1000;
  const conditions: string[] = ['published_at >= ?'];
  const params: (string | number)[] = [cutoffTs];

  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }

  if (urgency && urgency !== 'all') {
    conditions.push('urgency = ?');
    params.push(urgency);
  }

  if (severity && severity !== 'all') {
    conditions.push('severity = ?');
    params.push(severity);
  }

  if (search) {
    conditions.push('(title LIKE ? OR description LIKE ? OR summary LIKE ?)');
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM feed_items ${whereClause}`)
    .get(...params) as { count: number };

  const offset = (page - 1) * limit;
  const rows = db
    .prepare(
      `SELECT * FROM feed_items ${whereClause} ORDER BY published_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as FeedItemRow[];

  return {
    items: rows.map(rowToFeedItem),
    total: countRow.count,
  };
}

export function getFeedStats(windowHours?: number): FeedStats {
  const resolvedWindow = windowHours ?? Number(process.env.FEED_WINDOW_HOURS) || 24;
  const cutoffTs = Date.now() - resolvedWindow * 60 * 60 * 1000;

  const totalRow = db
    .prepare('SELECT COUNT(*) as count FROM feed_items WHERE published_at >= ?')
    .get(cutoffTs) as { count: number };

  const urgencyRows = db
    .prepare(
      'SELECT urgency, COUNT(*) as count FROM feed_items WHERE published_at >= ? AND urgency IS NOT NULL GROUP BY urgency'
    )
    .all(cutoffTs) as { urgency: string; count: number }[];

  const severityRows = db
    .prepare(
      'SELECT severity, COUNT(*) as count FROM feed_items WHERE published_at >= ? AND severity IS NOT NULL GROUP BY severity'
    )
    .all(cutoffTs) as { severity: string; count: number }[];

  const categoryRows = db
    .prepare(
      'SELECT category, COUNT(*) as count FROM feed_items WHERE published_at >= ? AND category IS NOT NULL GROUP BY category'
    )
    .all(cutoffTs) as { category: string; count: number }[];

  const byUrgency: Record<string, number> = {};
  for (const row of urgencyRows) {
    byUrgency[row.urgency] = row.count;
  }

  const bySeverity: Record<string, number> = {};
  for (const row of severityRows) {
    bySeverity[row.severity] = row.count;
  }

  const byCategory: Record<string, number> = {};
  for (const row of categoryRows) {
    byCategory[row.category] = row.count;
  }

  return {
    total: totalRow.count,
    byUrgency,
    bySeverity,
    byCategory,
  };
}

export function getCategories(windowHours?: number): { category: string; count: number }[] {
  const resolvedWindow = windowHours ?? Number(process.env.FEED_WINDOW_HOURS) || 24;
  const cutoffTs = Date.now() - resolvedWindow * 60 * 60 * 1000;

  const rows = db
    .prepare(
      'SELECT category, COUNT(*) as count FROM feed_items WHERE published_at >= ? AND category IS NOT NULL GROUP BY category ORDER BY count DESC'
    )
    .all(cutoffTs) as { category: string; count: number }[];

  return rows;
}

export function upsertFeedItem(item: Omit<FeedItem, 'ai_analyzed'>): void {
  const stmt = db.prepare(`
    INSERT INTO feed_items (
      id, source_id, source_name, title, link, description, content,
      published_at, fetched_at, ai_analyzed
    ) VALUES (
      @id, @source_id, @source_name, @title, @link, @description, @content,
      @published_at, @fetched_at, 0
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      content = excluded.content,
      fetched_at = excluded.fetched_at
  `);

  stmt.run({
    id: item.id,
    source_id: item.source_id,
    source_name: item.source_name,
    title: item.title,
    link: item.link,
    description: item.description || '',
    content: item.content || null,
    published_at: item.published_at,
    fetched_at: item.fetched_at,
  });
}

export interface AIAnalysis {
  summary?: string;
  urgency?: string;
  severity?: string;
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

export function updateFeedAnalysis(id: string, analysis: AIAnalysis): void {
  const stmt = db.prepare(`
    UPDATE feed_items SET
      ai_analyzed = 1,
      summary = @summary,
      urgency = @urgency,
      severity = @severity,
      category = @category,
      target_industry = @target_industry,
      threat_actor = @threat_actor,
      target_country = @target_country,
      ttps = @ttps,
      tags = @tags,
      cve_ids = @cve_ids,
      affected_products = @affected_products,
      malware_families = @malware_families
    WHERE id = @id
  `);

  stmt.run({
    id,
    summary: analysis.summary || null,
    urgency: analysis.urgency || null,
    severity: analysis.severity || null,
    category: analysis.category || null,
    target_industry: analysis.target_industry ? JSON.stringify(analysis.target_industry) : null,
    threat_actor: analysis.threat_actor ? JSON.stringify(analysis.threat_actor) : null,
    target_country: analysis.target_country ? JSON.stringify(analysis.target_country) : null,
    ttps: analysis.ttps ? JSON.stringify(analysis.ttps) : null,
    tags: analysis.tags ? JSON.stringify(analysis.tags) : null,
    cve_ids: analysis.cve_ids ? JSON.stringify(analysis.cve_ids) : null,
    affected_products: analysis.affected_products ? JSON.stringify(analysis.affected_products) : null,
    malware_families: analysis.malware_families ? JSON.stringify(analysis.malware_families) : null,
  });
}

export function getAllSources(): Source[] {
  const rows = db.prepare('SELECT * FROM sources ORDER BY added_at DESC').all() as SourceRow[];
  return rows.map(rowToSource);
}

export function addSource(name: string, url: string): Source {
  const id = uuidv4();
  const added_at = Date.now();

  db.prepare(`
    INSERT INTO sources (id, name, url, enabled, added_at)
    VALUES (?, ?, ?, 1, ?)
  `).run(id, name, url, added_at);

  const source: Source = { id, name, url, enabled: true, added_at };

  // Write to feeds.json
  updateFeedsJson();

  return source;
}

export function removeSource(id: string): void {
  db.prepare('DELETE FROM sources WHERE id = ?').run(id);
  updateFeedsJson();
}

export function updateSourceLastFetched(id: string, timestamp: number): void {
  db.prepare('UPDATE sources SET last_fetched = ? WHERE id = ?').run(timestamp, id);
}

export function updateSourceFetchFullContent(id: string, enabled: boolean): void {
  db.prepare('UPDATE sources SET fetch_full_content = ? WHERE id = ?').run(enabled ? 1 : 0, id);
}

export function loadSourcesFromFile(): void {
  if (!fs.existsSync(FEEDS_JSON_PATH)) {
    console.warn('feeds.json not found, skipping source load');
    return;
  }

  try {
    const raw = fs.readFileSync(FEEDS_JSON_PATH, 'utf-8');
    const feedsData = JSON.parse(raw) as Array<{
      id: string;
      name: string;
      url: string;
      enabled: boolean;
    }>;

    const upsertSource = db.prepare(`
      INSERT INTO sources (id, name, url, enabled, added_at)
      VALUES (@id, @name, @url, @enabled, @added_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        url = excluded.url,
        enabled = excluded.enabled
    `);

    const insertMany = db.transaction((sources: typeof feedsData) => {
      for (const source of sources) {
        upsertSource.run({
          id: source.id,
          name: source.name,
          url: source.url,
          enabled: source.enabled ? 1 : 0,
          added_at: Date.now(),
        });
      }
    });

    insertMany(feedsData);
    console.log(`Loaded ${feedsData.length} sources from feeds.json`);
  } catch (err) {
    console.error('Failed to load sources from feeds.json:', err);
  }
}

function updateFeedsJson(): void {
  try {
    const sources = getAllSources();
    const feedsData = sources.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      enabled: s.enabled,
    }));
    fs.writeFileSync(FEEDS_JSON_PATH, JSON.stringify(feedsData, null, 2));
  } catch (err) {
    console.error('Failed to update feeds.json:', err);
  }
}

export function purgeOldItems(windowHours: number): number {
  const cutoffTs = Date.now() - windowHours * 60 * 60 * 1000;
  const result = db.prepare('DELETE FROM feed_items WHERE published_at < ?').run(cutoffTs);
  return result.changes;
}

export function getUnanalyzedItems(limit = 50): FeedItem[] {
  const rows = db
    .prepare(
      'SELECT * FROM feed_items WHERE ai_analyzed = 0 ORDER BY published_at DESC LIMIT ?'
    )
    .all(limit) as FeedItemRow[];
  return rows.map(rowToFeedItem);
}
