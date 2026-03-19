import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import db from './db/database';
import { loadSourcesFromFile, purgeOldItems } from './services/feedStore';
import { fetchAllFeeds } from './services/rssFetcher';
import feedsRouter from './routes/feeds';
import sourcesRouter from './routes/sources';
import refreshRouter from './routes/refresh';

const app = express();
const PORT = process.env.PORT || 3001;
const REFRESH_INTERVAL_MINUTES = Number(process.env.REFRESH_INTERVAL_MINUTES) || 30;
const FEED_WINDOW_HOURS = Number(process.env.FEED_WINDOW_HOURS) || 24;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Routes
app.use('/api/feeds', feedsRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/refresh', refreshRouter);

// Initialize database and sources
try {
  // DB is initialized by importing the module
  void db;
  loadSourcesFromFile();
  console.log('Database initialized and sources loaded.');
} catch (err) {
  console.error('Failed to initialize:', err);
  process.exit(1);
}

// Schedule periodic refresh
const cronExpression = `*/${REFRESH_INTERVAL_MINUTES} * * * *`;
console.log(`Scheduling RSS refresh every ${REFRESH_INTERVAL_MINUTES} minutes.`);

cron.schedule(cronExpression, async () => {
  console.log('Running scheduled RSS refresh...');
  try {
    const { newItems } = await fetchAllFeeds();
    purgeOldItems(FEED_WINDOW_HOURS);
    console.log(`Scheduled refresh complete. New items: ${newItems}`);
  } catch (err) {
    console.error('Scheduled refresh failed:', err);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`FeedWatch backend running on port ${PORT}`);

  // Initial fetch on startup
  console.log('Running initial RSS fetch...');
  fetchAllFeeds()
    .then(({ newItems }) => {
      purgeOldItems(FEED_WINDOW_HOURS);
      console.log(`Initial fetch complete. New items: ${newItems}`);
    })
    .catch((err) => {
      console.error('Initial fetch failed:', err);
    });
});

export default app;
