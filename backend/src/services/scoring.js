const { supabase } = require('../db/supabase');
const { SCORE_WEIGHTS } = require('../config/constants');

/**
 * Scoring Service
 *
 * Computes a composite trend score from normalized metrics + historical velocity.
 *
 * Formula:
 *   composite = (W_pop × popularity) + (W_vel × velocity) + (W_eng × engagement) + (W_cp × crossPlatform)
 *
 * Weights defined in config/constants.js:
 *   popularity: 0.4, velocity: 0.3, engagement: 0.2, crossPlatform: 0.1
 */

/**
 * Calculate and store scores for all trends that have recent snapshots.
 * @returns {number} Number of trends scored
 */
async function scoreAllTrends() {
  // Get all trends
  const { data: trends, error } = await supabase
    .from('trends')
    .select('id, slug, platform');

  if (error || !trends) {
    console.error('[Scoring] Failed to fetch trends:', error?.message);
    return 0;
  }

  let scored = 0;

  for (const trend of trends) {
    try {
      const score = await computeScore(trend.id, trend.slug);
      if (score) {
        await storeScore(trend.id, score);
        scored++;
      }
    } catch (err) {
      console.warn(`[Scoring] Error scoring trend ${trend.id}: ${err.message}`);
    }
  }

  console.log(`[Scoring] Scored ${scored}/${trends.length} trends`);
  return scored;
}

/**
 * Compute score for a single trend.
 */
async function computeScore(trendId, slug) {
  // Get the last 5 snapshots for velocity calculation
  const { data: snapshots, error } = await supabase
    .from('trend_snapshots')
    .select('metrics, fetched_at')
    .eq('trend_id', trendId)
    .order('fetched_at', { ascending: false })
    .limit(5);

  if (error || !snapshots || snapshots.length === 0) return null;

  const latest = snapshots[0].metrics;

  // Base metrics from latest snapshot
  const popularity = latest.popularity || 0;
  const engagement = latest.engagement || 0;

  // Velocity: rate of popularity change over recent snapshots
  const velocity = calculateVelocity(snapshots);

  // Cross-platform presence: check if same slug exists on other platforms
  const crossPlatform = await calculateCrossPlatform(slug);

  // Composite score
  const composite =
    SCORE_WEIGHTS.popularity * popularity +
    SCORE_WEIGHTS.velocity * velocity +
    SCORE_WEIGHTS.engagement * engagement +
    SCORE_WEIGHTS.crossPlatform * crossPlatform;

  return {
    compositeScore: Math.round(composite * 100) / 100,
    popularity,
    velocity: Math.round(velocity * 100) / 100,
    engagement,
    crossPlatform,
  };
}

/**
 * Calculate velocity from snapshot history.
 * Velocity = average change in popularity over recent snapshots, scaled to 0-100.
 */
function calculateVelocity(snapshots) {
  if (snapshots.length < 2) return 50; // Neutral if insufficient data

  const popularities = snapshots.map((s) => s.metrics.popularity || 0);

  // Calculate average delta
  let totalDelta = 0;
  for (let i = 0; i < popularities.length - 1; i++) {
    totalDelta += popularities[i] - popularities[i + 1]; // newer - older
  }
  const avgDelta = totalDelta / (popularities.length - 1);

  // Scale: -50 to +50 delta maps to 0-100
  return Math.max(0, Math.min(100, 50 + avgDelta));
}

/**
 * Check how many platforms have a trend with a similar slug.
 * Returns 0 (single platform), 50 (2 platforms), or 100 (3 platforms).
 */
async function calculateCrossPlatform(slug) {
  // Extract base name from slug (remove platform prefix like "reddit-" or "google-")
  const baseName = slug
    .replace(/^(reddit|google|github)-/, '')
    .replace(/-/g, ' ')
    .toLowerCase()
    .trim();

  if (!baseName || baseName.length < 3) return 0;

  // Search for similar trend names across platforms
  const { data, error } = await supabase
    .from('trends')
    .select('platform')
    .ilike('name', `%${baseName}%`);

  if (error || !data) return 0;

  const uniquePlatforms = new Set(data.map((d) => d.platform));
  const count = uniquePlatforms.size;

  if (count >= 3) return 100;
  if (count >= 2) return 50;
  return 0;
}

/**
 * Store computed score.
 */
async function storeScore(trendId, score) {
  const { error } = await supabase.from('trend_scores').insert({
    trend_id: trendId,
    composite_score: score.compositeScore,
    popularity: score.popularity,
    velocity: score.velocity,
    engagement: score.engagement,
    cross_platform: score.crossPlatform,
  });

  if (error) {
    console.warn(`[Scoring] Failed to store score for trend ${trendId}: ${error.message}`);
  }
}

module.exports = { scoreAllTrends, computeScore };
