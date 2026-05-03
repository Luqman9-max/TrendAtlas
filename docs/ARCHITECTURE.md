# TrendAtlas — Architecture Document

## System Overview

TrendAtlas is a real-time trend aggregation platform built as a monorepo with separate backend (Express.js) and frontend (Next.js) applications, connected through a REST API, with Supabase PostgreSQL as the data layer.

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                          │
│                                                            │
│  GitHub Search API    Reddit OAuth API    Google Trends*   │
│  (stars, forks)       (score, comments)   (daily trends)   │
└─────┬────────────────────┬──────────────────┬──────────────┘
      │                    │                  │
      ▼                    ▼                  ▼
┌────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                     │
│                                                            │
│  ┌──────────┐   ┌────────────┐   ┌───────────────┐        │
│  │ Fetchers │──▶│ Normalizer │──▶│  Pipeline     │        │
│  │ (3 src)  │   │ (0-100)    │   │  Orchestrator │        │
│  └──────────┘   └────────────┘   └──────┬────────┘        │
│                                         │                  │
│                                         ▼                  │
│                                  ┌──────────────┐          │
│                                  │ Scoring      │          │
│                                  │ Engine       │          │
│                                  └──────┬───────┘          │
│                                         │                  │
│  ┌──────────┐   ┌────────────┐          │                  │
│  │  Routes  │──▶│Controllers │◀─────────┘                  │
│  │ (REST)   │   │            │                             │
│  └──────────┘   └──────┬─────┘                             │
│                        │                                   │
│  ┌──────────┐          │    ┌──────────┐                   │
│  │ Auth MW  │──────────┤    │ node-cron│ (hourly)          │
│  │ (JWT)    │          │    └──────────┘                   │
│  └──────────┘          │                                   │
└────────────────────────┼───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL + Auth)                   │
│                                                            │
│  trends ──── trend_snapshots ──── trend_scores             │
│  users ───── watchlist_items ──── notifications            │
│                                                            │
│  Auth: email/password + GitHub OAuth                       │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                        │
│                                                            │
│  Pages:           Components:         Libs:                │
│  / (Dashboard)    TrendCard           api.ts (axios)       │
│  /trends/[id]     ScoreGauge          auth.ts (supabase)   │
│  /compare         WatchButton                              │
│  /watchlist        LoadingSkeleton                          │
│  /login           Navbar, Toast                            │
└────────────────────────────────────────────────────────────┘

* Google Trends fetcher uses circuit breaker pattern (best-effort)
```

## Key Design Decisions

### 1. Polling over WebSocket
Data updates hourly via cron. WebSocket infrastructure would add complexity without proportional value on free-tier hosting.

### 2. Circuit Breaker for Google Trends
The `google-trends-api` npm package is unreliable. After 3 consecutive failures, the fetcher disables itself for 1 hour. The system operates normally with GitHub + Reddit only.

### 3. Promise.allSettled for Fetchers
Each platform fetcher runs independently. One failure doesn't block the others.

### 4. Composite Scoring Algorithm
```
score = (0.4 × popularity) + (0.3 × velocity) + (0.2 × engagement) + (0.1 × cross_platform)
```
All metrics normalized to 0-100 scale per platform before combining.

### 5. Service Role Key on Backend Only
The backend uses `SUPABASE_SERVICE_ROLE_KEY` for full DB access. The frontend uses only the anon key for auth operations.

## Database Schema

| Table | Purpose | Key Relationships |
|---|---|---|
| `trends` | Canonical trend records | PK, unique(slug, platform) |
| `trend_snapshots` | Time-series metric history | FK → trends |
| `trend_scores` | Computed composite scores | FK → trends |
| `users` | User profiles | PK = Supabase Auth UUID |
| `watchlist_items` | Saved trends | FK → users, FK → trends |
| `notifications` | Alert rules (Phase 7+) | FK → users, FK → trends |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Server + DB health check |
| GET | `/api/trends` | No | List trends (paginated, filtered) |
| GET | `/api/trends/top` | No | Top N by score |
| GET | `/api/trends/compare?ids=` | No | Compare 2-4 trends |
| GET | `/api/trends/:id` | No | Trend detail + history |
| POST | `/api/admin/fetch` | No | Manual pipeline trigger |
| GET | `/api/watchlist` | Yes | User's watchlist |
| POST | `/api/watchlist` | Yes | Add to watchlist |
| DELETE | `/api/watchlist/:trendId` | Yes | Remove from watchlist |
| GET | `/api/watchlist/check/:trendId` | Yes | Check if watched |

## Deployment Architecture

```
Vercel (Free)          Render (Free)         Supabase (Free)
┌──────────┐          ┌──────────┐          ┌──────────┐
│ Next.js  │──REST──▶│ Express  │──SQL───▶│PostgreSQL│
│ Frontend │          │ Backend  │          │ + Auth   │
└──────────┘          └──────────┘          └──────────┘
                           ▲
                      UptimeRobot
                      (keep-alive)
```

## Free-Tier Constraints

| Service | Limit | Mitigation |
|---|---|---|
| Render | Spins down after 15min idle | UptimeRobot pings every 5min |
| Supabase | 500MB DB, pauses after 7 days | Health check keeps it active |
| Reddit API | 100 QPM with OAuth | Fetch once per hour |
| GitHub API | 10 req/min (unauth) | Optional token for 30 req/min |
| Vercel | 100GB bandwidth/month | Sufficient for portfolio project |
