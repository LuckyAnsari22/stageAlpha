-- ============================================
-- StageAlpha: Sample Queries for DBMS Report
-- ============================================

-- Q1: Top 3 most booked equipment (JOIN + GROUP BY + ORDER BY + LIMIT)
SELECT e.name, cat.name AS category, 
       COUNT(bi.id) AS times_booked, 
       SUM(bi.quantity) AS total_units_rented
FROM equipment e
JOIN categories cat ON cat.id = e.category_id
JOIN booking_items bi ON bi.equipment_id = e.id
GROUP BY e.id, e.name, cat.name
ORDER BY times_booked DESC
LIMIT 3;

-- Q2: Customers who spent more than average (Subquery + HAVING)
SELECT c.name, c.email, SUM(b.total_amount) AS total_spent
FROM customers c
JOIN bookings b ON b.customer_id = c.id
WHERE b.status IN ('Confirmed', 'Completed')
GROUP BY c.id, c.name, c.email
HAVING SUM(b.total_amount) > (
    SELECT AVG(total_amount) FROM bookings 
    WHERE status IN ('Confirmed', 'Completed')
);

-- Q3: Monthly revenue trend (Date functions + Aggregation)
SELECT 
    TO_CHAR(b.start_date, 'YYYY-MM') AS month,
    COUNT(DISTINCT b.id) AS bookings,
    SUM(b.total_amount) AS revenue
FROM bookings b
WHERE b.status IN ('Confirmed', 'Completed')
GROUP BY TO_CHAR(b.start_date, 'YYYY-MM')
ORDER BY month;

-- Q4: Equipment never booked (LEFT JOIN + IS NULL)
SELECT e.name, cat.name AS category, e.price_per_day, e.stock
FROM equipment e
JOIN categories cat ON cat.id = e.category_id
LEFT JOIN booking_items bi ON bi.equipment_id = e.id
WHERE bi.id IS NULL;

-- Q5: Busiest booking days (Window function RANK)
SELECT 
    start_date,
    COUNT(*) AS bookings_on_day,
    RANK() OVER (ORDER BY COUNT(*) DESC) AS popularity_rank
FROM bookings
WHERE status != 'Cancelled'
GROUP BY start_date
ORDER BY popularity_rank
LIMIT 5;

-- Q6: Category-wise stock utilization percentage
SELECT 
    cat.name AS category,
    SUM(e.stock) AS total_stock,
    COALESCE(SUM(active_bookings.booked_qty), 0) AS currently_booked,
    ROUND(COALESCE(SUM(active_bookings.booked_qty), 0)::DECIMAL / NULLIF(SUM(e.stock), 0) * 100, 1) AS utilization_pct
FROM categories cat
JOIN equipment e ON e.category_id = cat.id
LEFT JOIN (
    SELECT bi.equipment_id, SUM(bi.quantity) AS booked_qty
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE b.status IN ('Pending', 'Confirmed')
    GROUP BY bi.equipment_id
) active_bookings ON active_bookings.equipment_id = e.id
GROUP BY cat.name
ORDER BY utilization_pct DESC;

-- Q7: Use a stored procedure
SELECT * FROM fn_monthly_revenue(2026, 3);

-- Q8: Query a view
SELECT * FROM vw_booking_summary ORDER BY booking_id;
SELECT * FROM vw_revenue_by_category;
SELECT * FROM vw_equipment_availability ORDER BY available_stock ASC;
