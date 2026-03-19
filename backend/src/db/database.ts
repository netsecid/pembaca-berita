import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || './data/feedwatch.db';
const dbDir = path.dirname(path.resolve(dbPath));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.resolve(dbPath));

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS feed_items (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    source_name TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    description TEXT,
    content TEXT,
    published_at INTEGER NOT NULL,
    fetched_at INTEGER NOT NULL,
    ai_analyzed INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    urgency TEXT,
    severity TEXT,
    category TEXT,
    target_industry TEXT,
    threat_actor TEXT,
    target_country TEXT,
    ttps TEXT,
    tags TEXT
  );

  CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    added_at INTEGER NOT NULL,
    last_fetched INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_feed_items_published_at ON feed_items(published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_feed_items_source_id ON feed_items(source_id);
  CREATE INDEX IF NOT EXISTS idx_feed_items_category ON feed_items(category);
  CREATE INDEX IF NOT EXISTS idx_feed_items_urgency ON feed_items(urgency);
  CREATE INDEX IF NOT EXISTS idx_feed_items_severity ON feed_items(severity);
`);

export default db;
