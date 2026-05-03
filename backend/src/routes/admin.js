const express = require('express');
const router = express.Router();
const { triggerPipeline, getPipelineInfo } = require('../controllers/adminController');

// Manual pipeline trigger (development/admin use)
router.post('/admin/fetch', triggerPipeline);
router.get('/admin/pipeline-status', getPipelineInfo);

module.exports = router;
