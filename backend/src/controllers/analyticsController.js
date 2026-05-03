const { supabase } = require('../db/supabase');

/**
 * GET /api/analytics
 * Returns system-wide analytics for the dashboard.
 */
async function getAnalytics(req, res, next) {
  try {
    // 1. Total trends count & platform breakdown
    const { data: trendsData, error: trendsError } = await supabase
      .from('trends')
      .select('platform, category, id');

    if (trendsError) throw trendsError;

    const platformCounts = { github: 0, reddit: 0, google: 0 };
    const categoryCounts = {};
    const totalTrends = trendsData.length;

    trendsData.forEach((t) => {
      if (platformCounts[t.platform] !== undefined) {
        platformCounts[t.platform]++;
      }
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });

    // 2. Average scores
    const { data: scoresData, error: scoresError } = await supabase
      .from('trend_scores')
      .select('composite_score, trends(platform)');

    if (scoresError) throw scoresError;

    let totalScore = 0;
    const platformScores = { github: { total: 0, count: 0 }, reddit: { total: 0, count: 0 }, google: { total: 0, count: 0 } };

    scoresData.forEach((s) => {
      totalScore += s.composite_score;
      const platform = s.trends?.platform;
      if (platform && platformScores[platform]) {
        platformScores[platform].total += s.composite_score;
        platformScores[platform].count++;
      }
    });

    const averageScore = scoresData.length > 0 ? totalScore / scoresData.length : 0;
    const platformAverages = {
      github: platformScores.github.count > 0 ? platformScores.github.total / platformScores.github.count : 0,
      reddit: platformScores.reddit.count > 0 ? platformScores.reddit.total / platformScores.reddit.count : 0,
      google: platformScores.google.count > 0 ? platformScores.google.total / platformScores.google.count : 0,
    };

    // Format output
    res.json({
      data: {
        totalTrends,
        averageScore: Math.round(averageScore * 100) / 100,
        platformCounts,
        platformAverages: {
          github: Math.round(platformAverages.github * 100) / 100,
          reddit: Math.round(platformAverages.reddit * 100) / 100,
          google: Math.round(platformAverages.google * 100) / 100,
        },
        categoryCounts,
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAnalytics };
