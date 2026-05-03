const axios = require('axios');

/**
 * GitHub Fetcher
 * Uses the official GitHub Search API to find trending repositories.
 * Strategy: search for repos created in the last 7 days, sorted by stars.
 *
 * Rate limits:
 *   - Unauthenticated: 10 req/min
 *   - Authenticated (token): 30 req/min
 *   - We fetch once per hour, so well within limits.
 */

const GITHUB_API = 'https://api.github.com';

/**
 * Fetch trending repositories from GitHub.
 * @param {Object} options
 * @param {number} options.days - Look back N days (default 7)
 * @param {number} options.limit - Max results (default 30, max 100)
 * @returns {Promise<Array>} Raw GitHub repository data
 */
async function fetchGitHubTrends({ days = 7, limit = 30 } = {}) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const dateStr = since.toISOString().split('T')[0]; // YYYY-MM-DD

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'TrendAtlas/1.0',
  };

  // Use personal access token if available (higher rate limit)
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await axios.get(`${GITHUB_API}/search/repositories`, {
    headers,
    params: {
      q: `created:>${dateStr}`,
      sort: 'stars',
      order: 'desc',
      per_page: Math.min(limit, 100),
    },
    timeout: 15000,
  });

  const repos = response.data.items || [];

  return repos.map((repo) => ({
    // Identifiers
    name: repo.full_name,
    slug: repo.full_name.toLowerCase().replace(/\//g, '-'),
    platform: 'github',
    url: repo.html_url,
    description: repo.description || '',
    category: repo.language || 'general',

    // Raw metrics for normalization
    metrics: {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      openIssues: repo.open_issues_count,
      language: repo.language,
      createdAt: repo.created_at,
    },

    // Preserve full response for raw_data
    rawData: {
      id: repo.id,
      full_name: repo.full_name,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      watchers_count: repo.watchers_count,
      open_issues_count: repo.open_issues_count,
      language: repo.language,
      topics: repo.topics || [],
      created_at: repo.created_at,
      updated_at: repo.updated_at,
    },
  }));
}

module.exports = { fetchGitHubTrends };
