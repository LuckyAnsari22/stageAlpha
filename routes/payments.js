const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// POST /api/v1/payments
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { booking_id, amount, method, reference_no } = req.body;
    
    if (!booking_id || !amount || !method) {
      return res.status(400).json({ success: false, message: 'Invalid payment inputs' });
    }

    const validMethods = ['cash', 'upi', 'card', 'bank_transfer'];
    if (!validMethods.includes(method.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    // 1. Validate booking exists and belongs to user (or is an admin action)
    const { rows: bookingRows } = await pool.query(
      `SELECT id, customer_id, total_price FROM bookings WHERE id = $1`, 
      [booking_id]
    );
    
    if (!bookingRows[0]) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    if (req.user.role !== 'admin' && bookingRows[0].customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden action on unowned booking' });
    }

    // 2. Prevent double billing
    const { rows: existingRows } = await pool.query(
      `SELECT id, status FROM payments WHERE booking_id = $1 AND status = 'completed'`, 
      [booking_id]
    );
    
    if (existingRows.length > 0) {
      return res.status(400).json({ success: false, message: 'Booking already full paid' });
    }

    // 3. Process payment injection
    const { rows } = await pool.query(`
      INSERT INTO payments (booking_id, amount, method, reference_no, status, paid_at)
      VALUES ($1, $2, $3, $4, 'completed', NOW())
      RETURNING *
    `, [booking_id, amount, method.toLowerCase(), reference_no]);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/payments/:booking_id
router.get('/:booking_id', authenticate, async (req, res, next) => {
  try {
    // 1. Check permission boundary via bookings mapping
    const { rows: bookingRows } = await pool.query(
      `SELECT customer_id FROM bookings WHERE id = $1`, 
      [req.params.booking_id]
    );
    
    if (!bookingRows[0]) {
      return res.status(404).json({ success: false, message: 'Booking context missing' });
    }
    
    if (req.user.role !== 'admin' && bookingRows[0].customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // 2. Return payload
    const { rows } = await pool.query(`
      SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC
    `, [req.params.booking_id]);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;