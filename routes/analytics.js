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
    
    // Note: Materialized views are refreshed by nightly cron or /api/v1/pricing/update-all
    // Removing per-request refresh to avoid lock contention on production

    const { rows } = await pool.query(
      'SELECT report_month AS month, gross_revenue AS total_revenue FROM mv_revenue_monthly ORDER BY report_month DESC LIMIT $1', 
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
        await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_equipment_performance');
    } catch (err) {
      console.warn('[Analytics] Equipment performance MV refresh skipped:', err.message);
    }

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

// GET /api/v1/analytics/monthly-revenue — for classic admin + analytics page charts
router.get('/monthly-revenue', async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const { rows } = await pool.query(`
      SELECT DATE_TRUNC('month', event_date) AS report_month,
             COALESCE(SUM(total_price), 0)::float AS gross_revenue,
             COUNT(*)::int AS booking_count
      FROM bookings
      WHERE status IN ('completed', 'confirmed')
        AND event_date >= CURRENT_DATE - ($1 || ' months')::INTERVAL
      GROUP BY DATE_TRUNC('month', event_date)
      ORDER BY report_month ASC
    `, [months]);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// REPORTS ENDPOINTS — Used by AdminReportsCtrl
// ============================================================

// GET /api/v1/analytics/reports/revenue
router.get('/reports/revenue', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const { rows: summary } = await pool.query(`
      SELECT 
        COALESCE(SUM(total_price), 0)::float AS total,
        COUNT(*)::int AS count,
        COALESCE(AVG(total_price), 0)::float AS average,
        COALESCE(MAX(total_price), 0)::float AS highest,
        COALESCE(SUM(total_price) / GREATEST(EXTRACT(DAY FROM ($2::date - $1::date + INTERVAL '1 day')), 1), 0)::float AS "dailyAvg"
      FROM bookings
      WHERE status IN ('completed', 'confirmed')
        AND event_date BETWEEN $1 AND $2
    `, [start, end]);

    const { rows: daily } = await pool.query(`
      SELECT event_date AS date,
             COUNT(*)::int AS count,
             COALESCE(SUM(total_price), 0)::float AS total,
             COALESCE(AVG(total_price), 0)::float AS average
      FROM bookings
      WHERE status IN ('completed', 'confirmed')
        AND event_date BETWEEN $1 AND $2
      GROUP BY event_date
      ORDER BY event_date
    `, [start, end]);

    const result = summary[0] || {};
    result.dailyBreakdown = daily;
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/reports/bookings
router.get('/reports/bookings', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const { rows: summary } = await pool.query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        ROUND(COUNT(*) FILTER (WHERE status = 'completed')::float / GREATEST(COUNT(*)::float, 1) * 100, 1)::float AS "completionRate"
      FROM bookings
      WHERE event_date BETWEEN $1 AND $2
    `, [start, end]);

    const { rows: recent } = await pool.query(`
      SELECT b.id, c.name AS customer_name, b.event_date, b.status, b.total_price
      FROM bookings b JOIN customers c ON b.customer_id = c.id
      WHERE b.event_date BETWEEN $1 AND $2
      ORDER BY b.created_at DESC LIMIT 10
    `, [start, end]);

    const result = summary[0] || {};
    result.recent = recent;
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/reports/customers
router.get('/reports/customers', async (req, res, next) => {
  try {
    const { rows: summary } = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id)::int AS total,
        COUNT(DISTINCT c.id) FILTER (WHERE COALESCE(stats.total_spend, 0) >= 50000)::int AS vip,
        COALESCE(AVG(stats.total_spend), 0)::float AS "avgLTV",
        COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days')::int AS "newThisMonth"
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, SUM(total_price) AS total_spend
        FROM bookings WHERE status IN ('confirmed', 'completed')
        GROUP BY customer_id
      ) stats ON c.id = stats.customer_id
    `);

    const { rows: top } = await pool.query(`
      SELECT c.name,
             CASE WHEN COALESCE(SUM(b.total_price), 0) >= 50000 THEN 'VIP' ELSE 'Regular' END AS segment,
             COUNT(b.id)::int AS booking_count,
             COALESCE(SUM(b.total_price), 0)::float AS total_spend,
             MAX(b.event_date) AS last_booking_date
      FROM customers c
      LEFT JOIN bookings b ON c.id = b.customer_id AND b.status IN ('confirmed', 'completed')
      GROUP BY c.id, c.name
      ORDER BY total_spend DESC
      LIMIT 10
    `);

    const result = summary[0] || {};
    result.top = top;
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/reports/equipment
router.get('/reports/equipment', async (req, res, next) => {
  try {
    const { rows: summary } = await pool.query(`
      SELECT 
        COUNT(*)::int AS total,
        ROUND(AVG(CASE WHEN stock_qty > 0 THEN ((stock_qty - COALESCE(avail.booked, 0))::float / stock_qty * 100) ELSE 0 END)::numeric, 1)::float AS "avgUtilization",
        COUNT(*) FILTER (WHERE stock_qty <= 0)::int AS "outOfStock",
        COALESCE((SELECT SUM(bi.final_price * bi.qty) FROM booking_items bi JOIN bookings b ON bi.booking_id = b.id WHERE b.status IN ('completed', 'confirmed')), 0)::float AS "totalRevenue"
      FROM equipment e
      LEFT JOIN (
        SELECT bi.equipment_id, SUM(bi.qty) AS booked
        FROM booking_items bi
        JOIN bookings b ON bi.booking_id = b.id
        WHERE b.status IN ('pending', 'confirmed')
        GROUP BY bi.equipment_id
      ) avail ON e.id = avail.equipment_id
      WHERE e.is_active = true
    `);

    const { rows: performance } = await pool.query(`
      SELECT e.name, c.name AS category,
             COUNT(bi.id)::int AS rental_count,
             ROUND((COUNT(bi.id)::float / GREATEST((SELECT COUNT(*) FROM bookings WHERE status IN ('completed', 'confirmed'))::float, 1) * 100)::numeric, 1)::float AS utilization,
             COALESCE(SUM(bi.final_price * bi.qty), 0)::float AS revenue
      FROM equipment e
      JOIN categories c ON e.category_id = c.id
      LEFT JOIN booking_items bi ON e.id = bi.equipment_id
      LEFT JOIN bookings b ON bi.booking_id = b.id AND b.status IN ('completed', 'confirmed')
      WHERE e.is_active = true
      GROUP BY e.id, e.name, c.name
      ORDER BY revenue DESC
      LIMIT 10
    `);

    const result = summary[0] || {};
    result.performance = performance;
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;