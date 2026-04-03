# analyst.

AI-powered research and intelligence platform that extracts, enriches, and organizes business data — so your team can focus on closing deals, not building spreadsheets.

## Tools

### Event Intelligence (Live)
Extract speakers from conference and event pages, enrich with LinkedIn profiles, and export to Excel.

1. **Point** — Paste a conference URL
2. **Extract** — Claude agent autonomously navigates the page, inspects network traffic, and pulls structured speaker data
3. **Enrich** — Each speaker is matched to their LinkedIn profile via Exa search
4. **Export** — Download results as CSV or styled Excel

### Company Research (Coming Soon)
Build detailed company profiles from public sources — funding, team, tech stack, competitors.

### Outreach Builder (Coming Soon)
Generate personalized outreach sequences using enriched prospect data and AI-written copy.

### Document Analyzer (Coming Soon)
Upload contracts, reports, or filings and extract structured insights, key terms, and summaries.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4, AG Grid |
| Backend | FastAPI, Python 3.11+ |
| AI | Claude Agent SDK, Chrome DevTools MCP (headless browser automation) |
| Enrichment | Exa API (semantic search, LinkedIn matching) |
| Monorepo | Turborepo, pnpm workspaces |
| Export | ExcelJS, file-saver |

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Next.js Frontend (localhost:3000)               │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │
│  │ URL Input  │  │ Chat UI   │  │  AG Grid    │ │
│  └─────┬─────┘  └─────▲─────┘  └──────▲──────┘ │
│        │               │               │        │
│        │          SSE events       row updates   │
└────────┼───────────────┼───────────────┼────────┘
         │               │               │
    POST /api/extract    │    EventSource /stream
         │               │               │
┌────────▼───────────────┴───────────────┴────────┐
│  FastAPI Backend (localhost:8000)                 │
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │  Extraction Pipeline                  │       │
│  │                                       │       │
│  │  Phase 1: Scrape                      │       │
│  │  Claude Agent + Chrome DevTools MCP   │       │
│  │  → Network inspection → Parse data    │       │
│  │                                       │       │
│  │  Phase 2: Enrich                      │       │
│  │  Exa API → LinkedIn profile matching  │       │
│  │  (sequential, rate-limited)           │       │
│  └──────────────────────────────────────┘       │
└──────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### Setup

```bash
# Clone the repo
git clone https://github.com/kbiam/analyst-platform.git
cd analyst-platform

# Install frontend dependencies
pnpm install

# Install backend dependencies
cd apps/api
uv sync
cd ../..

# Configure environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Add your API keys to both .env files
```

### Run

Start both servers in separate terminals:

```bash
# Terminal 1 — Backend
cd apps/api
uv run uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key from [console.anthropic.com](https://console.anthropic.com) |
| `EXA_API_KEY` | Exa API key from [dashboard.exa.ai](https://dashboard.exa.ai) |

## Project Structure

```
analyst-platform/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── app/              # App Router pages
│   │   ├── components/       # React components
│   │   ├── hooks/            # State management & API hooks
│   │   └── lib/              # Utilities (export, API client)
│   └── api/                  # FastAPI backend
│       └── app/
│           ├── main.py       # API endpoints
│           ├── pipeline.py   # Extraction orchestration
│           ├── scraper.py    # Claude agent web scraper
│           ├── enrichment.py # Exa LinkedIn enrichment
│           ├── jobs.py       # In-memory job store & SSE
│           └── models.py     # Pydantic models
└── packages/
    └── shared/               # Shared TypeScript types & Zod schemas
```

## How It Works

1. User submits a conference URL
2. Backend creates a job and starts an async pipeline
3. **Scraping phase**: A Claude agent with Chrome DevTools MCP navigates the page in a headless browser, inspects network responses for structured data, and extracts speaker information
4. **Enrichment phase**: Each speaker is searched on LinkedIn via Exa's semantic search API (sequential, 0.5s rate limit)
5. Progress streams to the frontend via Server-Sent Events
6. AG Grid updates row-by-row in real time as enrichment completes
7. User can edit cells inline and export to CSV or Excel

## License

MIT
