-- RFM Customer Segmentation for StageAlpha
-- Demonstrates: CTEs, Window Functions (NTILE, PERCENT_RANK), Complex CASE WHEN
-- Business value: identifies VIP, At-Risk, and Lost customers

-- Query 1: Raw RFM metrics
WITH rfm_raw AS (
  SELECT
    c.id AS customer_id,
    c.name,
    c.email,
    c.created_at AS member_since,

    -- RECENCY: days since last completed booking (lower = better)
    EXTRACT(DAY FROM NOW() - MAX(b.event_date)) AS recency_days,

    -- FREQUENCY: number of completed bookings
    COUNT(DISTINCT b.id) AS frequency,

    -- MONETARY: total revenue from this customer
    COALESCE(SUM(b.total_price), 0) AS monetary,

    -- Average booking value
    ROUND(COALESCE(AVG(b.total_price), 0), 0) AS avg_booking_value

  FROM customers c
  LEFT JOIN bookings b ON c.id = b.customer_id AND b.status = 'completed'
  WHERE c.role = 'customer'
  GROUP BY c.id, c.name, c.email, c.created_at
),

-- Score each dimension 1–4 using NTILE
-- NTILE(4) divides customers into 4 equal buckets
rfm_scored AS (
  SELECT *,
    -- Recency: LOWER days = BETTER = higher score (invert with DESC)
    5 - NTILE(4) OVER (ORDER BY recency_days DESC NULLS LAST) AS r_score,

    -- Frequency: HIGHER = BETTER
    NTILE(4) OVER (ORDER BY frequency ASC NULLS FIRST) AS f_score,

    -- Monetary: HIGHER = BETTER
    NTILE(4) OVER (ORDER BY monetary ASC NULLS FIRST) AS m_score

  FROM rfm_raw
),

-- Combine into composite RFM score and segment
rfm_segmented AS (
  SELECT *,
    -- Composite score (weighted: frequency and monetary matter more for this business)
    ROUND((r_score * 0.2 + f_score * 0.4 + m_score * 0.4)::DECIMAL, 2) AS rfm_score,

    -- Concatenated score string for pattern matching
    CONCAT(r_score, f_score, m_score) AS rfm_pattern,

    -- Percentile rank of composite score
    PERCENT_RANK() OVER (
      ORDER BY (r_score * 0.2 + f_score * 0.4 + m_score * 0.4)
    ) AS rfm_percentile

  FROM rfm_scored
)

SELECT
  customer_id,
  name,
  email,
  member_since,
  recency_days,
  frequency,
  monetary,
  avg_booking_value,
  r_score,
  f_score,
  m_score,
  rfm_score,
  ROUND(rfm_percentile * 100, 1) AS percentile_rank,

  -- CUSTOMER SEGMENT (the business intelligence layer)
  CASE
    -- Champions: recent, frequent, high value
    WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4
    THEN 'CHAMPION'

    -- Loyal: frequent and high value, maybe not super recent
    WHEN f_score >= 3 AND m_score >= 3
    THEN 'LOYAL'

    -- Promising: recent but not yet frequent
    WHEN r_score >= 4 AND f_score <= 2
    THEN 'PROMISING_NEW'

    -- At-Risk: were frequent but haven't come back
    WHEN r_score <= 2 AND f_score >= 3
    THEN 'AT_RISK'

    -- Lost: haven't booked in a long time, low engagement
    WHEN r_score = 1 AND f_score <= 2
    THEN 'LOST'

    -- Everyone else
    ELSE 'NEEDS_ATTENTION'
  END AS segment,

  -- Action recommended per segment
  CASE
    WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4
    THEN 'Offer priority booking for peak dates. Personal thank you.'
    WHEN f_score >= 3 AND m_score >= 3
    THEN 'Enroll in loyalty program. Offer small discount on next booking.'
    WHEN r_score >= 4 AND f_score <= 2
    THEN 'Send curated package recommendations. Nurture into loyal.'
    WHEN r_score <= 2 AND f_score >= 3
    THEN 'Send win-back offer: 10% off if booked within 30 days.'
    WHEN r_score = 1 AND f_score <= 2
    THEN 'Last-chance campaign. If no response, deprioritize.'
    ELSE 'Generic engagement campaign.'
  END AS recommended_action

FROM rfm_segmented
ORDER BY rfm_score DESC;
