-- StageAlpha Revenue Intelligence System SQL
-- This file implements the intelligence engine views and functions

-- 1. RPAED Engine (Revenue Per Available Equipment Day)
DROP VIEW IF EXISTS v_rpaed_analysis CASCADE;
CREATE VIEW v_rpaed_analysis AS
WITH equipment_stats AS (
  SELECT
    e.id,
    e.name,
    c.name AS category,
    e.stock_qty,
    e.base_price,
    e.current_price,

    -- Days since equipment was added to inventory
    EXTRACT(DAY FROM NOW() - e.created_at) AS days_available_total,

    -- Total booking-days: sum of (event durations) for this equipment
    COALESCE(SUM(
      CASE WHEN b.status = 'completed' 
      THEN bi.qty  -- qty per booking represents usage for that day
      END
    ), 0) AS total_booking_days,

    -- Total revenue from this equipment
    COALESCE(SUM(
      CASE WHEN b.status = 'completed' 
      THEN bi.final_price * bi.qty 
      END
    ), 0) AS total_revenue,

    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS total_bookings

  FROM equipment e
  JOIN categories c ON e.category_id = c.id
  LEFT JOIN booking_items bi ON bi.equipment_id = e.id
  LEFT JOIN bookings b ON bi.booking_id = b.id
  GROUP BY e.id, e.name, c.name, e.stock_qty, e.base_price, e.current_price, e.created_at
),
rpaed_calc AS (
  SELECT *,
    -- Total available days in the fleet (units × days)
    (stock_qty * days_available_total) AS fleet_available_days,

    -- Utilization rate
    ROUND(
      CAST(total_booking_days AS DECIMAL) / NULLIF(stock_qty * days_available_total, 0) * 100,
    1) AS utilization_pct,

    -- Average Daily Rate (revenue per booked day)
    ROUND(
      CAST(total_revenue AS DECIMAL) / NULLIF(total_booking_days, 0),
    0) AS adr,

    -- RPAED: the north star metric
    ROUND(
      CAST(total_revenue AS DECIMAL) / NULLIF(stock_qty * days_available_total, 0),
    0) AS rpaed

  FROM equipment_stats
)
SELECT *,
  -- Recommendation engine
  CASE
    WHEN utilization_pct >= 80 THEN 'BUY_MORE'
    WHEN utilization_pct >= 65 THEN 'OPTIMAL'
    WHEN utilization_pct >= 40 THEN 'PROMOTE'
    WHEN utilization_pct >= 20 THEN 'REVIEW'
    ELSE 'CONSIDER_DISPOSAL'
  END AS recommendation,

  -- Potential revenue if utilization was 75% (industry benchmark)
  ROUND(adr * 0.75 * stock_qty * days_available_total / NULLIF(days_available_total, 0), 0) AS revenue_at_75pct_util,
  ROUND(adr * 0.75 * stock_qty * days_available_total / NULLIF(days_available_total, 0) - total_revenue / NULLIF(days_available_total, 0), 0) AS daily_revenue_gap,

  -- RPAED percentile rank among all equipment
  PERCENT_RANK() OVER (ORDER BY rpaed) AS rpaed_percentile

FROM rpaed_calc
ORDER BY rpaed DESC;

-- 2. Equipment Portfolio ROI (Capital Allocation)
-- Create the financial table
CREATE TABLE IF NOT EXISTS equipment_financials (
  id              SERIAL PRIMARY KEY,
  equipment_id    INT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE UNIQUE,
  purchase_price  DECIMAL(10,2) NOT NULL CHECK(purchase_price > 0),
  purchase_date   DATE NOT NULL,
  monthly_maint_cost DECIMAL(8,2) DEFAULT 0,
  expected_life_months INT DEFAULT 60,  -- 5 years default
  notes           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed financial data for existing equipment to prevent view errors
INSERT INTO equipment_financials (equipment_id, purchase_price, purchase_date, monthly_maint_cost)
SELECT id, base_price * 10, NOW() - INTERVAL '1 year', base_price * 0.1
FROM equipment
ON CONFLICT (equipment_id) DO NOTHING;

DROP VIEW IF EXISTS v_equipment_roi CASCADE;
CREATE VIEW v_equipment_roi AS
WITH monthly_revenue AS (
  SELECT
    bi.equipment_id,
    DATE_TRUNC('month', b.event_date) AS month,
    SUM(bi.final_price * bi.qty) AS month_revenue
  FROM booking_items bi
  JOIN bookings b ON bi.booking_id = b.id
  WHERE b.status = 'completed'
  GROUP BY bi.equipment_id, DATE_TRUNC('month', b.event_date)
),
avg_monthly AS (
  SELECT equipment_id,
         ROUND(AVG(month_revenue), 0) AS avg_monthly_revenue,
         COUNT(*) AS active_months
  FROM monthly_revenue
  GROUP BY equipment_id
)
SELECT
  e.id,
  e.name,
  c.name AS category,
  ef.purchase_price,
  ef.purchase_date,
  ef.monthly_maint_cost,
  ef.expected_life_months,

  -- Revenue metrics
  COALESCE(am.avg_monthly_revenue, 0) AS avg_monthly_revenue,
  COALESCE(am.avg_monthly_revenue * 12, 0) AS projected_annual_revenue,

  -- Cost metrics
  ef.monthly_maint_cost * 12 AS annual_maint_cost,

  -- ROI
  ROUND(
    (COALESCE(am.avg_monthly_revenue * 12, 0) - ef.monthly_maint_cost * 12) 
    / NULLIF(ef.purchase_price, 0) * 100,
  1) AS annual_roi_pct,

  -- Payback period in months
  ROUND(
    ef.purchase_price / NULLIF(COALESCE(am.avg_monthly_revenue, 0) - ef.monthly_maint_cost, 0),
  1) AS payback_months,

  -- Months owned
  EXTRACT(MONTH FROM AGE(NOW(), ef.purchase_date)) +
  EXTRACT(YEAR FROM AGE(NOW(), ef.purchase_date)) * 12 AS months_owned,

  -- Has it paid for itself yet?
  CASE
    WHEN (COALESCE(am.avg_monthly_revenue, 0) - ef.monthly_maint_cost) * 
         (EXTRACT(MONTH FROM AGE(NOW(), ef.purchase_date)) + 
          EXTRACT(YEAR FROM AGE(NOW(), ef.purchase_date)) * 12)
         >= ef.purchase_price
    THEN true ELSE false
  END AS has_paid_off,

  -- Recommendation
  CASE
    WHEN ROUND(ef.purchase_price / NULLIF(COALESCE(am.avg_monthly_revenue, 0) - ef.monthly_maint_cost, 0), 1) < 18
    THEN 'STRONG_PERFORMER'
    WHEN ROUND(ef.purchase_price / NULLIF(COALESCE(am.avg_monthly_revenue, 0) - ef.monthly_maint_cost, 0), 1) < 36
    THEN 'ADEQUATE'
    WHEN COALESCE(am.avg_monthly_revenue, 0) <= ef.monthly_maint_cost
    THEN 'LOSING_MONEY'
    ELSE 'UNDERPERFORMING'
  END AS roi_recommendation

FROM equipment e
JOIN categories c ON e.category_id = c.id
JOIN equipment_financials ef ON e.id = ef.equipment_id
LEFT JOIN avg_monthly am ON e.id = am.equipment_id
ORDER BY annual_roi_pct DESC NULLS LAST;

-- 4. Pricing Configuration Table
CREATE TABLE IF NOT EXISTS pricing_config (
  id                    SERIAL PRIMARY KEY,
  early_bird_days       INT DEFAULT 60,
  early_bird_mult       DECIMAL(4,3) DEFAULT 0.95,
  standard_days         INT DEFAULT 30,
  advance_days          INT DEFAULT 14,
  advance_mult          DECIMAL(4,3) DEFAULT 1.10,
  near_term_days        INT DEFAULT 7,
  near_term_mult        DECIMAL(4,3) DEFAULT 1.20,
  last_minute_days      INT DEFAULT 3,
  last_minute_mult      DECIMAL(4,3) DEFAULT 1.35,
  emergency_mult        DECIMAL(4,3) DEFAULT 1.50,
  peak_months           INT[] DEFAULT '{11,12,1,2}',
  peak_multiplier       DECIMAL(4,3) DEFAULT 1.20,
  shoulder_months       INT[] DEFAULT '{10,3}',
  shoulder_multiplier   DECIMAL(4,3) DEFAULT 1.10,
  is_active             BOOLEAN DEFAULT true,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Seed pricing config
INSERT INTO pricing_config DEFAULT VALUES ON CONFLICT DO NOTHING;

-- 4. Time-to-Event Pricing Rule Function
CREATE OR REPLACE FUNCTION calculate_smart_price(
  p_equipment_id INT,
  p_event_date DATE,
  p_booking_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  equipment_name TEXT,
  base_price DECIMAL,
  days_to_event INT,
  time_tier TEXT,
  time_multiplier DECIMAL,
  season_multiplier DECIMAL,
  season_reason TEXT,
  duration_multiplier DECIMAL,
  final_price DECIMAL,
  savings_vs_lastminute DECIMAL,
  policy_text TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_days_to_event INT;
  v_time_mult DECIMAL;
  v_time_tier TEXT;
  v_season_mult DECIMAL;
  v_season_reason TEXT;
  v_base_price DECIMAL;
  v_name TEXT;
BEGIN
  SELECT e.name, e.base_price INTO v_name, v_base_price FROM equipment e WHERE e.id = p_equipment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Equipment % not found', p_equipment_id; END IF;

  v_days_to_event := (p_event_date - p_booking_date);

  CASE
    WHEN v_days_to_event >= 60 THEN v_time_mult := 0.95; v_time_tier := 'EARLY_BIRD';
    WHEN v_days_to_event >= 30 THEN v_time_mult := 1.00; v_time_tier := 'STANDARD';
    WHEN v_days_to_event >= 14 THEN v_time_mult := 1.10; v_time_tier := 'ADVANCE';
    WHEN v_days_to_event >= 7  THEN v_time_mult := 1.20; v_time_tier := 'NEAR_TERM';
    WHEN v_days_to_event >= 3  THEN v_time_mult := 1.35; v_time_tier := 'LAST_MINUTE';
    ELSE                            v_time_mult := 1.50; v_time_tier := 'EMERGENCY';
  END CASE;

  CASE EXTRACT(MONTH FROM p_event_date)::INT
    WHEN 11, 12, 1, 2 THEN v_season_mult := 1.20; v_season_reason := 'Peak wedding & festive season';
    WHEN 10, 3        THEN v_season_mult := 1.10; v_season_reason := 'Shoulder season';
    WHEN 4, 5         THEN v_season_mult := 1.05; v_season_reason := 'Summer events';
    ELSE                   v_season_mult := 1.00; v_season_reason := 'Standard period';
  END CASE;

  RETURN QUERY SELECT
    v_name, v_base_price, v_days_to_event, v_time_tier, v_time_mult, v_season_mult, v_season_reason, 1.00::DECIMAL,
    ROUND((v_base_price * v_time_mult * v_season_mult) / 50) * 50,
    ROUND(v_base_price * 1.50 * v_season_mult) - ROUND((v_base_price * v_time_mult * v_season_mult) / 50) * 50,
    FORMAT('%s pricing: %s days before event (%s). %s.', v_time_tier, v_days_to_event, v_season_reason,
      CASE v_time_tier
        WHEN 'EARLY_BIRD' THEN 'Book 60+ days early for 5% discount!'
        WHEN 'STANDARD' THEN 'Standard rates apply'
        WHEN 'ADVANCE' THEN 'Book early to save vs last-minute rates'
        WHEN 'NEAR_TERM' THEN '20% premium applies within 2 weeks'
        WHEN 'LAST_MINUTE' THEN '35% last-minute premium'
        ELSE '50% emergency booking premium'
      END
    );
END;
$$;

-- 5. Demand Forecasting
CREATE OR REPLACE FUNCTION forecast_demand(
  p_equipment_id INT,
  p_forecast_weeks INT DEFAULT 4
)
RETURNS TABLE(
  week_start DATE,
  historical_avg DECIMAL,
  seasonal_index DECIMAL,
  predicted_bookings DECIMAL,
  confidence TEXT,
  utilization_forecast_pct DECIMAL
)
LANGUAGE plpgsql AS $$
DECLARE
  v_stock_qty INT;
BEGIN
  SELECT stock_qty INTO v_stock_qty FROM equipment WHERE id = p_equipment_id;

  RETURN QUERY
  WITH weekly_history AS (
    SELECT
      DATE_TRUNC('week', b.event_date)::DATE AS week_start,
      SUM(bi.qty) AS total_qty_booked,
      EXTRACT(WEEK FROM b.event_date) AS week_of_year,
      EXTRACT(MONTH FROM b.event_date) AS month_of_year
    FROM booking_items bi
    JOIN bookings b ON bi.booking_id = b.id
    WHERE bi.equipment_id = p_equipment_id
      AND b.status = 'completed'
      AND b.event_date >= NOW() - INTERVAL '52 weeks'
    GROUP BY DATE_TRUNC('week', b.event_date), EXTRACT(WEEK FROM b.event_date), EXTRACT(MONTH FROM b.event_date)
  ),
  global_avg AS (
    SELECT AVG(total_qty_booked) AS overall_avg FROM weekly_history
  ),
  seasonal_indices AS (
    SELECT
      month_of_year,
      AVG(total_qty_booked) / NULLIF((SELECT overall_avg FROM global_avg), 0) AS seasonal_index
    FROM weekly_history
    GROUP BY month_of_year
  ),
  moving_avg AS (
    SELECT AVG(total_qty_booked) AS recent_avg
    FROM weekly_history
    WHERE week_start >= NOW() - INTERVAL '4 weeks'
  ),
  forecast_weeks_series AS (
    SELECT generate_series(
      DATE_TRUNC('week', NOW() + INTERVAL '1 week')::DATE,
      DATE_TRUNC('week', NOW() + (p_forecast_weeks || ' weeks')::INTERVAL)::DATE,
      '1 week'
    )::DATE AS forecast_week
  )
  SELECT
    fws.forecast_week,
    ROUND((SELECT recent_avg FROM moving_avg), 1) AS historical_avg,
    COALESCE(si.seasonal_index, 1.0) AS seasonal_index,
    ROUND(COALESCE((SELECT recent_avg FROM moving_avg),0) * COALESCE(si.seasonal_index, 1.0), 1) AS predicted_bookings,
    CASE
      WHEN (SELECT COUNT(*) FROM weekly_history) >= 20 THEN 'HIGH (20+ weeks of data)'
      WHEN (SELECT COUNT(*) FROM weekly_history) >= 8  THEN 'MEDIUM (8+ weeks of data)'
      ELSE 'LOW (insufficient history)'
    END AS confidence,
    ROUND(
      COALESCE((SELECT recent_avg FROM moving_avg),0) * COALESCE(si.seasonal_index, 1.0)
      / NULLIF(v_stock_qty, 0) * 100,
    1) AS utilization_forecast_pct
  FROM forecast_weeks_series fws
  LEFT JOIN seasonal_indices si
    ON EXTRACT(MONTH FROM fws.forecast_week) = si.month_of_year;
END;
$$;
