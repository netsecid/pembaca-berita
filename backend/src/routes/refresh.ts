import { Router, Request, Response } from 'express';
import { fetchAllFeeds } from '../services/rssFetcher';
import { purgeOldItems, getUnanalyzedItems } from '../services/feedStore';
import { analyzeNewItems, AISettings } from '../services/aiAnalyzer';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const windowHours = Number(process.env.FEED_WINDOW_HOURS) || 24;

    const { newItems, errors } = await fetchAllFeeds();

    const purged = purgeOldItems(windowHours);

    let analyzed = 0;

    const { apiKey, provider, model, baseUrl } = req.body as {
      apiKey?: string;
      provider?: string;
      model?: string;
      baseUrl?: string;
    };

    if (apiKey && provider && model) {
      const aiSettings: AISettings = {
        provider: provider as AISettings['provider'],
        apiKey,
        model,
        baseUrl,
      };

      const unanalyzedItems = getUnanalyzedItems(50);
      if (unanalyzedItems.length > 0) {
        analyzed = await analyzeNewItems(unanalyzedItems, aiSettings);
      }
    }

    res.json({
      success: true,
      newItems,
      purged,
      analyzed,
      errors,
      message: `Fetched ${newItems} items, purged ${purged} old items${analyzed > 0 ? `, analyzed ${analyzed} items` : ''}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
