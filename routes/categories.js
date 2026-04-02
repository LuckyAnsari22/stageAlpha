const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { checkCache, invalidatePattern } = require('../middleware/cache');

// GET /api/v1/categories - list active categories, cache 3600s
router.get('/', checkCache('categories:list', 3600), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY sort_order ASC, name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/categories - admin only, create
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, icon_slug, sort_order } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const { rows } = await pool.query(
      `INSERT INTO categories (name, description, icon_slug, sort_order) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description, icon_slug, sort_order || 0]
    );

    await invalidatePattern('categories:list*'); // wipe caches
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/categories/:id - admin only, update
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, icon_slug, sort_order, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE categories SET name=$1, description=$2, icon_slug=$3, sort_order=$4, is_active=$5 WHERE id=$6 RETURNING *`,
      [name, description, icon_slug, sort_order, is_active, req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Category not found' });

    await invalidatePattern('categories:list*');
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;