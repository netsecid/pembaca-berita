import { Router, Request, Response } from 'express';
import Parser from 'rss-parser';
import { getAllSources, addSource, removeSource } from '../services/feedStore';

const router = Router();

const testParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'FeedWatch/1.0 RSS Intelligence Platform',
  },
});

router.get('/', (_req: Request, res: Response) => {
  try {
    const sources = getAllSources();
    res.json(sources);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, url } = req.body as { name?: string; url?: string };

    if (!name || !url) {
      res.status(400).json({ error: 'name and url are required' });
      return;
    }

    const trimmedUrl = url.trim();
    const trimmedName = name.trim();

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      res.status(400).json({ error: 'URL must start with http:// or https://' });
      return;
    }

    const source = addSource(trimmedName, trimmedUrl);
    res.status(201).json(source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    removeSource(id);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

router.post('/test', async (req: Request, res: Response) => {
  try {
    const { url } = req.body as { url?: string };

    if (!url) {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    const trimmedUrl = url.trim();

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      res.status(400).json({ success: false, error: 'URL must start with http:// or https://' });
      return;
    }

    const feed = await testParser.parseURL(trimmedUrl);
    res.json({
      success: true,
      title: feed.title || 'Unknown Feed',
      itemCount: feed.items.length,
      description: feed.description || '',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(200).json({ success: false, error: message });
  }
});

export default router;
