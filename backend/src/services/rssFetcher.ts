import Parser from 'rss-parser';
import crypto from 'crypto';
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
