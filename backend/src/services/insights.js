/**
 * Insights Service
 *
 * Rule-based insight generator. No LLM — just pattern detection on metrics.
 * Produces short text badges/labels for trend cards and detail pages.
 */

/**
 * Generate insights for a trend based on its score and snapshot history.
 * @param {Object} score - Latest trend_scores record
 * @param {Array} snapshots - Recent snapshots (newest first)
 * @returns {Array} List of insight objects { type, label, description }
 */
function generateInsights(score, snapshots = []) {
  const insights = [];

  if (!score) return insights;

  // 1. Rising Fast — velocity significantly above neutral (50)
  if (score.velocity > 75) {
    insights.push({
      type: 'rising',
      label: '🚀 Rising Fast',
      description: 'This trend is gaining momentum rapidly',
    });
  }

  // 2. Cooling Down — velocity below neutral for recent period
  if (score.velocity < 30) {
    insights.push({
      type: 'cooling',
      label: '📉 Cooling Down',
      description: 'Interest in this trend is declining',
    });
  }

  // 3. Cross-Platform — appears on multiple platforms
  if (score.cross_platform >= 50) {
    const platformCount = score.cross_platform >= 100 ? 3 : 2;
    insights.push({
      type: 'cross_platform',
      label: `🌐 ${platformCount} Platforms`,
      description: `Trending across ${platformCount} platforms simultaneously`,
    });
  }

  // 4. High Engagement — strong community interaction
  if (score.engagement > 70) {
    insights.push({
      type: 'high_engagement',
      label: '💬 High Engagement',
      description: 'Strong community discussion and interaction',
    });
  }

  // 5. Top Performer — composite score in the top tier
  if (score.composite_score > 80) {
    insights.push({
      type: 'top_performer',
      label: '⭐ Top Performer',
      description: 'One of the highest-scoring trends right now',
    });
  }

  // 6. New Entry — first seen recently (< 24h of snapshots)
  if (snapshots.length <= 2) {
    insights.push({
      type: 'new',
      label: '🆕 New Entry',
      description: 'Recently appeared in our tracking',
    });
  }

  // 7. Stable — low velocity variance, consistent interest
  if (score.velocity >= 45 && score.velocity <= 55 && snapshots.length > 3) {
    insights.push({
      type: 'stable',
      label: '📊 Stable',
      description: 'Consistent level of interest over time',
    });
  }

  return insights;
}

module.exports = { generateInsights };
