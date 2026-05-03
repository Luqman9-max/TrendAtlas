/**
 * Google Trends Fetcher
 * Uses the `google-trends-api` npm package as best-effort.
 *
 * WARNING: This is an unofficial scraper and is known to be unreliable.
 * The system is designed to work without Google Trends data.
 * A circuit breaker pattern disables this fetcher after repeated failures.
 */

let googleTrends;
try {
  googleTrends = require('google-trends-api');
} catch {
  console.warn('[GoogleTrends] google-trends-api package not found. Google Trends fetcher disabled.');
  googleTrends = null;
}

// Circuit breaker state
let consecutiveFailures = 0;
const MAX_FAILURES = 3;
let circuitBrokenUntil = 0;

/**
 * Check if the circuit breaker is open (fetcher disabled).
 */
function isCircuitOpen() {
  if (Date.now() < circuitBrokenUntil) {
    return true;
  }
  // Reset after cooldown period
  if (circuitBrokenUntil > 0 && Date.now() >= circuitBrokenUntil) {
    consecutiveFailures = 0;
    circuitBrokenUntil = 0;
  }
  return false;
}

/**
 * Record a failure and potentially trip the circuit breaker.
 */
function recordFailure(error) {
  consecutiveFailures++;
  console.warn(`[GoogleTrends] Failure ${consecutiveFailures}/${MAX_FAILURES}: ${error.message}`);

  if (consecutiveFailures >= MAX_FAILURES) {
    // Disable for 1 hour
    circuitBrokenUntil = Date.now() + 60 * 60 * 1000;
    console.warn('[GoogleTrends] Circuit breaker OPEN. Disabled for 1 hour.');
  }
}

/**
 * Fetch daily trending searches from Google Trends.
 * @param {Object} options
 * @param {string} options.geo - Country code (default 'US')
 * @returns {Promise<Array>} Parsed trend data
 */
async function fetchGoogleTrends({ geo = 'US' } = {}) {
  if (!googleTrends) {
    console.warn('[GoogleTrends] Package not available. Skipping.');
    return [];
  }

  if (isCircuitOpen()) {
    console.warn('[GoogleTrends] Circuit breaker is open. Skipping fetch.');
    return [];
  }

  try {
    const results = await googleTrends.dailyTrends({
      trendDate: new Date(),
      geo,
    });

    const parsed = JSON.parse(results);
    const searches =
      parsed?.default?.trendingSearchesDays?.[0]?.trendingSearches || [];

    // Reset failures on success
    consecutiveFailures = 0;

    return searches.slice(0, 20).map((item, index) => ({
      name: item.title?.query || `google-trend-${index}`,
      slug: `google-${(item.title?.query || `trend-${index}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`,
      platform: 'google',
      url: item.articles?.[0]?.url || '',
      description: item.articles?.[0]?.title || '',
      category: 'trending',

      metrics: {
        formattedTraffic: item.formattedTraffic || '0',
        trafficValue: parseInt(
          (item.formattedTraffic || '0').replace(/[^0-9]/g, ''),
          10
        ) || 0,
        relatedQueries: (item.relatedQueries || []).map((q) => q.query),
      },

      rawData: {
        query: item.title?.query,
        formattedTraffic: item.formattedTraffic,
        articles: (item.articles || []).slice(0, 3).map((a) => ({
          title: a.title,
          url: a.url,
          source: a.source,
        })),
        relatedQueries: (item.relatedQueries || []).map((q) => q.query),
      },
    }));
  } catch (error) {
    recordFailure(error);
    return [];
  }
}

/**
 * Get circuit breaker status (for health/debug endpoints).
 */
function getCircuitStatus() {
  return {
    isOpen: isCircuitOpen(),
    consecutiveFailures,
    cooldownUntil: circuitBrokenUntil > 0
      ? new Date(circuitBrokenUntil).toISOString()
      : null,
  };
}

module.exports = { fetchGoogleTrends, getCircuitStatus };
