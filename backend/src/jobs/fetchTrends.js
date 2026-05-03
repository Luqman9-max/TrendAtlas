const cron = require('node-cron');
const { runPipeline } = require('../services/pipeline');
const { FETCH_INTERVAL_CRON } = require('../config/constants');

/**
 * Initialize cron jobs.
 * Called once from server startup.
 */
function initCronJobs() {
  // Main data fetch cycle — runs every hour
  cron.schedule(FETCH_INTERVAL_CRON, async () => {
    console.log(`[Cron] Triggering pipeline at ${new Date().toISOString()}`);
    try {
      const summary = await runPipeline();
      console.log('[Cron] Pipeline summary:', JSON.stringify(summary));
    } catch (err) {
      console.error('[Cron] Pipeline failed:', err.message);
    }
  });

  console.log(`[Cron] Scheduled data fetch: "${FETCH_INTERVAL_CRON}"`);
}

module.exports = { initCronJobs };
