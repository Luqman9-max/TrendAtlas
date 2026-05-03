const express = require('express');
const router = express.Router();
const {
  listTrends,
  getTopTrends,
  handleCompareTrends,
  getTrendDetail,
} = require('../controllers/trendsController');

// Static routes MUST come before parameterized routes
router.get('/trends/top', getTopTrends);
router.get('/trends/compare', handleCompareTrends);

// Parameterized routes
router.get('/trends', listTrends);
router.get('/trends/:id', getTrendDetail);

module.exports = router;
