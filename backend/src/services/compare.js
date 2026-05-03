const { supabase } = require('../db/supabase');

/**
 * Compare Service
 *
 * Returns aligned time-series data for 2-4 trends so the frontend
 * can render overlay line charts.
 */

/**
 * Get comparison data for multiple trends.
 * @param {number[]} trendIds - Array of 2-4 trend IDs
 * @param {number} limit - Max snapshots per trend (default 30)
 * @returns {Object} Comparison data with aligned series
 */
async function compareTrends(trendIds, limit = 30) {
  if (!trendIds || trendIds.length < 2 || trendIds.length > 4) {
    throw Object.assign(new Error('Provide 2 to 4 trend IDs for comparison'), { statusCode: 400 });
  }

  // Fetch trend metadata
  const { data: trends, error: trendError } = await supabase
    .from('trends')
    .select('id, name, slug, platform, category')
    .in('id', trendIds);

  if (trendError) throw trendError;
  if (!trends || trends.length === 0) {
    throw Object.assign(new Error('No trends found for provided IDs'), { statusCode: 404 });
  }

  // Fetch snapshots for each trend
  const series = {};
  for (const trend of trends) {
    const { data: snapshots, error: snapError } = await supabase
      .from('trend_snapshots')
      .select('metrics, fetched_at')
      .eq('trend_id', trend.id)
      .order('fetched_at', { ascending: true })
      .limit(limit);

    if (snapError) {
      console.warn(`[Compare] Error fetching snapshots for trend ${trend.id}: ${snapError.message}`);
      series[trend.id] = [];
      continue;
    }

    series[trend.id] = (snapshots || []).map((s) => ({
      timestamp: s.fetched_at,
      popularity: s.metrics?.popularity || 0,
      growth: s.metrics?.growth || 0,
      engagement: s.metrics?.engagement || 0,
    }));
  }

  // Get latest scores for each trend
  const scores = {};
  for (const trend of trends) {
    const { data: score } = await supabase
      .from('trend_scores')
      .select('composite_score, popularity, velocity, engagement, cross_platform')
      .eq('trend_id', trend.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    scores[trend.id] = score || null;
  }

  return {
    trends: trends.map((t) => ({
      ...t,
      latestScore: scores[t.id],
    })),
    series,
  };
}

module.exports = { compareTrends };
