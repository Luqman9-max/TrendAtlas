const express = require('express');
const router = express.Router();
const { checkHealth } = require('../controllers/healthController');

router.get('/health', checkHealth);

module.exports = router;
