const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { checkCache, invalidatePattern } = require('../middleware/cache');

// GET /api/v1/venues - list active venues, cache 3600s
router.get('/', checkCache('venues:list', 3600), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM venues WHERE is_active = true ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/venues - admin only, create
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, city, state, address, capacity } = req.body;
    if (!name || !city || capacity <= 0) return res.status(400).json({ success: false, message: 'Invalid input fields' });

    const { rows } = await pool.query(
      `INSERT INTO venues (name, city, state, address, capacity) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, city, state || 'Maharashtra', address, capacity]
    );

    await invalidatePattern('venues:list*');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/venues/:id - admin only, update
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, city, state, address, capacity, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE venues SET name=$1, city=$2, state=$3, address=$4, capacity=$5, is_active=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [name, city, state, address, capacity, is_active, req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Venue not found' });

    await invalidatePattern('venues:list*');
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;