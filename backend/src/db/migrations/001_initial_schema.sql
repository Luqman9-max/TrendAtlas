-- =============================================================================
-- TrendAtlas — Database Schema Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. trends — Canonical trend records (one per trend per platform)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trends (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  platform      TEXT NOT NULL CHECK (platform IN ('github', 'reddit', 'google')),
  category      TEXT DEFAULT 'general',
  url           TEXT,
  description   TEXT,
  metadata      JSONB DEFAULT '{}',
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(slug, platform)
);

CREATE INDEX IF NOT EXISTS idx_trends_slug ON trends(slug);
CREATE INDEX IF NOT EXISTS idx_trends_platform ON trends(platform);
CREATE INDEX IF NOT EXISTS idx_trends_category ON trends(category);

-- ---------------------------------------------------------------------------
-- 2. trend_snapshots — Time-series metric history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trend_snapshots (
  id         BIGSERIAL PRIMARY KEY,
  trend_id   BIGINT NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  raw_data   JSONB NOT NULL DEFAULT '{}',
  metrics    JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_trend_fetched
  ON trend_snapshots(trend_id, fetched_at DESC);

-- ---------------------------------------------------------------------------
-- 3. trend_scores — Computed composite scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trend_scores (
  id              BIGSERIAL PRIMARY KEY,
  trend_id        BIGINT NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  composite_score REAL NOT NULL DEFAULT 0,
  popularity      REAL DEFAULT 0,
  velocity        REAL DEFAULT 0,
  engagement      REAL DEFAULT 0,
  cross_platform  REAL DEFAULT 0,
  calculated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_trend_calculated
  ON trend_scores(trend_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_composite
  ON trend_scores(composite_score DESC);

-- ---------------------------------------------------------------------------
-- 4. users — Extended user profiles (Supabase Auth handles actual auth)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY,  -- matches Supabase Auth user ID
  email       TEXT,
  display_name TEXT,
  preferences JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. watchlist_items — User-saved trends
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS watchlist_items (
  id        BIGSERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trend_id  BIGINT NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  added_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, trend_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist_items(user_id);

-- ---------------------------------------------------------------------------
-- 6. notifications — Alert rules and trigger history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trend_id     BIGINT NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('score_above', 'score_below', 'velocity_spike')),
  threshold    REAL NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ---------------------------------------------------------------------------
-- Helper: auto-update updated_at timestamp
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trends_updated_at
  BEFORE UPDATE ON trends
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
