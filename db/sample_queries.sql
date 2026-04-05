-- ============================================
-- StageAlpha: Sample Queries for DBMS Report
-- Aligned with actual schema (schema.sql)
-- ============================================

-- ─────────────────────────────────────────────
-- Q1: Top 3 most booked equipment 
-- Concepts: JOIN + GROUP BY + ORDER BY + LIMIT
-- ─────────────────────────────────────────────
SELECT e.name, cat.name AS category, 
       COUNT(bi.id) AS times_booked, 
       SUM(bi.qty) AS total_units_rented,
       SUM(bi.final_price * bi.qty)::float AS total_revenue
FROM equipment e
JOIN categories cat ON cat.id = e.category_id
JOIN booking_items bi ON bi.equipment_id = e.id
JOIN bookings b ON bi.booking_id = b.id
WHERE b.status IN ('completed', 'confirmed')
GROUP BY e.id, e.name, cat.name
ORDER BY times_booked DESC
LIMIT 3;

-- ─────────────────────────────────────────────
-- Q2: Customers who spent more than average
-- Concepts: Subquery + HAVING + Aggregate
-- ─────────────────────────────────────────────
SELECT c.name, c.email, SUM(b.total_price) AS total_spent,
       COUNT(b.id) AS booking_count
FROM customers c
JOIN bookings b ON b.customer_id = c.id
WHERE b.status IN ('confirmed', 'completed')
GROUP BY c.id, c.name, c.email
HAVING SUM(b.total_price) > (
    SELECT AVG(total_price) FROM bookings 
    WHERE status IN ('confirmed', 'completed')
)
ORDER BY total_spent DESC;

-- ─────────────────────────────────────────────
-- Q3: Monthly revenue trend
-- Concepts: DATE_TRUNC + Aggregation + TO_CHAR
-- ─────────────────────────────────────────────
SELECT 
    TO_CHAR(DATE_TRUNC('month', b.event_date), 'YYYY-MM') AS month,
    COUNT(DISTINCT b.id) AS bookings,
    SUM(b.total_price)::float AS revenue,
    AVG(b.total_price)::float AS avg_booking_value
FROM bookings b
WHERE b.status IN ('confirmed', 'completed')
GROUP BY DATE_TRUNC('month', b.event_date)
ORDER BY month;

-- ─────────────────────────────────────────────
-- Q4: Equipment never booked
-- Concepts: LEFT JOIN + IS NULL (Anti-join)
-- ─────────────────────────────────────────────
SELECT e.name, cat.name AS category, 
       e.base_price, e.current_price, e.stock_qty
FROM equipment e
JOIN categories cat ON cat.id = e.category_id
LEFT JOIN booking_items bi ON bi.equipment_id = e.id
WHERE bi.id IS NULL AND e.is_active = true;

-- ─────────────────────────────────────────────
-- Q5: Busiest booking days
-- Concepts: Window function RANK + GROUP BY
-- ─────────────────────────────────────────────
SELECT 
    event_date,
    COUNT(*) AS bookings_on_day,
    SUM(total_price)::float AS day_revenue,
    RANK() OVER (ORDER BY COUNT(*) DESC) AS popularity_rank
FROM bookings
WHERE status != 'cancelled'
GROUP BY event_date
ORDER BY popularity_rank
LIMIT 5;

-- ─────────────────────────────────────────────
-- Q6: Category-wise stock utilization percentage
-- Concepts: Correlated subquery + COALESCE + ROUND
-- ─────────────────────────────────────────────
SELECT 
    cat.name AS category,
    SUM(e.stock_qty) AS total_stock,
    COALESCE(SUM(active_bookings.booked_qty), 0) AS currently_booked,
    ROUND(
        COALESCE(SUM(active_bookings.booked_qty), 0)::DECIMAL 
        / NULLIF(SUM(e.stock_qty), 0) * 100, 1
    ) AS utilization_pct
FROM categories cat
JOIN equipment e ON e.category_id = cat.id AND e.is_active = true
LEFT JOIN (
    SELECT bi.equipment_id, SUM(bi.qty) AS booked_qty
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE b.status IN ('pending', 'confirmed')
    GROUP BY bi.equipment_id
) active_bookings ON active_bookings.equipment_id = e.id
GROUP BY cat.name
ORDER BY utilization_pct DESC;

-- ─────────────────────────────────────────────
-- Q7: Price elasticity analysis (Stored Function)
-- Concepts: Stored procedure invocation
-- ─────────────────────────────────────────────
-- Estimate elasticity for equipment ID 1
SELECT estimate_price_elasticity(1);

-- Calculate optimal price for equipment ID 1 on a specific date
SELECT * FROM calculate_optimal_price(1, '2026-04-15');

-- Run backtest for a 6-month period
SELECT * FROM run_backtest('2025-10-01', '2026-03-31');

-- ─────────────────────────────────────────────
-- Q8: Query views
-- Concepts: View-based abstraction
-- ─────────────────────────────────────────────
-- Equipment catalog with surge pricing percentage
SELECT * FROM vw_equipment_catalog ORDER BY price_surge_pct DESC;

-- Comprehensive booking details with payment status
SELECT * FROM vw_booking_details ORDER BY booking_id DESC LIMIT 20;

-- Algorithm performance metrics per equipment
SELECT * FROM vw_quant_metrics ORDER BY historical_bookings DESC;

-- Audit history log (readable format)
SELECT * FROM vw_audit_history LIMIT 20;

-- ─────────────────────────────────────────────
-- Q9: RFM Customer Segmentation
-- Concepts: CTE + Window functions (NTILE, PERCENT_RANK) + CASE
-- ─────────────────────────────────────────────
WITH rfm_raw AS (
    SELECT c.id, c.name, c.email,
        EXTRACT(DAY FROM NOW() - MAX(b.event_date)) AS recency_days,
        COUNT(DISTINCT b.id) AS frequency,
        COALESCE(SUM(b.total_price), 0) AS monetary
    FROM customers c
    LEFT JOIN bookings b ON c.id = b.customer_id AND b.status = 'completed'
    WHERE c.role = 'customer'
    GROUP BY c.id, c.name, c.email
),
rfm_scored AS (
    SELECT *,
        5 - NTILE(4) OVER (ORDER BY recency_days DESC NULLS LAST) AS r_score,
        NTILE(4) OVER (ORDER BY frequency ASC NULLS FIRST) AS f_score,
        NTILE(4) OVER (ORDER BY monetary ASC NULLS FIRST) AS m_score
    FROM rfm_raw
)
SELECT *, 
    CASE
        WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'CHAMPION'
        WHEN f_score >= 3 AND m_score >= 3 THEN 'LOYAL'
        WHEN r_score >= 4 AND f_score <= 2 THEN 'PROMISING_NEW'
        WHEN r_score <= 2 AND f_score >= 3 THEN 'AT_RISK'
        WHEN r_score = 1 AND f_score <= 2 THEN 'LOST'
        ELSE 'NEEDS_ATTENTION'
    END AS segment
FROM rfm_scored
ORDER BY (r_score * 0.2 + f_score * 0.4 + m_score * 0.4) DESC;

-- ─────────────────────────────────────────────
-- Q10: Revenue comparison — Algorithm vs Base pricing
-- Concepts: Analytical function + comparative aggregation
-- ─────────────────────────────────────────────
SELECT 
    DATE_TRUNC('month', b.event_date) AS month,
    COUNT(DISTINCT b.id) AS bookings,
    SUM(bi.base_price_at_booking * bi.qty)::float AS base_revenue,
    SUM(bi.algorithm_price_at_booking * bi.qty)::float AS algorithm_revenue,
    SUM(bi.final_price * bi.qty)::float AS actual_revenue,
    ROUND(
        ((SUM(bi.algorithm_price_at_booking * bi.qty) - SUM(bi.base_price_at_booking * bi.qty)) 
        / NULLIF(SUM(bi.base_price_at_booking * bi.qty), 0) * 100)::numeric, 2
    )::float AS algorithm_uplift_pct
FROM bookings b
JOIN booking_items bi ON b.id = bi.booking_id
WHERE b.status IN ('completed', 'confirmed')
GROUP BY DATE_TRUNC('month', b.event_date)
ORDER BY month;

-- ─────────────────────────────────────────────
-- Q11: Materialized view queries (pre-aggregated)
-- Concepts: Materialized views for performance
-- ─────────────────────────────────────────────
-- Daily revenue snapshot
SELECT * FROM mv_revenue_daily ORDER BY report_date DESC LIMIT 30;

-- Monthly revenue trend
SELECT * FROM mv_revenue_monthly ORDER BY report_month DESC;

-- Equipment performance ranking
SELECT * FROM mv_equipment_performance ORDER BY rank_revenue ASC LIMIT 10;

-- ─────────────────────────────────────────────
-- Q12: Full-text search on equipment
-- Concepts: tsvector + ts_rank + GIN index
-- ─────────────────────────────────────────────
SELECT name, description, 
       ts_rank(search_vector, to_tsquery('english', 'speaker & wireless')) AS rank
FROM equipment 
WHERE search_vector @@ to_tsquery('english', 'speaker & wireless') 
  AND is_active = true
ORDER BY rank DESC;
