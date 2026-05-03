const { supabase } = require('../db/supabase');
const { compareTrends } = require('../services/compare');
const { generateInsights } = require('../services/insights');
const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');

/**
 * GET /api/trends
 * List trends with pagination, filtering, and sorting.
 */
async function listTrends(req, res, next) {
  try {
    const {
      page = 1,
      limit = DEFAULT_PAGE_SIZE,
      platform,
      category,
      sort = 'score',
      order = 'desc',
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(parseInt(limit) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = (pageNum - 1) * pageSize;

    // Build query — join trends with their latest score
    let query = supabase
      .from('trends')
      .select(`
        id, name, slug, platform, category, url, description, first_seen_at, updated_at,
        trend_scores (composite_score, popularity, velocity, engagement, cross_platform, calculated_at)
      `, { count: 'exact' });

    // Filters
    if (platform) query = query.eq('platform', platform);
    if (category) query = query.eq('category', category);
    if (search) query = query.ilike('name', `%${search}%`);

    // Sorting
    if (sort === 'score') {
      query = query.order('updated_at', { ascending: order === 'asc' });
    } else if (sort === 'name') {
      query = query.order('name', { ascending: order !== 'desc' });
    } else if (sort === 'recent') {
      query = query.order('first_seen_at', { ascending: false });
    } else {
      query = query.order('updated_at', { ascending: false });
    }

    // Pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Flatten: pick latest score per trend
    const trends = (data || []).map((trend) => {
      const scores = trend.trend_scores || [];
      // Sort scores by calculated_at desc and pick first
      const latestScore = scores.sort(
        (a, b) => new Date(b.calculated_at) - new Date(a.calculated_at)
      )[0] || null;

      const { trend_scores, ...trendData } = trend;
      return {
        ...trendData,
        score: latestScore,
      };
    });

    // Sort by composite score if requested (post-query since it's from a joined table)
    if (sort === 'score') {
      trends.sort((a, b) => {
        const sa = a.score?.composite_score || 0;
        const sb = b.score?.composite_score || 0;
        return order === 'asc' ? sa - sb : sb - sa;
      });
    }

    res.json({
      data: trends,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trends/top
 * Returns top N trends by composite score.
 */
async function getTopTrends(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const { data: scores, error } = await supabase
      .from('trend_scores')
      .select(`
        composite_score, popularity, velocity, engagement, cross_platform, calculated_at,
        trends (id, name, slug, platform, category, url, description)
      `)
      .order('composite_score', { ascending: false })
      .limit(limit * 3); // Over-fetch to deduplicate

    if (error) throw error;

    // Deduplicate: keep only the latest score per trend
    const seen = new Set();
    const topTrends = [];
    for (const entry of scores || []) {
      const trendId = entry.trends?.id;
      if (!trendId || seen.has(trendId)) continue;
      seen.add(trendId);
      topTrends.push({
        ...entry.trends,
        score: {
          composite_score: entry.composite_score,
          popularity: entry.popularity,
          velocity: entry.velocity,
          engagement: entry.engagement,
          cross_platform: entry.cross_platform,
          calculated_at: entry.calculated_at,
        },
      });
      if (topTrends.length >= limit) break;
    }

    res.json({ data: topTrends });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trends/compare?ids=1,2,3
 * Compare multiple trends side by side.
 */
async function handleCompareTrends(req, res, next) {
  try {
    const ids = (req.query.ids || '')
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    const result = await compareTrends(ids);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trends/:id
 * Get trend detail with snapshot history and insights.
 */
async function getTrendDetail(req, res, next) {
  try {
    const { id } = req.params;

    // Fetch trend
    const { data: trend, error: trendError } = await supabase
      .from('trends')
      .select('*')
      .eq('id', id)
      .single();

    if (trendError || !trend) {
      return res.status(404).json({ error: 'Trend not found' });
    }

    // Fetch snapshot history (last 30 entries)
    const { data: snapshots } = await supabase
      .from('trend_snapshots')
      .select('metrics, fetched_at')
      .eq('trend_id', id)
      .order('fetched_at', { ascending: true })
      .limit(30);

    // Fetch latest score
    const { data: score } = await supabase
      .from('trend_scores')
      .select('*')
      .eq('trend_id', id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch score history for chart
    const { data: scoreHistory } = await supabase
      .from('trend_scores')
      .select('composite_score, popularity, velocity, engagement, calculated_at')
      .eq('trend_id', id)
      .order('calculated_at', { ascending: true })
      .limit(30);

    // Generate insights
    const insights = generateInsights(score, snapshots);

    res.json({
      trend,
      score,
      scoreHistory: scoreHistory || [],
      snapshots: (snapshots || []).map((s) => ({
        ...s.metrics,
        timestamp: s.fetched_at,
      })),
      insights,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listTrends, getTopTrends, handleCompareTrends, getTrendDetail };
