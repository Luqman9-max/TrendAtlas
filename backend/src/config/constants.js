/**
 * Application-wide constants.
 */
module.exports = {
  // Data pipeline
  FETCH_INTERVAL_CRON: '0 * * * *', // Every hour
  PLATFORMS: ['github', 'reddit', 'google'],

  // Scoring weights
  SCORE_WEIGHTS: {
    popularity: 0.4,
    velocity: 0.3,
    engagement: 0.2,
    crossPlatform: 0.1,
  },

  // Data retention
  SNAPSHOT_RETENTION_DAYS: 90,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};
