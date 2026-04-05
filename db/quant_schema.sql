-- StageAlpha Quant Module Schema Extension
-- Enables OLS Regression Tracking, Thompson Sampling State, and Backtesting

CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
    old_price DECIMAL(10, 2) NOT NULL,
    new_price DECIMAL(10, 2) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(50) DEFAULT 'ALGORITHM_UPDATE',
    confidence_score DECIMAL(5, 4) -- Used to track Thompson Sampling Beta distribution confidence
);

CREATE TABLE IF NOT EXISTS pricing_models (
    equipment_id INTEGER PRIMARY KEY REFERENCES equipment(id) ON DELETE CASCADE,
    model_type VARCHAR(20) CHECK (model_type IN ('OLS_REGRESSION', 'THOMPSON_SAMPLING')),
    elasticity_coefficient DECIMAL(10, 4),
    r_squared DECIMAL(5, 4),
    observations INTEGER DEFAULT 0,
    alpha_wins INTEGER DEFAULT 1, -- Thompson Sampling Beta(α, β)
    beta_losses INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backtest_results (
    id SERIAL PRIMARY KEY,
    run_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    horizon_days INTEGER NOT NULL,
    baseline_revenue DECIMAL(12, 2) NOT NULL,
    algo_revenue DECIMAL(12, 2) NOT NULL,
    improvement_pct DECIMAL(6, 2) NOT NULL,
    parameters JSONB -- Store Bellman constraints or OLS thresholds
);

-- PostgreSQL OLS Elasticity Estimator (Log-Log Regression)
CREATE OR REPLACE FUNCTION estimate_price_elasticity(p_equipment_id INTEGER)
RETURNS TABLE (coeff NUMERIC, r2 NUMERIC, obs BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(REGR_SLOPE(LN(NULLIF(qty, 0)), LN(NULLIF(final_price, 0)))::NUMERIC, 4) AS coeff,
        ROUND(REGR_R2(LN(NULLIF(qty, 0)), LN(NULLIF(final_price, 0)))::NUMERIC, 4) AS r2,
        COUNT(id) AS obs
    FROM booking_items
    WHERE equipment_id = p_equipment_id AND qty > 0 AND final_price > 0;
END;
$$ LANGUAGE plpgsql;
