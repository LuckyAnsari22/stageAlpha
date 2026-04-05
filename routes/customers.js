const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All customer management routes require admin
router.use(authenticate, requireAdmin);

// GET /api/v1/customers — list all customers with stats
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.name, c.email, c.phone, c.city, c.address, c.created_at,
             COALESCE(stats.booking_count, 0)::int AS booking_count,
             COALESCE(stats.total_spend, 0)::float AS total_spend,
             stats.last_booking_date,
             CASE 
               WHEN COALESCE(stats.total_spend, 0) >= 50000 THEN 'VIP'
               WHEN COALESCE(stats.booking_count, 0) >= 3 THEN 'Regular'
               WHEN COALESCE(stats.booking_count, 0) >= 1 THEN 'One-time'
               ELSE 'New'
             END AS segment
      FROM customers c
      LEFT JOIN (
        SELECT customer_id,
               COUNT(*)::int AS booking_count,
               COALESCE(SUM(total_price), 0) AS total_spend,
               MAX(event_date) AS last_booking_date
        FROM bookings
        WHERE status IN ('confirmed', 'completed')
        GROUP BY customer_id
      ) stats ON c.id = stats.customer_id
      ORDER BY c.name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/customers/:id — single customer with booking history
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: custRows } = await pool.query(`
      SELECT c.id, c.name, c.email, c.phone, c.city, c.address, c.created_at,
             COALESCE(stats.booking_count, 0)::int AS booking_count,
             COALESCE(stats.total_spend, 0)::float AS total_spend,
             stats.last_booking_date,
             CASE 
               WHEN COALESCE(stats.total_spend, 0) >= 50000 THEN 'VIP'
               WHEN COALESCE(stats.booking_count, 0) >= 3 THEN 'Regular'
               WHEN COALESCE(stats.booking_count, 0) >= 1 THEN 'One-time'
               ELSE 'New'
             END AS segment
      FROM customers c
      LEFT JOIN (
        SELECT customer_id,
               COUNT(*)::int AS booking_count,
               COALESCE(SUM(total_price), 0) AS total_spend,
               MAX(event_date) AS last_booking_date
        FROM bookings
        WHERE status IN ('confirmed', 'completed')
        GROUP BY customer_id
      ) stats ON c.id = stats.customer_id
      WHERE c.id = $1
    `, [req.params.id]);

    if (!custRows[0]) return res.status(404).json({ success: false, message: 'Customer not found' });

    const customer = custRows[0];

    // Get recent bookings for this customer
    const { rows: bookingRows } = await pool.query(`
      SELECT id, event_date, event_type, status, total_price, created_at
      FROM bookings WHERE customer_id = $1
      ORDER BY created_at DESC LIMIT 10
    `, [req.params.id]);

    customer.recent_bookings = bookingRows;

    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/customers — create customer (admin)
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, city, address } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    // Check for duplicate email
    const { rows: existing } = await pool.query('SELECT id FROM customers WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Customer with this email already exists' });
    }

    const bcrypt = require('bcryptjs');
    // Admin-created accounts get a random password hash (user must reset password to login)
    const placeholder_hash = await bcrypt.hash(`admin_created_${Date.now()}`, 10);
    
    const { rows } = await pool.query(`
      INSERT INTO customers (name, email, password_hash, phone, city, address)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [name, email, placeholder_hash, phone || null, city || null, address || null]);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/customers/:id — update customer
router.put('/:id', async (req, res, next) => {
  try {
    const { name, email, phone, city, address } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const { rows } = await pool.query(`
      UPDATE customers SET name=$1, email=$2, phone=$3, city=$4, address=$5, updated_at=NOW()
      WHERE id=$6 RETURNING *
    `, [name, email, phone || null, city || null, address || null, req.params.id]);

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/customers/:id — delete customer
router.delete('/:id', async (req, res, next) => {
  try {
    // Check for active bookings
    const { rows: activeBookings } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM bookings WHERE customer_id = $1 AND status IN ('pending', 'confirmed')",
      [req.params.id]
    );
    if (activeBookings[0].count > 0) {
      return res.status(409).json({ success: false, message: 'Cannot delete customer with active bookings' });
    }

    const { rows } = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Customer not found' });

    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;