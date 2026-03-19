import { Router, Request, Response } from 'express';
import { getAllFeeds, getFeedStats, getCategories } from '../services/feedStore';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const {
      window,
      category,
      urgency,
      severity,
      search,
      page,
      limit,
    } = req.query as Record<string, string>;

    const result = getAllFeeds({
      windowHours: window ? Number(window) : undefined,
      category,
      urgency,
      severity,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 200) : 50,
    });

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

router.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = getFeedStats();
    res.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

router.get('/categories', (_req: Request, res: Response) => {
  try {
    const categories = getCategories();
    res.json(categories);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
