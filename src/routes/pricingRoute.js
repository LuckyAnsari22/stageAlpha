const express = require('express');
const pricingController = require('../controllers/pricingController');

const router = express.Router();

// Base Simulation Execution Path
router.route('/:id/simulate')
  .get(pricingController.simulatePrice);

module.exports = router;
