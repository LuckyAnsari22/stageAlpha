const pricingEngine = require('../services/pricingEngine');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const db = require('../config/database');

/**
 * Executes a simulated pricing run generating optimal targets based on
 * available historical data depth utilizing either Thompson Sampling or OLS Regression.
 */
const simulatePrice = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  // Isolate current base equilibrium state directly from Database Matrix
  const equipRes = await db.query('SELECT name, price_per_day FROM equipment WHERE id = $1', [id]);
  
  if (equipRes.rowCount === 0) {
    throw new ApiError(404, 'Reference Error: Physical hardware node absent from inventory ledger.');
  }
  
  const baseEquilibrium = parseFloat(equipRes.rows[0].price_per_day);
  
  // Initiate core ML solver proxy
  const pricingData = await pricingEngine.computeVector(id, baseEquilibrium);
  
  // Optional: Write the model metrics back into history tracker asynchronously
  db.query(
    `INSERT INTO price_audit_log (equipment_id, old_price, new_price, changed_by) 
     VALUES ($1, $2, $3, $4)`,
    [id, baseEquilibrium, pricingData.optimal_price, req.user ? req.user.id : null]
  ).catch(err => console.error('History Engine Tracker Failed:', err.message));

  res.status(200).json({
    success: true,
    data: {
      equipment_id: id,
      node_name: equipRes.rows[0].name,
      base_equilibrium: baseEquilibrium,
      computation_model: pricingData.model,
      optimal_target: pricingData.optimal_price,
      statistical_confidence: pricingData.confidence
    }
  });
});

module.exports = {
  simulatePrice
};
