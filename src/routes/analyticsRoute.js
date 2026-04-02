const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { protect, adminOnly } = require('../middlewares/auth');

const router = express.Router();

router.route('/dashboard')
  .get(protect, adminOnly, analyticsController.getDashboardMetrics);

router.route('/intelligence')
  .get(protect, adminOnly, analyticsController.getRiskIntelligence);

module.exports = router;
