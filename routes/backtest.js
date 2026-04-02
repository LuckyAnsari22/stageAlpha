const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const socketService = require('../services/socket');

router.use(authenticate, requireAdmin);

// POST /api/v1/backtest/run
router.post('/run', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.body;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Both start_date and end_date are required' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (start >= end) {
      return res.status(400).json({ success: false, message: 'start_date must be strictly before end_date' });
    }

    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (diffMonths > 12) {
      return res.status(400).json({ success: false, message: 'Backtesting range cannot exceed 12 months' });
    }

    const { rows } = await pool.query('SELECT * FROM run_backtest($1, $2)', [start_date, end_date]);
    
    const result = rows[0];

    // Broadcast completion to admin sockets
    if (socketService.emitBacktestComplete) {
      socketService.emitBacktestComplete(result);
    }

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/backtest/results
router.get('/results', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM backtest_results ORDER BY run_at DESC LIMIT 10');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/backtest/results/latest
router.get('/results/latest', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM backtest_results ORDER BY run_at DESC LIMIT 1');
    if (!rows[0]) return res.status(404).json({ success: false, message: 'No backtests exist yet' });
    
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;