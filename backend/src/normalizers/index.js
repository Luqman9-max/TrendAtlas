/**
 * Data Normalizer
 *
 * Transforms raw fetcher output into a unified format suitable for storage.
 * Each platform has different metric shapes — this module maps them to
 * a consistent { popularity, growth, engagement } metric set on a 0–100 scale.
 */

/**
 * Normalize a list of raw trend items from any platform.
 * @param {Array} items - Raw items from a fetcher
 * @returns {Array} Normalized trend records
 */
function normalizeTrends(items) {
  if (!items || items.length === 0) return [];

  // Determine platform from first item
  const platform = items[0]?.platform;

  switch (platform) {
    case 'github':
      return normalizeGitHub(items);
    case 'reddit':
      return normalizeReddit(items);
    case 'google':
      return normalizeGoogle(items);
    default:
      console.warn(`[Normalizer] Unknown platform: ${platform}`);
      return items;
  }
}

/**
 * GitHub: popularity = stars, engagement = forks/stars ratio, growth = recency
 */
function normalizeGitHub(items) {
  const maxStars = Math.max(...items.map((i) => i.metrics.stars), 1);

  return items.map((item) => {
    const { stars, forks, watchers, createdAt } = item.metrics;

    // Popularity: percentile based on stars within this batch
    const popularity = Math.round((stars / maxStars) * 100);

    // Engagement: fork-to-star ratio (higher = more community involvement)
    const forkRatio = stars > 0 ? forks / stars : 0;
    const engagement = Math.min(Math.round(forkRatio * 200), 100); // Cap at 100

    // Growth: how recently created (newer = higher growth signal)
    const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    const growth = Math.max(0, Math.round(100 - (ageHours / 168) * 100)); // 168h = 7 days

    return {
      ...item,
      normalizedMetrics: { popularity, growth, engagement },
    };
  });
}

/**
 * Reddit: popularity = score, engagement = comments/score ratio, growth = upvote ratio
 */
function normalizeReddit(items) {
  const maxScore = Math.max(...items.map((i) => i.metrics.score), 1);

  return items.map((item) => {
    const { score, numComments, upvoteRatio } = item.metrics;

    const popularity = Math.round((score / maxScore) * 100);

    // Engagement: comment-to-score ratio
    const commentRatio = score > 0 ? numComments / score : 0;
    const engagement = Math.min(Math.round(commentRatio * 100), 100);

    // Growth: upvote ratio as a signal of consensus/momentum
    const growth = Math.round((upvoteRatio || 0.5) * 100);

    return {
      ...item,
      normalizedMetrics: { popularity, growth, engagement },
    };
  });
}

/**
 * Google: popularity = traffic volume, engagement/growth are estimated
 */
function normalizeGoogle(items) {
  const maxTraffic = Math.max(
    ...items.map((i) => i.metrics.trafficValue || 0),
    1
  );

  return items.map((item) => {
    const { trafficValue, relatedQueries } = item.metrics;

    const popularity = Math.round(((trafficValue || 0) / maxTraffic) * 100);

    // Engagement: proxy via number of related queries
    const engagement = Math.min(
      Math.round(((relatedQueries?.length || 0) / 5) * 100),
      100
    );

    // Growth: Google daily trends are inherently "growing", default high
    const growth = 75;

    return {
      ...item,
      normalizedMetrics: { popularity, growth, engagement },
    };
  });
}

module.exports = { normalizeTrends };
