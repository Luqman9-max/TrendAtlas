const axios = require('axios');

/**
 * Reddit Fetcher
 * Uses Reddit OAuth API to fetch hot/rising posts from trending subreddits.
 *
 * Setup: Register a "script" app at https://www.reddit.com/prefs/apps
 * Rate limit: 100 requests/min with OAuth (free tier).
 */

const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const REDDIT_API = 'https://oauth.reddit.com';

// Subreddits to monitor for trends
const TARGET_SUBREDDITS = [
  'technology',
  'programming',
  'webdev',
  'datascience',
  'artificial',
  'machinelearning',
  'startups',
  'futurology',
];

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get OAuth access token (cached until expiry).
 */
async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Reddit API credentials not configured. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.');
  }

  const response = await axios.post(
    REDDIT_TOKEN_URL,
    'grant_type=client_credentials',
    {
      auth: { username: clientId, password: clientSecret },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': process.env.REDDIT_USER_AGENT || 'TrendAtlas/1.0',
      },
      timeout: 10000,
    }
  );

  cachedToken = response.data.access_token;
  // Expire 60 seconds early to be safe
  tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

  return cachedToken;
}

/**
 * Fetch hot posts from a single subreddit.
 */
async function fetchSubreddit(subreddit, token, limit = 10) {
  const response = await axios.get(`${REDDIT_API}/r/${subreddit}/hot`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': process.env.REDDIT_USER_AGENT || 'TrendAtlas/1.0',
    },
    params: { limit, raw_json: 1 },
    timeout: 10000,
  });

  const posts = response.data?.data?.children || [];

  return posts
    .filter((p) => !p.data.stickied) // Skip pinned posts
    .map((p) => {
      const post = p.data;
      return {
        name: post.title.slice(0, 120), // Truncate long titles
        slug: `reddit-${post.id}`,
        platform: 'reddit',
        url: `https://reddit.com${post.permalink}`,
        description: post.selftext?.slice(0, 300) || '',
        category: subreddit,

        metrics: {
          score: post.score,
          upvoteRatio: post.upvote_ratio,
          numComments: post.num_comments,
          subreddit: post.subreddit,
          createdUtc: post.created_utc,
          awards: post.total_awards_received || 0,
        },

        rawData: {
          id: post.id,
          title: post.title,
          score: post.score,
          upvote_ratio: post.upvote_ratio,
          num_comments: post.num_comments,
          subreddit: post.subreddit,
          created_utc: post.created_utc,
          permalink: post.permalink,
          is_self: post.is_self,
          link_flair_text: post.link_flair_text,
        },
      };
    });
}

/**
 * Fetch trending posts from all target subreddits.
 * @param {Object} options
 * @param {number} options.postsPerSub - Posts per subreddit (default 10)
 * @returns {Promise<Array>} Raw Reddit post data
 */
async function fetchRedditTrends({ postsPerSub = 10 } = {}) {
  const token = await getAccessToken();

  // Fetch all subreddits in parallel with error isolation
  const results = await Promise.allSettled(
    TARGET_SUBREDDITS.map((sub) => fetchSubreddit(sub, token, postsPerSub))
  );

  const allPosts = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allPosts.push(...result.value);
    } else {
      console.warn(`[Reddit] Failed to fetch subreddit: ${result.reason.message}`);
    }
  }

  return allPosts;
}

module.exports = { fetchRedditTrends };
