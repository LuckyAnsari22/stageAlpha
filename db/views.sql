-- ============================================================
-- StageAlpha — Event Equipment Rental Platform
-- db/views.sql
-- 6 Views + Materialized Views for BI and Frontend Reporting
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. vw_equipment_catalog (Active public listings)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_equipment_catalog AS
SELECT 
    e.id,
    e.name,
    c.name AS category_name,
    c.icon_slug,
    e.base_price,
    e.current_price,
    e.stock_qty,
    e.description,
    e.specs,
    CASE 
        WHEN e.stock_qty > 0 THEN true 
        ELSE false 
    END AS is_available,
    ROUND(((e.current_price - e.base_price) / e.base_price) * 100, 1) AS price_surge_pct
FROM equipment e
JOIN categories c ON e.category_id = c.id
WHERE e.is_active = true AND c.is_active = true;

-- ─────────────────────────────────────────────
-- 2. vw_booking_details (Comprehensive admin view)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_booking_details AS
SELECT 
    b.id AS booking_id,
    b.event_date,
    b.event_type,
    b.status,
    c.name AS customer_name,
    c.email,
    v.name AS venue_name,
    v.city,
    b.subtotal,
    b.tax_amount,
    b.total_price,
    (SELECT COUNT(*) FROM booking_items WHERE booking_id = b.id) AS item_count,
    pym.status AS payment_status,
    pym.method AS payment_method
FROM bookings b
JOIN customers c ON b.customer_id = c.id
LEFT JOIN venues v ON b.venue_id = v.id
LEFT JOIN payments pym ON b.id = pym.booking_id;

-- ─────────────────────────────────────────────
-- 3. vw_quant_metrics (Algorithm performance monitor)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_quant_metrics AS
SELECT 
    e.id AS equipment_id,
    e.name,
    c.name AS category,
    ee.elasticity_coeff,
    ee.confidence_level,
    (SELECT COUNT(*) FROM price_history ph WHERE ph.equipment_id = e.id) as total_price_changes,
    (SELECT COUNT(DISTINCT booking_id) FROM booking_items WHERE equipment_id = e.id) as historical_bookings
FROM equipment e
JOIN categories c ON e.category_id = c.id
LEFT JOIN elasticity_estimates ee ON e.id = ee.equipment_id;

-- ─────────────────────────────────────────────
-- 4. vw_audit_history (Readable JSONB log)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_audit_history AS
SELECT 
    a.id,
    a.table_name,
    a.operation,
    a.record_id,
    a.old_values,
    a.new_values,
    c.name AS performed_by,
    a.changed_at
FROM audit_log a
LEFT JOIN customers c ON a.changed_by = c.id
ORDER BY a.changed_at DESC;

-- ─────────────────────────────────────────────
-- 5. mv_revenue_daily (Materialized)
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_revenue_daily CASCADE;
CREATE MATERIALIZED VIEW mv_revenue_daily AS
SELECT 
    DATE(event_date) as report_date,
    COUNT(id) as total_bookings,
    SUM(CASE WHEN status IN ('completed', 'confirmed') THEN total_price ELSE 0 END) as gross_revenue,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancellations
FROM bookings
GROUP BY DATE(event_date)
ORDER BY report_date DESC;

-- Index for fast refreshing/queries
CREATE UNIQUE INDEX idx_mv_rev_daily_date ON mv_revenue_daily(report_date);

-- ─────────────────────────────────────────────
-- 6. mv_revenue_monthly (Materialized)
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_revenue_monthly CASCADE;
CREATE MATERIALIZED VIEW mv_revenue_monthly AS
SELECT 
    DATE_TRUNC('month', event_date)::DATE as report_month,
    COUNT(id) as total_bookings,
    SUM(CASE WHEN status IN ('completed', 'confirmed') THEN total_price ELSE 0 END) as gross_revenue,
    AVG(CASE WHEN status IN ('completed', 'confirmed') THEN total_price ELSE NULL END) as avg_booking_value
FROM bookings
GROUP BY DATE_TRUNC('month', event_date)
ORDER BY report_month DESC;

-- Index for fast refreshing/queries
CREATE UNIQUE INDEX idx_mv_rev_monthly_month ON mv_revenue_monthly(report_month);

-- ─────────────────────────────────────────────
-- Note on Materialized Views:
-- Use `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_daily;` in a cron job.
