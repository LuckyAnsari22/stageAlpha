const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const socketService = require('../services/socket');

// All pricing endpoints require auth + admin context organically
router.use(authenticate, requireAdmin);

// GET /api/v1/pricing/estimate/:equipment_id?event_date=YYYY-MM-DD
router.get('/estimate/:equipment_id', async (req, res, next) => {
  try {
    const { event_date } = req.query;
    if (!event_date) return res.status(400).json({ success: false, message: 'event_date parameter is mandatory' });

    const { rows } = await pool.query(
      'SELECT * FROM calculate_optimal_price($1, $2)', 
      [req.params.equipment_id, event_date]
    );

    if (!rows[0] || rows[0].final_optimal_price === null) {
      return res.status(404).json({ success: false, message: 'Price calculation failed. Equipment might not exist.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/pricing/update-all
router.post('/update-all', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM run_batch_price_update()');
    
    // Emit batch completion to the socket mesh
    if (socketService.emitPriceUpdate) {
      socketService.emitPriceUpdate({ type: 'batch_complete', count: rows.length, timestamp: new Date() });
    }

    res.json({ success: true, data: rows, message: 'Batch background price update completed' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/pricing/elasticity/:equipment_id
router.get('/elasticity/:equipment_id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM elasticity_estimates WHERE equipment_id = $1', 
      [req.params.equipment_id]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/pricing/elasticity/:equipment_id/recalculate
router.post('/elasticity/:equipment_id/recalculate', async (req, res, next) => {
  try {
    const equipmentId = req.params.equipment_id;
    
    // Procedure execute
    await pool.query('SELECT estimate_price_elasticity($1)', [equipmentId]);
    
    // Re-fetch the newly baked estimates
    const { rows } = await pool.query(
      'SELECT * FROM elasticity_estimates WHERE equipment_id = $1', 
      [equipmentId]
    );

    res.json({ success: true, data: rows[0] || null, message: 'Elasticity recalculation finished' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;