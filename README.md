# FeedWatch — RSS Intelligence Platform

FeedWatch is a self-hosted RSS aggregator with optional AI-powered threat intelligence enrichment, built for cybersecurity professionals. It monitors your RSS feed sources, stores articles in a local SQLite database, and optionally enriches them with structured analysis using any OpenAI-compatible, Anthropic, or Google Gemini AI provider.

![FeedWatch Dashboard](https://via.placeholder.com/1200x600/0f1117/4f8ef7?text=FeedWatch+Dashboard)

## Features

- **Multi-source RSS aggregation** — Monitors 10 default cybersecurity feeds (Krebs, Bleeping Computer, CISA, SANS ISC, and more)
- **AI enrichment** — Automatically extracts urgency, severity, category, threat actors, targeted industries/countries, MITRE ATT&CK TTPs, and tags
- **Provider-agnostic AI** — Works with OpenAI, Anthropic Claude, Google Gemini, or any OpenAI-compatible local model (Ollama, LM Studio, etc.)
- **Intelligent filtering** — Filter by urgency, severity, category, or free-text search
- **Auto-refresh** — Configurable cron-based polling (default: every 30 minutes)
- **Dark/Light theme** — Responsive UI built with Tailwind CSS
- **Self-contained** — Single Docker Compose command to run everything; no external services required
- **Privacy-first** — API keys are stored only in your browser's localStorage, never on the server

## Quick Start (Docker)

```bash
# Clone the repo
git clone https://github.com/youruser/feedwatch.git
cd feedwatch

# Copy env file
cp .env.example .env

# Start everything
docker compose up -d
```

Open **http://localhost** in your browser.

To enable AI analysis, go to **Settings** and configure your preferred AI provider.

## Manual Setup (Node.js)

### Prerequisites

- Node.js 20+
- npm 9+

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env as needed
npm run dev
```

The backend runs on **http://localhost:3001**.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on **http://localhost:5173** (proxies `/api` to port 3001).

## Configuration

### Environment Variables (backend/.env)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port for the backend server |
| `DATABASE_PATH` | `./data/feedwatch.db` | Path to SQLite database file |
| `FEED_WINDOW_HOURS` | `24` | Age window for feed items (hours) |
| `REFRESH_INTERVAL_MINUTES` | `30` | Auto-refresh interval (minutes) |

### Feed Sources

Default sources are stored in `backend/feeds.json`. You can edit this file directly or use the **Sources** page in the UI to add/remove feeds.

The format is:

```json
[
  {
    "id": "unique-id",
    "name": "Feed Display Name",
    "url": "https://example.com/feed.xml",
    "enabled": true
  }
]
```

## AI Provider Setup

Go to **Settings → AI Provider** in the UI and configure:

1. **Provider** — OpenAI, Anthropic, Gemini, or Custom (OpenAI-compatible)
2. **API Key** — Your provider API key (stored in localStorage only)
3. **Model** — Select from the dropdown or enter a custom model name
4. **Base URL** (Custom only) — Your local model endpoint, e.g. `http://localhost:11434/v1`

Supported providers and models:

| Provider | Models |
|---|---|
| OpenAI | `gpt-4o-mini`, `gpt-4o` |
| Anthropic | `claude-haiku-4-5`, `claude-sonnet-4-5` |
| Google Gemini | `gemini-2.0-flash`, `gemini-1.5-pro` |
| Custom | Any OpenAI-compatible endpoint |

After configuring, click **Refresh** in the top bar to fetch and analyze new items.

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/feeds` | GET | List feed items (with filters) |
| `/api/feeds/stats` | GET | Urgency/severity/category counts |
| `/api/feeds/categories` | GET | Distinct categories with counts |
| `/api/sources` | GET | List configured sources |
| `/api/sources` | POST | Add a new source |
| `/api/sources/:id` | DELETE | Remove a source |
| `/api/sources/test` | POST | Validate an RSS URL |
| `/api/refresh` | POST | Trigger manual refresh + AI analysis |

### Feed Query Parameters

| Param | Type | Description |
|---|---|---|
| `window` | number | Override time window (hours) |
| `category` | string | Filter by category |
| `urgency` | string | Filter by urgency level |
| `severity` | string | Filter by severity level |
| `search` | string | Full-text search |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (max: 200, default: 50) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT License — see LICENSE file for details.
