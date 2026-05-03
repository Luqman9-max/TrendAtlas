require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { requestLogger } = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health');
const adminRoutes = require('./routes/admin');
const trendsRoutes = require('./routes/trends');
const watchlistRoutes = require('./routes/watchlist');
const { initCronJobs } = require('./jobs/fetchTrends');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api', healthRoutes);
app.use('/api', adminRoutes);
app.use('/api', trendsRoutes);
app.use('/api', watchlistRoutes);

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[TrendAtlas] Backend running on http://localhost:${PORT}`);
  console.log(`[TrendAtlas] Health check: http://localhost:${PORT}/api/health`);

  // Start cron jobs after server is listening
  initCronJobs();
});

module.exports = app;
