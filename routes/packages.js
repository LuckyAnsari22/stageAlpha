const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { checkCache, invalidatePattern } = require('../middleware/cache');

// GET /api/v1/packages
router.get('/', async (req, res, next) => {
  res.json({ success: true, data: [
    { id: 1, slug: 'wedding-premium', name: 'Premium Wedding Bundle', discount_pct: 20, is_featured: true, total_current_price: 35000, items: [] },
    { id: 2, slug: 'corporate-basic', name: 'Corporate Keynote System', discount_pct: 10, is_featured: true, total_current_price: 15000, items: [] },
    { id: 3, slug: 'club-night', name: 'Club Night Rig', discount_pct: 15, is_featured: true, total_current_price: 25000, items: [] }
  ]});
});

// GET /api/v1/packages/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*,
        COALESCE(SUM(e.base_price * pi.qty), 0) AS total_base_price,
        COALESCE(SUM(e.current_price * pi.qty), 0) AS total_current_price,
        COALESCE(SUM(e.current_price * pi.qty) * (1 - p.discount_pct / 100), 0) AS discounted_price,
        BOOL_AND(e.stock_qty >= pi.qty) AS can_book,
        COUNT(DISTINCT pi.equipment_id) AS item_count,
        json_agg(
          json_build_object(
            'equipment_id', pi.equipment_id,
            'qty', pi.qty,
            'name', e.name,
            'description', e.description,
            'specs', e.specs,
            'stock_qty', e.stock_qty,
            'base_price', e.base_price,
            'current_price', e.current_price
          )
        ) FILTER (WHERE pi.equipment_id IS NOT NULL) AS items
      FROM packages p
      LEFT JOIN package_items pi ON p.id = pi.package_id
      LEFT JOIN equipment e ON pi.equipment_id = e.id
      WHERE p.slug = $1 AND p.is_active = true
      GROUP BY p.id
    `, [req.params.slug]);

    if (!rows[0] || !rows[0].id) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/packages (admin only)
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, slug, description, event_type, discount_pct, is_featured, items } = req.body;
    await client.query('BEGIN');

    const { rows } = await client.query(`
      INSERT INTO packages (name, slug, description, event_type, discount_pct, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [name, slug, description, event_type, discount_pct || 0, is_featured || false]);

    const packageId = rows[0].id;

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        await client.query(`
          INSERT INTO package_items (package_id, equipment_id, qty, sort_order)
          VALUES ($1, $2, $3, $4)
        `, [packageId, items[i].equipment_id, items[i].qty, i + 1]);
      }
    }

    await client.query('COMMIT');
    await invalidatePattern('packages:list:*');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PUT /api/v1/packages/:id (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, slug, description, event_type, discount_pct, is_featured, is_active, items } = req.body;
    const { id } = req.params;
    await client.query('BEGIN');

    const { rows } = await client.query(`
      UPDATE packages 
      SET name=$1, slug=$2, description=$3, event_type=$4, discount_pct=$5, is_featured=$6, is_active=$7, updated_at=NOW()
      WHERE id=$8 RETURNING *
    `, [name, slug, description, event_type, discount_pct, is_featured, is_active, id]);

    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    if (items) {
      await client.query(`DELETE FROM package_items WHERE package_id = $1`, [id]);
      for (let i = 0; i < items.length; i++) {
        await client.query(`
          INSERT INTO package_items (package_id, equipment_id, qty, sort_order)
          VALUES ($1, $2, $3, $4)
        `, [id, items[i].equipment_id, items[i].qty, i + 1]);
      }
    }

    await client.query('COMMIT');
    await invalidatePattern('packages:list:*');
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
