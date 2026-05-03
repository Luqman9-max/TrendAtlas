/**
 * Fetcher index — exports all platform fetchers from a single entry point.
 */
const { fetchGitHubTrends } = require('./github');
const { fetchRedditTrends } = require('./reddit');
const { fetchGoogleTrends, getCircuitStatus } = require('./google');

module.exports = {
  fetchGitHubTrends,
  fetchRedditTrends,
  fetchGoogleTrends,
  getCircuitStatus,
};
