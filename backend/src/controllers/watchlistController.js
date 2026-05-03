const { supabase } = require('../db/supabase');

/**
 * GET /api/watchlist
 * Get the authenticated user's watchlist with trend details and scores.
 */
async function getWatchlist(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('watchlist_items')
      .select(`
        id, added_at,
        trends (id, name, slug, platform, category, url, description,
          trend_scores (composite_score, popularity, velocity, engagement, cross_platform, calculated_at)
        )
      `)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) throw error;

    // Flatten: extract trend + latest score
    const items = (data || []).map((item) => {
      const trend = item.trends;
      if (!trend) return null;

      const scores = trend.trend_scores || [];
      const latestScore = scores.sort(
        (a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime()
      )[0] || null;

      const { trend_scores, ...trendData } = trend;
      return {
        watchlistId: item.id,
        addedAt: item.added_at,
        ...trendData,
        score: latestScore,
      };
    }).filter(Boolean);

    res.json({ data: items });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/watchlist
 * Add a trend to the user's watchlist.
 * Body: { trendId: number }
 */
async function addToWatchlist(req, res, next) {
  try {
    const userId = req.user.id;
    const { trendId } = req.body;

    if (!trendId) {
      return res.status(400).json({ error: 'trendId is required' });
    }

    // Ensure user exists in users table
    await supabase.from('users').upsert(
      { id: userId, email: req.user.email },
      { onConflict: 'id' }
    );

    const { data, error } = await supabase
      .from('watchlist_items')
      .insert({ user_id: userId, trend_id: trendId })
      .select('id, added_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Already in watchlist' });
      }
      throw error;
    }

    res.status(201).json({ message: 'Added to watchlist', data });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/watchlist/:trendId
 * Remove a trend from the user's watchlist.
 */
async function removeFromWatchlist(req, res, next) {
  try {
    const userId = req.user.id;
    const { trendId } = req.params;

    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('user_id', userId)
      .eq('trend_id', trendId);

    if (error) throw error;

    res.json({ message: 'Removed from watchlist' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/watchlist/check/:trendId
 * Check if a trend is in the user's watchlist.
 */
async function checkWatchlist(req, res, next) {
  try {
    const userId = req.user.id;
    const { trendId } = req.params;

    const { data, error } = await supabase
      .from('watchlist_items')
      .select('id')
      .eq('user_id', userId)
      .eq('trend_id', trendId)
      .maybeSingle();

    if (error) throw error;

    res.json({ isWatched: !!data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist, checkWatchlist };
