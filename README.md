# Mata-CTI — Threat Intelligence Platform

Mata-CTI is a self-hosted RSS-based cyber threat intelligence platform designed for security teams and practitioners. It aggregates feeds from curated cybersecurity sources, stores them locally in SQLite, and optionally enriches each article with AI-powered structured analysis — extracting urgency, severity, threat actors, targeted sectors, CVEs, malware families, MITRE ATT&CK TTPs, and more.

## Features

- **Multi-source RSS aggregation** — Monitors curated cybersecurity feeds (CISA, SANS ISC, Bleeping Computer, Krebs on Security, The Hacker News, and more) with configurable auto-refresh
- **AI enrichment** — Automatically extracts urgency, severity, category, threat actors, targeted nations and industries, CVE IDs, affected products, malware families, MITRE ATT&CK TTPs, and tags from each article
- **Multi-provider AI support** — Works with OpenAI (GPT-4o-mini, GPT-4o), Anthropic (Claude), Google Gemini, or any OpenAI-compatible endpoint (Ollama, LM Studio, etc.)
- **Executive Brief** — One-click AI-generated C-suite intelligence briefing based on the current threat landscape
- **Full content extraction** — Per-source option to fetch and analyze the full article body, not just the RSS excerpt
- **Custom keyword matching** — Define keywords (company names, technologies, countries) that highlight and urgency-boost matching items
- **Custom AI prompts** — Configure the analysis and executive brief prompts to match your organization's context
- **Feedly-style card UI** — Clean, minimal feed card design with expandable intelligence details
- **Dark/light theme** — Persistent theme preference
- **Collapsible sidebar** — With category-level navigation
- **Self-hosted & private** — Your API keys stay in the browser; no telemetry, no external dependencies beyond your chosen AI provider

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Zustand (persisted to localStorage) |
| Backend | Express + TypeScript + Node.js |
| Database | SQLite (via better-sqlite3, WAL mode) |
| Scheduling | node-cron |
| Deployment | Docker Compose + nginx reverse proxy |

## Quick Start

### Prerequisites

- Docker Desktop (or Docker + Docker Compose)

### Run with Docker

```bash
git clone <repo-url>
cd pembaca-berita
docker compose up --build -d
```

Open [http://localhost](http://localhost) in your browser.

### After First Launch

1. Go to **Settings** → **AI Provider** and configure your API key
2. Click **Refresh** in the top bar to fetch and analyze feeds
3. View the **Dashboard** for the intelligence overview and Executive Brief
4. Configure **Custom Keywords** in Settings to highlight items relevant to your environment

### Rebuilding After Code Changes

```bash
docker compose up --build -d
```

## Configuration

All configuration is done through the Settings page in the UI. Settings are persisted in browser `localStorage`.

| Setting | Description |
|---|---|
| AI Provider | OpenAI / Anthropic / Gemini / Custom (OpenAI-compatible) |
| API Key | Stored only in your browser, never on the server |
| Model | Choose from preset models or enter custom model name |
| Time Window | How many hours of feed history to display (24h / 48h / 72h / 7d) |
| Auto-Refresh | How often the backend fetches new items (15 / 30 / 60 min) |
| Custom Keywords | Terms that highlight and boost urgency of matching feed items |
| Analysis Prompt | Custom instructions prepended to each feed item analysis |
| Executive Brief Prompt | Custom instructions for the executive summary generation |

### Full Content Extraction

In the **Sources** page, each feed source has a **Full Content** toggle. When enabled, Mata-CTI will fetch the full article HTML at crawl time, strip boilerplate (nav, scripts, footer), and pass the article body to the AI analyzer — resulting in much richer intelligence extraction.

> Note: Full content extraction increases fetch time and token usage.

## Adding RSS Sources

Navigate to **Sources** → **Add New Source**. Enter a feed name and RSS URL, optionally click **Test Feed** to validate, then **Add Source**.

## Default Feed Sources

Mata-CTI ships with the following pre-configured cybersecurity feeds:

- CISA Cybersecurity Advisories
- SANS Internet Storm Center
- Krebs on Security
- Bleeping Computer
- The Hacker News
- Dark Reading
- Threatpost
- Recorded Future News
- SecurityWeek
- Malwarebytes Labs

## AI Provider Notes

### OpenAI
Use `gpt-4o-mini` for cost-effective analysis or `gpt-4o` for higher quality.

### Anthropic
Use `claude-haiku-4-5` for speed and low cost, or `claude-sonnet-4-5` for higher accuracy.

### Google Gemini
Use `gemini-2.0-flash` for fast, affordable analysis.

### Custom (OpenAI-compatible)
Point to any local or remote OpenAI-compatible endpoint:
- **Ollama**: `http://localhost:11434/v1`
- **LM Studio**: `http://localhost:1234/v1`

## Project Structure

```
pembaca-berita/
├── backend/                 # Express + TypeScript API
│   └── src/
│       ├── db/              # SQLite schema and migrations
│       ├── routes/          # API route handlers
│       └── services/        # RSS fetcher, AI analyzer, feed store
├── frontend/                # React + Vite app
│   └── src/
│       ├── components/      # Layout, FeedCard, ExecutiveSummary, etc.
│       ├── hooks/           # useFeeds, useCategories
│       ├── pages/           # Dashboard, AllFeeds, Sources, Settings
│       ├── store/           # Zustand settings store
│       ├── types/           # TypeScript interfaces
│       └── utils/           # keywordMatcher
├── nginx/                   # nginx reverse proxy config
└── docker-compose.yml
```

## Security

- API keys are stored in browser `localStorage` and transmitted only to your configured AI provider (directly from the browser for executive briefs, or via the backend only during the Refresh operation)
- Silent prompt injection guardrails are applied to all user-supplied custom prompts before they reach the AI provider
- No external telemetry or tracking

## License

MIT
