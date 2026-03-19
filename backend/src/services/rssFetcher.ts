import Parser from 'rss-parser';
import crypto from 'crypto';
import axios from 'axios';
import { Source, upsertFeedItem, updateSourceLastFetched, getAllSources } from './feedStore';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'FeedWatch/1.0 RSS Intelligence Platform',
  },
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['description', 'description'],
    ],
  },
});

export interface RawFeedItem {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  link: string;
  description: string;
  content?: string;
  published_at: number;
  fetched_at: number;
}

function hashLink(link: string): string {
  return crypto.createHash('sha256').update(link).digest('hex').substring(0, 32);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}

async function extractFullContent(url: string): Promise<string | null> {
  try {
    const response = await axios.get<string>(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Mata-CTI/1.0 RSS Intelligence)',
        Accept: 'text/html,application/xhtml+xml',
      },
      maxContentLength: 5 * 1024 * 1024,
      responseType: 'text',
    });
    const html = response.data;

    // Strip scripts, styles, navigation
    let cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '');

    // Prefer <article> or <main>, fall back to <body>
    const articleMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const content = articleMatch?.[1] ?? mainMatch?.[1] ?? bodyMatch?.[1] ?? cleaned;

    const text = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.length > 100 ? text.substring(0, 12000) : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Full content extraction failed for ${url}: ${msg}`);
    return null;
  }
}

export async function fetchFeed(source: Source): Promise<RawFeedItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const fetchedAt = Date.now();
    const items: RawFeedItem[] = [];

    for (const item of feed.items) {
      const link = item.link || item.guid || '';
      if (!link) continue;

      const id = hashLink(link);
      const title = item.title || 'Untitled';
      const rawDescription = item.contentSnippet || item.description || '';
      const description = stripHtml(rawDescription).substring(0, 5000);
      const rawContent = (item as unknown as Record<string, string>)['contentEncoded'] || item.content || '';
      const content = rawContent ? stripHtml(rawContent).substring(0, 10000) : undefined;

      let published_at = fetchedAt;
      if (item.pubDate) {
        const parsed = new Date(item.pubDate).getTime();
        if (!isNaN(parsed)) published_at = parsed;
      } else if (item.isoDate) {
        const parsed = new Date(item.isoDate).getTime();
        if (!isNaN(parsed)) published_at = parsed;
      }

      items.push({
        id,
        source_id: source.id,
        source_name: source.name,
        title,
        link,
        description,
        content,
        published_at,
        fetched_at: fetchedAt,
      });
    }

    // Optionally enrich with full article content
    if (source.fetch_full_content) {
      for (const item of items) {
        try {
          const fullText = await extractFullContent(item.link);
          if (fullText) item.content = fullText;
        } catch {
          // non-fatal
        }
      }
    }

    return items;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to fetch feed "${source.name}" (${source.url}): ${message}`);
    return [];
  }
}

async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++;
      const result = await tasks[currentIndex]();
      results[currentIndex] = result;
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function fetchAllFeeds(): Promise<{ newItems: number; errors: string[] }> {
  const sources = getAllSources().filter((s) => s.enabled);

  if (sources.length === 0) {
    return { newItems: 0, errors: [] };
  }

  const errors: string[] = [];
  let newItems = 0;

  const tasks = sources.map((source) => async () => {
    const items = await fetchFeed(source);
    let sourceNewItems = 0;

    for (const item of items) {
      try {
        upsertFeedItem(item);
        sourceNewItems++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Failed to store item from ${source.name}: ${message}`);
      }
    }

    if (items.length > 0) {
      updateSourceLastFetched(source.id, Date.now());
    } else if (items.length === 0) {
      errors.push(`No items fetched from ${source.name}`);
    }

    newItems += sourceNewItems;
    console.log(`Fetched ${items.length} items from ${source.name}`);
  });

  await runWithConcurrencyLimit(tasks, 5);

  return { newItems, errors };
}
