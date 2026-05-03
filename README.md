# 🌐 TrendAtlas

**Real-Time Trend Analyzer** — A fullstack web application that aggregates, analyzes, and visualizes trending topics from multiple platforms.

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-ISC-blue)

---

## Overview

TrendAtlas pulls real-time trend data from **GitHub**, **Reddit**, and **Google Trends**, normalizes it through a unified data pipeline, applies a custom scoring algorithm, and presents it through an interactive dashboard with comparison and watchlist features.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Data Sources                      │
│  Google Trends  ·  GitHub Search  ·  Reddit API     │
└──────────┬──────────────┬──────────────┬────────────┘
           │              │              │
           ▼              ▼              ▼
┌─────────────────────────────────────────────────────┐
│              Backend (Express.js)                    │
│  Fetchers → Normalizer → Scorer → REST API          │
│  Scheduled via node-cron (hourly)                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│           Database (Supabase PostgreSQL)             │
│  trends · trend_snapshots · trend_scores · users     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              Frontend (Next.js)                      │
│  Dashboard · Detail · Compare · Watchlist            │
│  Tailwind CSS · Recharts                             │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js · Tailwind CSS · Recharts |
| Backend | Node.js · Express.js |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Deployment | Vercel (frontend) · Render (backend) |
| Utilities | node-cron · axios · cheerio |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) account (free tier)
- Reddit API credentials ([register here](https://www.reddit.com/prefs/apps))

### Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your Supabase and Reddit credentials in .env
npm install
npm run dev
```

The API will be available at `http://localhost:3001`.

### Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Fill in your API URL and Supabase credentials
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

## Project Structure

```
TrendAtlas/
├── backend/
│   └── src/
│       ├── config/        # Constants, env config
│       ├── controllers/   # Request handlers
│       ├── db/            # Supabase client
│       ├── fetchers/      # Platform data fetchers
│       ├── jobs/          # Cron job definitions
│       ├── middleware/     # Auth, logging, errors
│       ├── normalizers/   # Data normalization
│       ├── routes/        # API route definitions
│       ├── services/      # Business logic
│       └── utils/         # Shared helpers
├── frontend/
│   └── src/
│       ├── app/           # Next.js App Router pages
│       ├── components/    # Reusable UI components
│       ├── hooks/         # Custom React hooks
│       └── lib/           # API client, auth, utils
└── docs/                  # Architecture docs & plans
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server + DB health check |
| `GET` | `/api/trends` | List trends (paginated, filterable) |
| `GET` | `/api/trends/:id` | Trend detail with history |
| `GET` | `/api/trends/compare?ids=` | Compare multiple trends |
| `GET` | `/api/trends/top` | Top trends by score |

*More endpoints will be added as development progresses.*

## Development Roadmap

- [x] **Phase 0** — Foundation (repo, structure, boilerplate)
- [ ] **Phase 1** — Backend Core (Express, DB, health check)
- [ ] **Phase 2** — Data Pipeline (fetchers, normalizer, cron)
- [ ] **Phase 3** — Trend Engine (scoring, comparison, insights)
- [ ] **Phase 4** — Frontend Setup (design system, layout, API client)
- [ ] **Phase 5** — Core UI (dashboard, detail, compare)
- [ ] **Phase 6** — Authentication (Supabase Auth)
- [ ] **Phase 7** — User Features (watchlist, notifications)
- [ ] **Phase 8** — Advanced Features (map, analytics)
- [ ] **Phase 9** — Polish (loading states, responsive, a11y)
- [ ] **Phase 10** — Deployment (Vercel + Render)
- [ ] **Phase 11** — Testing
- [ ] **Phase 12** — Finalization

## License

ISC
