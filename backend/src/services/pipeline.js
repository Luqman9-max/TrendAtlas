const { supabase } = require('../db/supabase');
const { fetchGitHubTrends, fetchRedditTrends, fetchGoogleTrends } = require('../fetchers');
const { normalizeTrends } = require('../normalizers');
const { scoreAllTrends } = require('./scoring');

/**
 * Pipeline Service
 *
 * Orchestrates the full data flow:
 *   fetch (all platforms) → normalize → deduplicate → upsert trends → insert snapshots
 *
 * Design decisions:
 *   - Uses Promise.allSettled so one platform failure doesn't block others
 *   - Deduplication is by (slug, platform) unique constraint
 *   - Each run produces fresh snapshots for time-series tracking
 */

/**
 * Run the full data pipeline.
 * @returns {Object} Summary of what was fetched and stored
 */
async function runPipeline() {
  const startTime = Date.now();
  const summary = {
    github: { fetched: 0, stored: 0, error: null },
    reddit: { fetched: 0, stored: 0, error: null },
    google: { fetched: 0, stored: 0, error: null },
    duration: 0,
  };

  console.log('[Pipeline] Starting data fetch cycle...');

  // 1. Fetch from all platforms in parallel
  const [githubResult, redditResult, googleResult] = await Promise.allSettled([
    fetchGitHubTrends(),
    fetchRedditTrends(),
    fetchGoogleTrends(),
  ]);

  // 2. Process each platform's results
  const platformResults = [
    { key: 'github', result: githubResult },
    { key: 'reddit', result: redditResult },
    { key: 'google', result: googleResult },
  ];

  for (const { key, result } of platformResults) {
    if (result.status === 'rejected') {
      summary[key].error = result.reason?.message || 'Unknown error';
      console.error(`[Pipeline] ${key} fetch failed:`, summary[key].error);
      continue;
    }

    const rawItems = result.value;
    summary[key].fetched = rawItems.length;

    if (rawItems.length === 0) {
      console.log(`[Pipeline] ${key}: no items returned`);
      continue;
    }

    // 3. Normalize
    const normalized = normalizeTrends(rawItems);

    // 4. Upsert trends and insert snapshots
    const stored = await storeTrends(normalized);
    summary[key].stored = stored;

    console.log(`[Pipeline] ${key}: ${rawItems.length} fetched, ${stored} stored`);
  }

  // 5. Run scoring engine on all trends
  console.log('[Pipeline] Running scoring engine...');
  try {
    summary.scored = await scoreAllTrends();
  } catch (err) {
    console.error('[Pipeline] Scoring failed:', err.message);
    summary.scored = 0;
  }

  summary.duration = Date.now() - startTime;
  console.log(`[Pipeline] Cycle complete in ${summary.duration}ms`);

  return summary;
}

/**
 * Upsert trend records and create snapshots.
 * @param {Array} items - Normalized trend items
 * @returns {number} Number of items successfully stored
 */
async function storeTrends(items) {
  let storedCount = 0;

  for (const item of items) {
    try {
      // Upsert the trend record (insert or update on slug+platform conflict)
      const { data: trend, error: trendError } = await supabase
        .from('trends')
        .upsert(
          {
            name: item.name,
            slug: item.slug,
            platform: item.platform,
            category: item.category || 'general',
            url: item.url || null,
            description: item.description || null,
            metadata: item.rawData || {},
          },
          { onConflict: 'slug,platform' }
        )
        .select('id')
        .single();

      if (trendError) {
        console.warn(`[Pipeline] Failed to upsert trend "${item.name}": ${trendError.message}`);
        continue;
      }

      // Insert a new snapshot for time-series tracking
      const { error: snapError } = await supabase
        .from('trend_snapshots')
        .insert({
          trend_id: trend.id,
          raw_data: item.rawData || {},
          metrics: item.normalizedMetrics || {},
        });

      if (snapError) {
        console.warn(`[Pipeline] Failed to insert snapshot for "${item.name}": ${snapError.message}`);
        continue;
      }

      storedCount++;
    } catch (err) {
      console.warn(`[Pipeline] Error storing "${item.name}": ${err.message}`);
    }
  }

  return storedCount;
}

/**
 * Get the status of the last pipeline run (for the health/admin endpoint).
 */
async function getPipelineStatus() {
  const { data, error } = await supabase
    .from('trend_snapshots')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  return {
    lastRun: data?.fetched_at || null,
    error: error?.message || null,
  };
}

module.exports = { runPipeline, getPipelineStatus };
