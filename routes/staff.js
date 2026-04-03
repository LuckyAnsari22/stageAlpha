const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// All staff routes typically admin-only
router.use(authenticate, requireAdmin);

// GET /api/v1/staff (admin only)
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, count(sa.id)::int as assignment_count
      FROM staff s
      LEFT JOIN staff_assignments sa ON s.id = sa.staff_id
      GROUP BY s.id
      ORDER BY s.id ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/staff (admin only)
router.post('/', async (req, res, next) => {
  try {
    const { name, phone_number, role, is_available } = req.body;
    let phone_hash = null;
    if (phone_number) {
      phone_hash = await bcrypt.hash(phone_number, 12);
    }
    
    const { rows } = await pool.query(`
      INSERT INTO staff (name, phone_hash, role, is_available)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [name, phone_hash, role, is_available !== undefined ? is_available : true]);
    
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/staff/:id (admin only)
router.put('/:id', async (req, res, next) => {
  try {
    const { name, phone_number, role, is_available, is_active } = req.body;
    
    // Fetch existing
    const existing = await pool.query(`SELECT phone_hash FROM staff WHERE id = $1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });

    let phone_hash = existing.rows[0].phone_hash;
    if (phone_number) {
      phone_hash = await bcrypt.hash(phone_number, 12);
    }

    const { rows } = await pool.query(`
      UPDATE staff SET name=$1, phone_hash=$2, role=$3, is_available=$4, is_active=$5
      WHERE id=$6 RETURNING *
    `, [name, phone_hash, role, is_available, is_active, req.params.id]);
    
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/staff/:id/availability (admin only)
router.patch('/:id/availability', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      UPDATE staff SET is_available = $1 WHERE id = $2 RETURNING *
    `, [req.body.is_available, req.params.id]);
    
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/staff/available?date=YYYY-MM-DD (admin only)
router.get('/available', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'date query param is required' });

    const { rows } = await pool.query(`
      SELECT s.* 
      FROM staff s
      WHERE s.is_available = true AND s.is_active = true
      AND s.id NOT IN (
        SELECT sa.staff_id 
        FROM staff_assignments sa 
        JOIN bookings b ON sa.booking_id = b.id
        WHERE b.event_date = $1
      )
    `, [date]);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/staff/assign (admin only)
router.post('/assign', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { booking_id, staff_id, role_at_event, notes } = req.body;
    await client.query('BEGIN');

    const { rows } = await client.query(`
      INSERT INTO staff_assignments (booking_id, staff_id, role_at_event, notes)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [booking_id, staff_id, role_at_event, notes || null]);

    const { rows: bRows } = await client.query(`SELECT customer_id FROM bookings WHERE id = $1`, [booking_id]);
    if (bRows[0]) {
      await client.query(`
        INSERT INTO notifications (customer_id, type, title, message, link)
        VALUES ($1, $2, $3, $4, $5)
      `, [bRows[0].customer_id, 'STAFF_ASSIGNED', 'Staff Assigned', `Staff has been assigned to your booking #${booking_id}.`, `/bookings/${booking_id}`]);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
