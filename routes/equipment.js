const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { checkCache, invalidate, invalidatePattern } = require('../middleware/cache');

// 1. GET /api/v1/equipment
router.get('/', checkCache(req => `equipment:list:${JSON.stringify(req.query)}`, 300), async (req, res, next) => {
  try {
    const { category_id, search, available_on, price_min, price_max } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    let whereSql = `WHERE is_available = true`;
    let countSql = `SELECT count(*) FROM vw_equipment_catalog WHERE is_available = true`;
    const params = [];
    let paramIdx = 1;

    if (category_id) {
      whereSql += ` AND id IN (SELECT id FROM equipment WHERE category_id = $${paramIdx})`;
      countSql += ` AND id IN (SELECT id FROM equipment WHERE category_id = $${paramIdx})`;
      params.push(category_id);
      paramIdx++;
    }
    
    if (search) {
      whereSql += ` AND name ILIKE $${paramIdx}`;
      countSql += ` AND name ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    
    if (price_min) {
      whereSql += ` AND current_price >= $${paramIdx}`;
      countSql += ` AND current_price >= $${paramIdx}`;
      params.push(price_min);
      paramIdx++;
    }

    if (price_max) {
      whereSql += ` AND current_price <= $${paramIdx}`;
      countSql += ` AND current_price <= $${paramIdx}`;
      params.push(price_max);
      paramIdx++;
    }

    if (available_on) {
      // Complex stock logic simplified for performance on listing: 
      // check if total stock > booked stock on requested date
      whereSql += ` AND id IN (
        SELECT id FROM equipment e WHERE e.stock_qty > COALESCE((
          SELECT SUM(qty) FROM booking_items bi 
          JOIN bookings b ON bi.booking_id = b.id 
          WHERE bi.equipment_id = e.id AND b.event_date = $${paramIdx} AND b.status IN ('pending','confirmed')
        ), 0)
      )`;
      countSql += ` AND id IN ( ... )`; // Omitted literal repetition for simplicity, but functionally equivalent needed
      params.push(available_on);
      paramIdx++;
    }

    const { rows: countRows } = await pool.query(countSql, params.slice(0, available_on ? paramIdx - 2 : paramIdx - 1)); // adjust if complex
    // Simplified count execution for exact matches:
    const totalCountQuery = await pool.query(countSql.replace('id IN ( ... )', `id IN (SELECT id FROM equipment e WHERE e.stock_qty > COALESCE((SELECT SUM(qty) FROM booking_items bi JOIN bookings b ON bi.booking_id = b.id WHERE bi.equipment_id = e.id AND b.event_date = $${paramIdx - 1} AND b.status IN ('pending','confirmed')), 0))`), params);
    const total = parseInt(totalCountQuery.rows[0].count);

    const qs = `SELECT * FROM vw_equipment_catalog ${whereSql} ORDER BY id LIMIT $${paramIdx} OFFSET $${paramIdx+1}`;
    const { rows } = await pool.query(qs, [...params, limit, offset]);

    res.json({
      success: true,
      data: rows,
      total,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/v1/equipment/:id
router.get('/:id', checkCache(req => `equipment:${req.params.id}`, 600), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT v.*, ee.elasticity_coeff, ee.confidence_level, ph.changed_at as last_price_change
      FROM vw_equipment_catalog v
      LEFT JOIN elasticity_estimates ee ON ee.equipment_id = v.id
      LEFT JOIN LATERAL (
        SELECT changed_at FROM price_history 
        WHERE equipment_id = v.id ORDER BY changed_at DESC LIMIT 1
      ) ph ON true
      WHERE v.id = $1
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Equipment not found' });
    
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/v1/equipment/:id/price?event_date=YYYY-MM-DD
router.get('/:id/price', async (req, res, next) => {
  try {
    const { event_date } = req.query;
    if (!event_date) return res.status(400).json({ success: false, message: 'event_date is required' });

    const { rows } = await pool.query(`SELECT * FROM calculate_optimal_price($1, $2)`, [req.params.id, event_date]);
    if (!rows[0] || rows[0].final_optimal_price === null) {
        return res.status(404).json({ success: false, message: 'Price calculation failed' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// 4. GET /api/v1/equipment/:id/price-history
router.get('/:id/price-history', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM price_history 
      WHERE equipment_id = $1 
      ORDER BY changed_at DESC LIMIT 30
    `, [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// 4.5 GET /api/v1/equipment/:id/reviews
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.rating, r.comment, c.name as customer_name, r.created_at
      FROM reviews r
      JOIN bookings b ON r.booking_id = b.id
      JOIN booking_items bi ON b.id = bi.booking_id
      JOIN customers c ON r.customer_id = c.id
      WHERE bi.equipment_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// 5. POST /api/v1/equipment
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, category_id, base_price, stock_qty, description, specs, image_url } = req.body;
    
    if (!name || base_price <= 0 || stock_qty < 0 || !category_id) {
      return res.status(400).json({ success: false, message: 'Invalid input fields' });
    }

    const { rows } = await pool.query(`
      INSERT INTO equipment (name, category_id, base_price, current_price, stock_qty, description, specs, image_url)
      VALUES ($1, $2, $3, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, category_id, base_price, stock_qty, description, specs, image_url]);

    await invalidatePattern('equipment:list:*');
    
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// 6. PUT /api/v1/equipment/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, category_id, base_price, current_price, stock_qty, description, specs, image_url, is_active } = req.body;
    const { rows } = await pool.query(`
      UPDATE equipment 
      SET name=$1, category_id=$2, base_price=$3, current_price=$4, stock_qty=$5, description=$6, specs=$7, image_url=$8, is_active=$9, updated_at=NOW()
      WHERE id=$10 RETURNING *
    `, [name, category_id, base_price, current_price, stock_qty, description, specs, image_url, is_active, req.params.id]);

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' });

    await invalidate(`equipment:${req.params.id}`);
    await invalidatePattern('equipment:list:*');

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// 7. PATCH /api/v1/equipment/:id
router.patch('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    // Get existing
    const currentEq = await pool.query('SELECT current_price FROM equipment WHERE id = $1', [id]);
    if (!currentEq.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    
    const fields = ['stock_qty', 'current_price', 'description', 'is_active'];
    let updateSql = 'UPDATE equipment SET updated_at = NOW()';
    const params = [];
    let paramIdx = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updateSql += `, ${f} = $${paramIdx}`;
        params.push(req.body[f]);
        paramIdx++;
      }
    }

    if (params.length === 0) return res.status(400).json({ success: false, message: 'No valid fields to update' });

    updateSql += ` WHERE id = $${paramIdx} RETURNING *`;
    params.push(id);

    const { rows } = await pool.query(updateSql, params);
    
    await invalidate(`equipment:${id}`);
    await invalidatePattern('equipment:list:*');

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;