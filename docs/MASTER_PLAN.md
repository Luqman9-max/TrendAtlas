# TrendAtlas — Structured Master Plan

## Understanding

TrendAtlas is a real-time trend aggregation platform that pulls signals from Google Trends, GitHub, and Reddit, normalizes them into a unified scoring model, and presents them through an interactive dashboard. The core technical challenge is building a **reliable data pipeline on top of unreliable, unofficial data sources** — all within free-tier infrastructure that sleeps, pauses, and rate-limits. What separates this from a typical portfolio project is that every layer must handle failure gracefully: scrapers break, Render cold-starts at 30-60s, and Supabase pauses after inactivity. A successful v1 shows a live dashboard with real trend data updating on a schedule, a working comparison engine, and a score algorithm — not mocked data behind a pretty UI.

---

## System Architecture

### Data Flow

```
[Google Trends] ──┐
[GitHub Search ] ──┤──▶ Fetchers ──▶ Normalizer ──▶ PostgreSQL (Supabase)
[Reddit API    ] ──┘                                      │
                                                          ▼
                                              Express REST API
                                                          │
                                                          ▼
                                              Next.js Frontend
                                         (Dashboard / Detail / Compare)
```

### Backend Layers (Express)

```
routes/          → HTTP route definitions
controllers/     → Request handling, validation, response shaping
services/        → Business logic (scoring, comparison, insights)
fetchers/        → Platform-specific data retrieval (google, github, reddit)
normalizers/     → Raw data → unified TrendRecord format
jobs/            → node-cron scheduled tasks
db/              → Supabase client, query helpers
middleware/      → auth, error handling, rate limiting
utils/           → shared helpers
config/          → env vars, constants
```

### Frontend Structure (Next.js App Router)

```
app/
  layout.tsx         → Root layout, nav, theme
  page.tsx           → Dashboard (trend list + filters)
  trends/[id]/       → Trend detail page
  compare/           → Comparison page
  watchlist/         → User watchlist (auth-gated)
  login/             → Auth page
components/          → Reusable UI (TrendCard, ScoreGauge, Chart, etc.)
lib/
  api.ts             → Axios wrapper for backend
  auth.ts            → Supabase auth client
  utils.ts           → Formatters, helpers
hooks/               → Custom React hooks
```

### Database Schema (Supabase PostgreSQL)

| Table | Key Columns | Purpose |
|---|---|---|
| `trends` | `id`, `name`, `slug`, `platform`, `category`, `first_seen_at` | Canonical trend records |
| `trend_snapshots` | `id`, `trend_id` (FK), `score`, `raw_data` (JSONB), `fetched_at` | Time-series metric history |
| `trend_scores` | `id`, `trend_id` (FK), `composite_score`, `velocity`, `momentum`, `calculated_at` | Computed scores |
| `users` | `id` (Supabase Auth UUID), `email`, `preferences` (JSONB) | User profiles |
| `watchlist_items` | `id`, `user_id` (FK), `trend_id` (FK), `added_at` | Saved trends |
| `notifications` | `id`, `user_id` (FK), `trend_id` (FK), `type`, `threshold`, `triggered_at` | Alert config + history |

**Indexes:** `trend_snapshots(trend_id, fetched_at)`, `trends(slug)`, `trends(platform)`, `watchlist_items(user_id)`

### Real-Time Strategy: **Polling (not SSE/WebSocket)**

**Justification:** Data updates via cron every 30-60 min. True real-time is unnecessary and adds complexity. The frontend polls the API on page load + optional 5-min refresh interval. This is honest engineering — the data source cadence doesn't justify WebSocket overhead, especially on free-tier Render that spins down.

---

## Phase Breakdown

### Phase 0 — Foundation

**Goal:** Locked scope, initialized repos, validated project structure.

**Sub-tasks:**
1. Initialize git repo at `/Applications/XAMPP/xamppfiles/htdocs/TrendAtlas`
2. Create monorepo structure: `backend/` and `frontend/` directories
3. Initialize `backend/` with `npm init`, install Express, dotenv, cors
4. Initialize `frontend/` with `npx create-next-app@latest ./` (App Router, Tailwind, TypeScript)
5. Create `.env.example` files for both with all required vars documented
6. Create `.gitignore` covering node_modules, .env, .next, dist
7. Write initial `README.md` with architecture overview
8. Create `docs/` folder with this master plan

**Dependencies:** None
**Risks:** Tailwind version mismatch with Next.js — pin versions explicitly in package.json

---

### Phase 1 — Backend Core

**Goal:** Express server running with DB connection and health check endpoint.

**Sub-tasks:**
1. Set up Express app in `backend/src/index.js` with CORS, JSON parsing, error middleware
2. Create Supabase project, get connection string and anon key
3. Install `@supabase/supabase-js`, create `db/supabase.js` client
4. Write SQL migration for `trends` and `trend_snapshots` tables (run via Supabase SQL editor)
5. Create `GET /api/health` endpoint returning DB connectivity status
6. Create global error handler middleware that returns structured JSON errors
7. Add request logging middleware (simple console-based, no winston)
8. Test health endpoint locally

**Dependencies:** Phase 0 complete
**Risks:**
- Supabase project auto-pauses after 1 week inactivity — document the resume process
- Connection pooling: use Supabase client, not direct pg connections (free tier limits)

---

### Phase 2 — Data Pipeline

**Goal:** Automated fetchers pulling real data from 3 platforms, normalized and stored.

**Sub-tasks:**
1. Create `fetchers/github.js` — use GitHub Search API (`/search/repositories?q=created:>DATE&sort=stars`) with axios. No auth token needed for low-volume. Parse: repo name, stars, forks, language, description
2. Create `fetchers/reddit.js` — use Reddit OAuth (`/r/popular/hot.json`, `/r/technology/hot.json`). Register app at reddit.com/prefs/apps (script type). Parse: title, score, num_comments, subreddit, created_utc
3. Create `fetchers/google.js` — use `google-trends-api` npm package as best-effort. Wrap in try/catch with circuit breaker pattern. Parse: keyword, interest value, region. **Fallback:** if google-trends-api fails consistently, serve GitHub+Reddit data only and mark Google as degraded
4. Create `normalizers/index.js` — transform each platform's raw data into unified `TrendRecord`: `{ name, platform, category, raw_data, metrics: { popularity, growth, engagement } }`
5. Create `services/pipeline.js` — orchestrates: fetch → normalize → deduplicate by name+platform → upsert to `trends` table → insert `trend_snapshots`
6. Create `jobs/fetchTrends.js` — node-cron job running every 60 min (`0 * * * *`)
7. Add manual trigger endpoint `POST /api/admin/fetch` for development testing
8. Add per-fetcher error isolation — one platform failure must not block others

**Dependencies:** Phase 1 complete, Supabase tables created
**Risks:**
- **Google Trends scraping is unreliable** — the npm package may return 429s or empty data. Mitigation: circuit breaker with 3-strike disable, log failures, system works without it
- **Reddit OAuth setup** — requires manual app registration. Document exact steps in README

---

### Phase 3 — Trend Engine

**Goal:** Working score algorithm, comparison logic, and basic insights.

**Sub-tasks:**
1. Design composite score formula:
   ```
   score = (0.4 × normalized_popularity) + (0.3 × velocity) + (0.2 × engagement) + (0.1 × cross_platform_presence)
   ```
   - `normalized_popularity`: 0-100 scale per platform (percentile rank)
   - `velocity`: score change rate over last 3 snapshots
   - `engagement`: comments/forks ratio relative to platform average
   - `cross_platform_presence`: bonus if trend appears on 2+ platforms
2. Create `services/scoring.js` — computes and stores scores in `trend_scores` table
3. Create `services/compare.js` — accepts 2-4 trend IDs, returns aligned time-series data for overlay charts
4. Create `services/insights.js` — rule-based generator:
   - "Rising fast" if velocity > 2× average
   - "Cross-platform" if present on 2+ platforms
   - "Cooling down" if velocity negative for 3+ snapshots
5. Add scoring to pipeline: runs after each fetch cycle
6. Create API endpoints:
   - `GET /api/trends` — list with pagination, sort by score, filter by platform/category
   - `GET /api/trends/:id` — detail with snapshot history
   - `GET /api/trends/compare?ids=1,2,3` — comparison data
   - `GET /api/trends/top` — top 10 by composite score

**Dependencies:** Phase 2 complete with data in DB
**Risks:**
- Score algorithm needs tuning with real data — start simple, iterate
- Comparison requires aligned timestamps — use `fetched_at` bucketed to nearest hour

---

### Phase 4 — Frontend Setup

**Goal:** Next.js app with design system, layout, and API client ready.

**Sub-tasks:**
1. Configure Tailwind with custom theme: dark mode default, color palette (slate/zinc base, emerald/cyan accents)
2. Install and configure Recharts
3. Create root layout with responsive nav (sidebar on desktop, bottom nav on mobile)
4. Create `lib/api.ts` — axios instance with `NEXT_PUBLIC_API_URL` base, error interceptor
5. Create shared components: `TrendCard`, `ScoreGauge` (circular progress), `LoadingSkeleton`, `ErrorState`, `EmptyState`
6. Set up Inter font from Google Fonts
7. Create `hooks/useTrends.ts` — data fetching hook with loading/error states

**Dependencies:** Phase 3 API endpoints working
**Risks:**
- Render cold start (30-60s) will cause timeout on first API call — add loading state with "server waking up" message
- CORS must be configured in backend before frontend can connect

---

### Phase 5 — Core UI

**Goal:** Dashboard, detail page, and compare page fully functional.

**Sub-tasks:**
1. **Dashboard (`app/page.tsx`):** Grid of TrendCards, filter bar (platform, category, time range), sort dropdown (score, velocity, recent), search input with debounce
2. **Detail page (`app/trends/[id]/page.tsx`):** Hero section with current score + gauge, line chart of score history (Recharts), metadata (platform, category, first seen), insights badges, raw metrics table
3. **Compare page (`app/compare/page.tsx`):** Multi-select trend picker (search + add), overlay line chart with legend, side-by-side metric cards, shareable URL via query params (`?ids=1,2,3`)
4. Implement responsive breakpoints: single column mobile, 2-col tablet, 3-col desktop
5. Add page transitions and skeleton loading states

**Dependencies:** Phase 4 components ready, Phase 3 APIs returning data
**Risks:**
- Recharts responsive container can break on SSR — use dynamic import with `ssr: false`
- Empty state on first load if pipeline hasn't run yet — show onboarding message

---

### Phase 6 — Authentication

**Goal:** Users can sign up, log in, and access protected features.

**Sub-tasks:**
1. Set up Supabase Auth (email/password + GitHub OAuth provider)
2. Create `lib/auth.ts` — Supabase client-side auth helpers (signIn, signUp, signOut, getSession)
3. Create `app/login/page.tsx` — auth form with email/password + OAuth button
4. Create auth middleware in backend — verify Supabase JWT on protected routes
5. Create `middleware.ts` in Next.js — redirect unauthenticated users from protected pages
6. Create `users` table entry on first login via Supabase trigger or backend hook
7. Add user avatar/menu to nav bar when authenticated

**Dependencies:** Phase 5 complete (core pages working without auth)
**Risks:**
- Supabase Auth JWT verification in Express requires `jsonwebtoken` + Supabase JWT secret
- Session refresh handling — use Supabase `onAuthStateChange` listener

---

### Phase 7 — User Features

**Goal:** Watchlist and notifications working for authenticated users.

**Sub-tasks:**
1. Create `watchlist_items` table migration
2. Backend endpoints: `GET/POST/DELETE /api/watchlist`
3. Create `app/watchlist/page.tsx` — grid of watched trends with remove button
4. Add "Watch" toggle button to TrendCard and detail page
5. Create `notifications` table migration
6. Backend endpoints: `GET/POST/DELETE /api/notifications` — CRUD for alert rules
7. Create `services/notificationChecker.js` — runs after scoring, checks thresholds, marks triggered
8. Notification bell icon in nav with unread count badge
9. Simple notification preferences panel

**Dependencies:** Phase 6 auth working
**Risks:**
- No push notifications on free tier — notifications are in-app only (poll on page load)
- Notification checker must be efficient — batch query, not per-user loops

---

### Phase 8 — Advanced Features

**Goal:** Geographic visualization and analytics dashboard.

**Sub-tasks:**
1. **Global trend map:** Use `react-simple-maps` (free, lightweight) with TopoJSON world data. Color countries by trend concentration. Data source: Google Trends region data (if available) or Reddit subreddit geo-inference
2. Create `app/map/page.tsx` with interactive map, tooltip on hover showing top trends per region
3. **Analytics dashboard:** `app/analytics/page.tsx` — platform distribution pie chart, trend velocity histogram, top movers leaderboard, score distribution over time
4. **Trend prediction (optional):** Simple linear regression on score history using last 7 data points. Display as dashed line extension on detail chart. Use basic math — no ML library needed

**Dependencies:** Phase 7 complete, sufficient historical data
**Risks:**
- Geographic data may be sparse — default to showing platform-level aggregations if geo data unavailable
- `react-simple-maps` bundle size — lazy load the map page

---

### Phase 9 — Polish

**Goal:** Production-quality UX across all pages.

**Sub-tasks:**
1. Add skeleton loading states to every data-dependent component
2. Add error boundaries with retry buttons
3. Add empty states with illustrations for: no trends, no watchlist items, no notifications
4. Responsive audit: test all pages at 320px, 768px, 1024px, 1440px
5. Add page metadata (title, description) for every route
6. Keyboard navigation audit for accessibility
7. Add subtle animations: card hover lift, page fade-in, chart draw animation
8. Toast notifications for user actions (added to watchlist, alert created)
9. Dark/light mode toggle (default dark)

**Dependencies:** Phase 8 complete
**Risks:**
- Animation performance on low-end devices — use CSS transforms only, avoid JS animations
- Accessibility often missed — allocate explicit time

---

### Phase 10 — Deployment

**Goal:** App live on Vercel + Render at $0/month.

**Sub-tasks:**
1. Deploy backend to Render: create Web Service, set env vars (SUPABASE_URL, SUPABASE_KEY, REDDIT_CLIENT_ID, etc.), set build command `npm install`, start command `node src/index.js`
2. Deploy frontend to Vercel: connect GitHub repo, set `frontend/` as root directory, set `NEXT_PUBLIC_API_URL` env var to Render URL
3. Configure CORS in backend to allow Vercel domain
4. Set up UptimeRobot (free) to ping backend `/api/health` every 14 min to prevent Render spin-down
5. Test full flow: page load → API call → data returned
6. Set up Supabase cron (or keep node-cron on Render) — verify cron runs even with keep-alive
7. Document all env vars and deployment steps in README

**Dependencies:** Phase 9 complete
**Risks:**
- **Render cold starts** — even with UptimeRobot, first request after sleep takes 30-60s. UptimeRobot free tier pings every 5 min which should keep it alive
- **Supabase pause** — if no API calls for 7 days, project pauses. UptimeRobot health check that hits Supabase prevents this

---

### Phase 11 — Testing

**Goal:** Confidence that core flows work and data integrity is maintained.

**Sub-tasks:**
1. Backend API tests using `jest` + `supertest`: health check, trends CRUD, compare endpoint, auth-protected routes
2. Pipeline tests: mock fetcher responses, verify normalizer output shape, verify deduplication logic
3. Score algorithm unit tests: known inputs → expected outputs
4. Frontend: manual test script documenting each flow (login → dashboard → detail → compare → watchlist)
5. Data integrity checks: no orphaned snapshots, no duplicate trends per platform
6. Error scenario tests: simulate fetcher failure, verify graceful degradation

**Dependencies:** Phase 10 deployed
**Risks:**
- Testing against live Supabase can pollute data — use separate Supabase project or test prefix
- Time pressure often causes testing to be skipped — keep scope minimal but real

---

### Phase 12 — Finalization

**Goal:** Demo-ready with documentation and seed data.

**Sub-tasks:**
1. Create seed script: runs pipeline once, populates DB with real data for demo
2. Write comprehensive README: architecture diagram, setup instructions, env var docs, screenshots
3. Create `ARCHITECTURE.md` with system design decisions and tradeoffs
4. Record 2-min demo video or create screenshot walkthrough
5. Final pass: remove console.logs, dead code, TODO comments
6. Tag v1.0 release

**Dependencies:** Phase 11 tests passing
**Risks:**
- Seed data goes stale — document how to re-seed
- README is often an afterthought — write it as if it's the product landing page

---

## Risks and Challenges

| # | Risk | What Could Go Wrong | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Google Trends scraping breaks** | `google-trends-api` returns 429s or empty responses permanently | High | Circuit breaker pattern. System works with 2/3 sources. Mark Google as "degraded" in UI. Don't make it a hard dependency. |
| 2 | **Render cold starts** | First visitor waits 30-60s, thinks app is broken | High | UptimeRobot keep-alive pings every 5 min. Add "warming up" loading state in frontend with messaging. |
| 3 | **Supabase auto-pause** | DB goes offline after 7 days inactivity, all API calls fail | High | UptimeRobot health check hits `/api/health` which queries DB. Document manual resume process. |
| 4 | **Reddit API auth complexity** | OAuth setup requires manual app registration, tokens expire | Medium | Document exact registration steps with screenshots. Use refresh token flow. Fallback: scrape Reddit JSON endpoints without auth (10 QPM limit). |
| 5 | **Data deduplication across platforms** | Same trend (e.g., "AI") appears as separate entries from each platform | Medium | Normalize trend names to lowercase slugs. Fuzzy match optional in v2. For MVP, same-name trends from different platforms are separate records with `cross_platform_presence` bonus in scoring. |
| 6 | **Supabase 500MB storage limit** | Trend snapshots accumulate and hit storage cap | Medium | Retention policy: delete snapshots older than 90 days via weekly cron job. Monitor storage via Supabase dashboard. |
| 7 | **GitHub API rate limiting** | Unauthenticated: 10 req/min. Pipeline may hit limits with frequent fetches | Low | Use authenticated requests (personal access token, free). Cache responses. Fetch once per hour is well within limits. |

---

## Optimization and Suggestions

### MVP Scope (v1.0)

**IN:**
- Dashboard with real trend data from GitHub + Reddit (Google Trends best-effort)
- Trend detail page with score history chart
- Comparison page (2-4 trends)
- Composite scoring algorithm
- Scheduled data pipeline (hourly)
- Supabase Auth (email + GitHub OAuth)
- Watchlist
- Responsive design, dark mode
- Deployed on Vercel + Render

**OUT of v1.0:**
- Global trend map (Phase 8 — move to v1.1)
- Notifications system (simplify to v1.1)
- Trend prediction
- Insight generator (include basic badges only)
- Advanced analytics dashboard

### Architecture Improvements

1. **Add `bull` or simple in-memory job queue** — if one fetcher hangs, it shouldn't block others. Use `Promise.allSettled()` at minimum for parallel fetcher execution
2. **API response caching with `node-cache`** (free, in-memory) — cache trend list for 5 min to reduce DB queries during traffic spikes. Add only after pipeline is stable
3. **Database connection via Supabase REST API** instead of direct PostgreSQL — avoids connection pooling issues on free tier, and the JS client already uses REST
4. **Next.js ISR (Incremental Static Regeneration)** — cache dashboard page for 5 min at the edge. Reduces API load and handles Render cold starts gracefully
5. **Structured logging with `pino`** (lightweight) — replace console.log before deployment for better debugging on Render

### Stack Additions

| Tool | Purpose | Cost |
|---|---|---|
| `react-simple-maps` | Geographic visualization (Phase 8) | Free |
| `node-cache` | In-memory API response caching | Free |
| `pino` | Structured JSON logging | Free |
| UptimeRobot | Keep-alive pings + uptime monitoring | Free tier |

### High-Impact Feature to Prioritize

**Trend Comparison Page** — this is the single feature that most differentiates TrendAtlas from a basic dashboard. Overlay charts showing multiple trends' trajectories over time demonstrate data engineering depth (aligned time-series), frontend skill (interactive multi-line Recharts), and product thinking (useful for real decision-making). It's visually impressive in screenshots and demos.

### Feature to Cut

**Trend Prediction** — linear regression on noisy, hourly trend data with only days of history produces meaningless predictions. It adds complexity (math, chart rendering, explanation UI) without proportional value. A "velocity" indicator (trending up/down/stable) communicates the same insight more honestly and is already part of the scoring algorithm.

---

## Next Steps

**Action 1:** Create the monorepo structure — initialize `backend/` with Express boilerplate (index.js, folder structure, package.json with pinned dependencies) and `frontend/` with `npx create-next-app@latest` using App Router + Tailwind + TypeScript.

**Action 2:** Create a Supabase project, run the initial SQL migration (create `trends`, `trend_snapshots`, `trend_scores` tables with indexes), and verify connectivity from a local Express health check endpoint.

**Action 3:** Register a Reddit API application at `reddit.com/prefs/apps` (script type), obtain client_id and client_secret, and test a basic OAuth token exchange + `/r/popular/hot.json` fetch to validate the data pipeline's most complex auth flow before writing any fetcher code.

### Phase 0 Complete Checklist

- [ ] Git repo initialized with `.gitignore`
- [ ] `backend/` has Express running on port 3001, returns `{ status: "ok" }` on `GET /api/health`
- [ ] `frontend/` has Next.js running on port 3000, shows a styled landing placeholder
- [ ] `.env.example` files document all required environment variables
- [ ] Supabase project created, core tables exist, connection verified from backend
- [ ] Reddit API app registered, test fetch succeeds
- [ ] `README.md` has project overview, setup instructions, and architecture summary
- [ ] This master plan is saved in `docs/MASTER_PLAN.md`
