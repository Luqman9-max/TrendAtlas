/**
 * 404 handler for unmatched routes.
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
}

/**
 * Global error handler.
 * Returns structured JSON error responses.
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.stack || err.message}`);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message,
  });
}

module.exports = { notFoundHandler, errorHandler };
