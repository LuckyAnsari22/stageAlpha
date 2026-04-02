-- ============================================================
-- StageAlpha — Event Equipment Rental Platform
-- db/procedures.sql
-- 4 Stored Procedures: Elasticity, Pricing, Backtest, Batch
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. estimate_price_elasticity (OLS Regression)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION estimate_price_elasticity(p_eq_id INT)
RETURNS DECIMAL AS $$
DECLARE
    v_slope DECIMAL;
    v_avg_p DECIMAL;
    v_avg_q DECIMAL;
    v_elasticity DECIMAL;
    v_r_squared DECIMAL;
    v_sample INT;
BEGIN
    -- REGR_SLOPE(Y, X) -> we want demand elasticity: % change in Q / % change in P
    -- OLS of qty on price
    SELECT 
        COALESCE(REGR_SLOPE(qty, algorithm_price_at_booking), 0)::DECIMAL,
        COALESCE(REGR_R2(qty, algorithm_price_at_booking), 0)::DECIMAL,
        AVG(algorithm_price_at_booking),
        AVG(qty),
        COUNT(*)
    INTO v_slope, v_r_squared, v_avg_p, v_avg_q, v_sample
    FROM booking_items bi
    JOIN bookings b ON bi.booking_id = b.id
    WHERE bi.equipment_id = p_eq_id
      AND b.status IN ('completed', 'confirmed');
      
    IF v_avg_q > 0 AND v_slope != 0 THEN
        -- Point elasticity: slope * (P/Q)
        v_elasticity := ROUND(v_slope * (v_avg_p / v_avg_q), 4);
    ELSE
        v_elasticity := -1.5; -- Default fallback
    END IF;

    -- Ensure elasticity is negative and realistic for Lerner formula
    IF v_elasticity >= -1.05 THEN
        v_elasticity := -1.5;
    END IF;

    -- Upsert the estimate
    INSERT INTO elasticity_estimates (equipment_id, elasticity_coeff, demand_intercept, r_squared, sample_size, estimated_at)
    VALUES (p_eq_id, v_elasticity, COALESCE(v_avg_q - (v_slope * v_avg_p), 2.0), v_r_squared, v_sample, NOW())
    ON CONFLICT (equipment_id) DO UPDATE 
    SET elasticity_coeff = EXCLUDED.elasticity_coeff,
        demand_intercept = EXCLUDED.demand_intercept,
        r_squared = EXCLUDED.r_squared,
        sample_size = EXCLUDED.sample_size,
        estimated_at = NOW();

    RETURN v_elasticity;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 2. calculate_optimal_price (Lerner Formula)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_optimal_price(p_equipment_id INT, p_target_date DATE)
RETURNS TABLE (
    equipment_id INT,
    base_price DECIMAL,
    elasticity DECIMAL,
    marginal_cost DECIMAL,
    lerner_price DECIMAL,
    seasonal_multiplier DECIMAL,
    final_optimal_price DECIMAL
) AS $$
DECLARE
    v_base_price DECIMAL;
    v_elast DECIMAL;
    v_mc DECIMAL;
    v_lerner DECIMAL;
    v_season DECIMAL := 1.0;
    v_month INT;
BEGIN
    SELECT e.base_price INTO v_base_price FROM equipment e WHERE id = p_equipment_id;
    
    -- Mocking Marginal Cost as 40% of base price for rental operations (maintenance, logistics avg)
    v_mc := v_base_price * 0.40; 
    
    v_elast := estimate_price_elasticity(p_equipment_id);
    
    -- Lerner Index Pricing: P = MC * (|E| / (|E| - 1))
    v_lerner := v_mc * (ABS(v_elast) / (ABS(v_elast) - 1));
    
    v_month := EXTRACT(MONTH FROM p_target_date);
    IF v_month IN (1, 2, 11, 12) THEN v_season := 1.25;      -- Peak Wedding/Festive
    ELSIF v_month IN (3, 4, 5, 10) THEN v_season := 1.0;     -- Regular
    ELSE v_season := 0.85;                                   -- Off-season (Monsoon)
    END IF;
    
    RETURN QUERY SELECT 
        p_equipment_id,
        v_base_price,
        v_elast,
        ROUND(v_mc, 2),
        ROUND(v_lerner, 2),
        v_season,
        ROUND(v_lerner * v_season, 2);
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 3. run_backtest (Revenue Simulation)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION run_backtest(p_start DATE, p_end DATE)
RETURNS TABLE (
    period_start DATE,
    period_end DATE,
    n_bookings INT,
    actual_revenue DECIMAL,      -- Base pricing total
    algorithm_revenue DECIMAL,   -- Algorithmic pricing total
    improvement_pct DECIMAL
) AS $$
DECLARE
    v_actual DECIMAL;
    v_algo DECIMAL;
    v_count INT;
    v_improv DECIMAL := 0;
BEGIN
    -- 'actual_revenue' here is represented by the base price to compare standard vs dynamic models
    SELECT 
        COUNT(DISTINCT b.id),
        COALESCE(SUM(bi.qty * bi.base_price_at_booking), 0),
        COALESCE(SUM(bi.qty * bi.algorithm_price_at_booking), 0)
    INTO v_count, v_actual, v_algo
    FROM bookings b
    JOIN booking_items bi ON b.id = bi.booking_id
    WHERE b.event_date BETWEEN p_start AND p_end
      AND b.status IN ('completed', 'confirmed');
      
    IF v_actual > 0 THEN
        v_improv := ROUND((v_algo - v_actual) / v_actual * 100, 2);
    END IF;

    INSERT INTO backtest_results (period_start, period_end, n_bookings, actual_revenue, algorithm_revenue)
    VALUES (p_start, p_end, v_count, v_actual, v_algo);

    RETURN QUERY SELECT p_start, p_end, v_count, v_actual, v_algo, v_improv;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 4. batch_update_prices (Nightly Cron job)
-- ─────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE batch_update_prices()
AS $$
DECLARE
    eq RECORD;
    v_opt_price DECIMAL;
BEGIN
    FOR eq IN SELECT id, base_price, current_price FROM equipment WHERE is_active = true LOOP
        SELECT final_optimal_price INTO v_opt_price FROM calculate_optimal_price(eq.id, CURRENT_DATE);
        
        IF v_opt_price IS NOT NULL AND v_opt_price != eq.current_price THEN
            INSERT INTO price_history(equipment_id, old_price, new_price, change_reason, trigger_type)
            VALUES (eq.id, eq.current_price, v_opt_price, 'Nightly batch rebalance', 'BATCH');
            
            UPDATE equipment SET current_price = v_opt_price, updated_at = NOW() WHERE id = eq.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
