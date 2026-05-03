const { runPipeline, getPipelineStatus } = require('../services/pipeline');
const { getCircuitStatus } = require('../fetchers');

/**
 * POST /api/admin/fetch
 * Manually trigger the data pipeline (for dev/testing).
 */
async function triggerPipeline(req, res, next) {
  try {
    console.log('[Admin] Manual pipeline trigger');
    const summary = await runPipeline();
    res.json({ message: 'Pipeline completed', summary });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/pipeline-status
 * Returns last run time and circuit breaker state.
 */
async function getPipelineInfo(req, res, next) {
  try {
    const pipelineStatus = await getPipelineStatus();
    const googleCircuit = getCircuitStatus();

    res.json({
      pipeline: pipelineStatus,
      circuitBreakers: {
        google: googleCircuit,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { triggerPipeline, getPipelineInfo };
