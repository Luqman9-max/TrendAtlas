const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  checkWatchlist,
} = require('../controllers/watchlistController');

// All watchlist routes require authentication
router.use(authMiddleware);

router.get('/watchlist', getWatchlist);
router.post('/watchlist', addToWatchlist);
router.delete('/watchlist/:trendId', removeFromWatchlist);
router.get('/watchlist/check/:trendId', checkWatchlist);

module.exports = router;
