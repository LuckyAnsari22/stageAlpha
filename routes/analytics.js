const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All routes require authentication & admin role
router.use(authenticate, requireAdmin);

// GET /api/v1/analytics/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM bookings WHERE DATE(created_at) = CURRENT_DATE) AS today_bookings,
        (SELECT COALESCE(SUM(total_price), 0)::float FROM bookings WHERE status='completed' AND EXTRACT(MONTH FROM event_date) = EXTRACT(MONTH FROM CURRENT_DATE)) AS month_revenue,
        (SELECT COUNT(*)::int FROM bookings WHERE status='pending') AS pending_bookings,
        (SELECT COUNT(*)::int FROM equipment WHERE stock_qty <= 3 AND is_active = true) AS low_stock_items,
        (SELECT json_agg(t) FROM (SELECT b.*, c.name as customer_name, c.email FROM bookings b JOIN customers c ON b.customer_id = c.id ORDER BY b.created_at DESC LIMIT 5) t) AS recent_bookings
    `);
    
    // Ensure recent_bookings defaults to an array if null
    const data = rows[0];
    data.recent_bookings = data.recent_bookings || [];

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/revenue?months=6
router.get('/revenue', async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    
    // Refresh concurrency requires careful configuration, if this times out or errors, fallback to regular select for simplicity in demo
    try {
        await pool.query('REFRESH MATERIALIZED VIEW mv_revenue_monthly');
    } catch {}

    const { rows } = await pool.query(
      'SELECT month, total_revenue FROM mv_revenue_monthly ORDER BY month DESC LIMIT $1', 
      [months]
    );

    // Format for Chart.js inherently
    const sorted = rows.reverse(); // oldest to newest logically for charts
    const datasets = {
      labels: sorted.map(r => new Date(r.month).toLocaleString('default', { month: 'short', year: 'numeric' })),
      datasets: [
        {
          label: 'Revenue',
          data: sorted.map(r => parseFloat(r.total_revenue))
        }
      ]
    };

    res.json({ success: true, data: datasets });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/top-equipment?limit=10
router.get('/top-equipment', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    try {
        await pool.query('REFRESH MATERIALIZED VIEW mv_equipment_performance');
    } catch {}

    const { rows } = await pool.query(
      'SELECT * FROM mv_equipment_performance ORDER BY rank_revenue ASC LIMIT $1', 
      [limit]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/customers
router.get('/customers', async (req, res, next) => {
  try {
    // Note: Assuming vw_customer_stats holds logic
    const { rows } = await pool.query(`
        SELECT c.id, c.name, c.email, 
               COUNT(b.id) as total_bookings, 
               COALESCE(SUM(b.total_price), 0) as total_spent
        FROM customers c
        LEFT JOIN bookings b ON c.id = b.customer_id AND b.status = 'completed'
        GROUP BY c.id
        ORDER BY total_spent DESC 
        LIMIT 20
    `);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/availability?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/availability', async (req, res, next) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ success: false, message: 'start and end dates are required' });

    const { rows } = await pool.query(`
      SELECT event_date, COUNT(*)::int as booking_count,
             COALESCE(SUM(total_price), 0)::float as day_revenue
      FROM bookings 
      WHERE event_date BETWEEN $1 AND $2 
        AND status NOT IN ('cancelled')
      GROUP BY event_date
      ORDER BY event_date
    `, [start, end]);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/by-category
router.get('/by-category', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.name AS category,
             COUNT(DISTINCT b.id)::int AS bookings,
             SUM(bi.final_price * bi.qty)::float AS revenue,
             ROUND((SUM(bi.final_price * bi.qty) * 100.0 / NULLIF(SUM(SUM(bi.final_price * bi.qty)) OVER (), 0))::numeric, 1)::float AS pct
      FROM booking_items bi
      JOIN bookings b ON bi.booking_id = b.id
      JOIN equipment e ON bi.equipment_id = e.id
      JOIN categories c ON e.category_id = c.id
      WHERE b.status = 'completed' AND b.event_date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY c.id, c.name ORDER BY revenue DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/by-event-type
router.get('/by-event-type', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.event_type AS type,
             COUNT(DISTINCT b.id)::int AS bookings,
             SUM(bi.final_price * bi.qty)::float AS revenue,
             ROUND((SUM(bi.final_price * bi.qty) * 100.0 / NULLIF(SUM(SUM(bi.final_price * bi.qty)) OVER (), 0))::numeric, 1)::float AS pct
      FROM booking_items bi
      JOIN bookings b ON bi.booking_id = b.id
      WHERE b.status = 'completed' AND b.event_date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY b.event_type ORDER BY revenue DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/monthly-comparison
router.get('/monthly-comparison', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      WITH monthly AS (
        SELECT EXTRACT(MONTH FROM event_date) AS month,
               EXTRACT(YEAR FROM event_date) AS year,
               SUM(total_price) AS revenue
        FROM bookings WHERE status = 'completed'
        GROUP BY month, year
      )
      SELECT m1.month::int, 
             m1.revenue::float AS this_year, 
             COALESCE(m2.revenue, 0)::float AS last_year,
             ROUND(((m1.revenue - COALESCE(m2.revenue, 0)) / NULLIF(COALESCE(m2.revenue, 1), 0) * 100)::numeric, 1)::float AS yoy_growth
      FROM monthly m1
      LEFT JOIN monthly m2 ON m1.month = m2.month AND m1.year = m2.year + 1
      WHERE m1.year = EXTRACT(YEAR FROM CURRENT_DATE)
      ORDER BY m1.month
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/peak-hours
router.get('/peak-hours', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int as count
      FROM bookings
      GROUP BY hour
      ORDER BY hour
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;