const { supabase } = require('../db/supabase');

/**
 * GET /api/health
 * Returns server status and database connectivity.
 */
async function checkHealth(req, res) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'unknown',
  };

  try {
    // Simple query to verify Supabase connectivity
    const { error } = await supabase.from('trends').select('id').limit(1);

    if (error && !error.message.includes('does not exist')) {
      // Real connection error (not just missing table during early setup)
      health.database = 'error';
      health.databaseError = error.message;
    } else {
      health.database = 'connected';
    }
  } catch (err) {
    health.database = 'unreachable';
    health.databaseError = err.message;
  }

  const statusCode = health.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
}

module.exports = { checkHealth };
