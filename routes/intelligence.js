const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { checkCache, invalidatePattern } = require('../middleware/cache');

// Protect all intelligence routes
router.use(authenticate, requireAdmin);

// 1. GET /api/v1/intelligence/rpaed (RPAED Engine)
router.get('/rpaed', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM v_rpaed_analysis ORDER BY rpaed DESC');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// 2. GET /api/v1/intelligence/roi (Equipment ROI)
router.get('/roi', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM v_equipment_roi ORDER BY annual_roi_pct DESC NULLS LAST');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// 3. GET /api/v1/intelligence/rfm (Customer RFM Segments)
router.get('/rfm', async (req, res, next) => {
  try {
    // The query maps exactly to the project_queries_rfm.sql
    const { rows } = await pool.query(`
      WITH rfm_raw AS (
        SELECT c.id AS customer_id, c.name, c.email, c.created_at AS member_since,
          EXTRACT(DAY FROM NOW() - MAX(b.event_date)) AS recency_days,
          COUNT(DISTINCT b.id) AS frequency,
          COALESCE(SUM(b.total_price), 0) AS monetary,
          ROUND(COALESCE(AVG(b.total_price), 0), 0) AS avg_booking_value
        FROM customers c
        LEFT JOIN bookings b ON c.id = b.customer_id AND b.status = 'completed'
        WHERE c.role = 'customer'
        GROUP BY c.id, c.name, c.email, c.created_at
      ),
      rfm_scored AS (
        SELECT *,
          5 - NTILE(4) OVER (ORDER BY recency_days DESC NULLS LAST) AS r_score,
          NTILE(4) OVER (ORDER BY frequency ASC NULLS FIRST) AS f_score,
          NTILE(4) OVER (ORDER BY monetary ASC NULLS FIRST) AS m_score
        FROM rfm_raw
      ),
      rfm_segmented AS (
        SELECT *,
          ROUND((r_score * 0.2 + f_score * 0.4 + m_score * 0.4)::DECIMAL, 2) AS rfm_score,
          PERCENT_RANK() OVER (ORDER BY (r_score * 0.2 + f_score * 0.4 + m_score * 0.4)) AS rfm_percentile
        FROM rfm_scored
      )
      SELECT
        customer_id, name, email, member_since, recency_days, frequency, monetary, avg_booking_value, r_score, f_score, m_score, rfm_score, ROUND(rfm_percentile * 100, 1) AS percentile_rank,
        CASE
          WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'CHAMPION'
          WHEN f_score >= 3 AND m_score >= 3 THEN 'LOYAL'
          WHEN r_score >= 4 AND f_score <= 2 THEN 'PROMISING_NEW'
          WHEN r_score <= 2 AND f_score >= 3 THEN 'AT_RISK'
          WHEN r_score = 1 AND f_score <= 2 THEN 'LOST'
          ELSE 'NEEDS_ATTENTION'
        END AS segment,
        CASE
          WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Offer priority booking for peak dates. Personal thank you.'
          WHEN f_score >= 3 AND m_score >= 3 THEN 'Enroll in loyalty program. Offer small discount on next booking.'
          WHEN r_score >= 4 AND f_score <= 2 THEN 'Send curated package recommendations. Nurture into loyal.'
          WHEN r_score <= 2 AND f_score >= 3 THEN 'Send win-back offer: 10% off if booked within 30 days.'
          WHEN r_score = 1 AND f_score <= 2 THEN 'Last-chance campaign. If no response, deprioritize.'
          ELSE 'Generic engagement campaign.'
        END AS recommended_action
      FROM rfm_segmented
      ORDER BY rfm_score DESC;
    `);

    const segments = rows.reduce((acc, r) => {
      acc[r.segment] = (acc[r.segment] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        customers: rows,
        summary: segments,
        total: rows.length,
        champions: rows.filter(r => r.segment === 'CHAMPION').length,
        at_risk: rows.filter(r => r.segment === 'AT_RISK').length
      }
    });
  } catch (err) { next(err); }
});

// 4. GET /api/v1/intelligence/forecast/:id (Demand Forecasting)
router.get('/forecast/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM forecast_demand($1)', [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// 5. GET /api/v1/intelligence/pricing/:id (Smart Pricing)
router.get('/pricing/:id', async (req, res, next) => {
  try {
    const eventDate = req.query.date || new Date().toISOString().split('T')[0];
    const { rows } = await pool.query('SELECT * FROM calculate_smart_price($1, $2)', [req.params.id, eventDate]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
