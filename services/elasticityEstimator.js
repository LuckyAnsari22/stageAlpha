/**
 * ELASTICITY ESTIMATOR SERVICE
 * 
 * Implements OLS (Ordinary Least Squares) linear regression for price
 * elasticity of demand estimation in JavaScript.
 * 
 * The Academic Core:
 *   Demand follows a power function: Q = A × P^ε
 *   Log-linearize: ln(Q) = ln(A) + ε × ln(P)
 *   OLS gives us ε (elasticity coefficient) and ln(A) (intercept).
 * 
 * Interpretation:
 *   ε = -1.5 means: 1% price increase → 1.5% demand decrease
 *   |ε| > 1: elastic demand (price-sensitive — lower price captures more revenue)
 *   |ε| < 1: inelastic demand (price-insensitive — raise price safely)
 *   |ε| = 1: unit elastic (revenue unchanged by price changes)
 * 
 * This is the same technique used by airlines, hotels, and ride-sharing
 * companies for yield management / dynamic pricing.
 */

const db = require('../config/db');

class ElasticityEstimator {
  /**
   * Default elasticity when insufficient data is available.
   * -1.5 is a conservative assumption for most goods.
   */
  static DEFAULT_ELASTICITY = -1.5;
  static DEFAULT_INTERCEPT = 2.0;
  static MIN_SAMPLE_SIZE = 10;

  /**
   * Estimate price elasticity for a specific equipment item.
   * 
   * Algorithm:
   * 1. Fetch historical booking data: (price, quantity) pairs grouped by week
   * 2. Transform to log-log space: ln(price), ln(qty)
   * 3. Compute OLS regression: slope = ε, intercept = ln(A)
   * 4. Compute R² goodness-of-fit
   * 5. Store result in elasticity_estimates table
   * 
   * @param {number} equipmentId - Equipment to estimate elasticity for
   * @returns {Object} { elasticity, intercept, r_squared, sampleSize, confidence }
   */
  async estimate(equipmentId) {
    // Step 1: Fetch historical price-demand data
    const dataResult = await db.query(`
      SELECT 
        bi.final_price AS price,
        SUM(bi.qty) AS demand,
        DATE_TRUNC('week', b.event_date) AS booking_week
      FROM booking_items bi
      JOIN bookings b ON bi.booking_id = b.id
      WHERE b.status = 'completed'
        AND bi.equipment_id = $1
        AND bi.final_price > 0
      GROUP BY bi.final_price, DATE_TRUNC('week', b.event_date)
      ORDER BY booking_week
    `, [equipmentId]);

    const rawData = dataResult.rows;

    // Not enough data? Return defaults
    if (rawData.length < ElasticityEstimator.MIN_SAMPLE_SIZE) {
      const defaultResult = {
        elasticity: ElasticityEstimator.DEFAULT_ELASTICITY,
        intercept: ElasticityEstimator.DEFAULT_INTERCEPT,
        r_squared: 0,
        sampleSize: rawData.length,
        confidence: 'DEFAULT'
      };

      // Store default estimate
      await this._upsertEstimate(equipmentId, defaultResult);
      return defaultResult;
    }

    // Step 2: Transform to log-log space
    // Filter out zero/negative values (can't take log)
    const logData = rawData
      .filter(d => parseFloat(d.price) > 0 && parseInt(d.demand) > 0)
      .map(d => ({
        logPrice: Math.log(parseFloat(d.price)),
        logDemand: Math.log(parseInt(d.demand))
      }));

    if (logData.length < ElasticityEstimator.MIN_SAMPLE_SIZE) {
      const defaultResult = {
        elasticity: ElasticityEstimator.DEFAULT_ELASTICITY,
        intercept: ElasticityEstimator.DEFAULT_INTERCEPT,
        r_squared: 0,
        sampleSize: logData.length,
        confidence: 'DEFAULT'
      };
      await this._upsertEstimate(equipmentId, defaultResult);
      return defaultResult;
    }

    // Step 3: Compute OLS regression
    // ln(Q) = α + ε × ln(P)
    // slope (ε) = Σ((x - x̄)(y - ȳ)) / Σ((x - x̄)²)
    // intercept (α) = ȳ - ε × x̄
    const n = logData.length;
    const x = logData.map(d => d.logPrice);   // independent variable: ln(Price)
    const y = logData.map(d => d.logDemand);   // dependent variable: ln(Quantity)

    const xMean = x.reduce((s, v) => s + v, 0) / n;
    const yMean = y.reduce((s, v) => s + v, 0) / n;

    let numerator = 0;   // Σ((x - x̄)(y - ȳ))
    let denominator = 0;  // Σ((x - x̄)²)

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += (x[i] - xMean) * (x[i] - xMean);
    }

    // Prevent division by zero (all prices identical = no price variation)
    if (denominator === 0) {
      const defaultResult = {
        elasticity: ElasticityEstimator.DEFAULT_ELASTICITY,
        intercept: ElasticityEstimator.DEFAULT_INTERCEPT,
        r_squared: 0,
        sampleSize: n,
        confidence: 'DEFAULT'
      };
      await this._upsertEstimate(equipmentId, defaultResult);
      return defaultResult;
    }

    const elasticity = numerator / denominator;       // ε (slope)
    const intercept = yMean - elasticity * xMean;     // α (intercept = ln(A))

    // Step 4: Compute R² (goodness of fit)
    // R² = 1 - SS_res / SS_tot
    // SS_tot = Σ(y - ȳ)²
    // SS_res = Σ(y - ŷ)² where ŷ = α + ε × x
    let ssTot = 0;
    let ssRes = 0;

    for (let i = 0; i < n; i++) {
      const yPredicted = intercept + elasticity * x[i];
      ssTot += (y[i] - yMean) * (y[i] - yMean);
      ssRes += (y[i] - yPredicted) * (y[i] - yPredicted);
    }

    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

    // Determine confidence level
    let confidence = 'LOW';
    if (rSquared >= 0.7) confidence = 'HIGH';
    else if (rSquared >= 0.4) confidence = 'MEDIUM';

    const result = {
      elasticity: Math.round(elasticity * 10000) / 10000,
      intercept: Math.round(intercept * 10000) / 10000,
      r_squared: Math.round(rSquared * 10000) / 10000,
      sampleSize: n,
      confidence
    };

    // Step 5: Store result in database
    await this._upsertEstimate(equipmentId, result);

    return result;
  }

  /**
   * Compute the revenue-maximizing price using the Lerner formula.
   * 
   * Lerner Formula (Microeconomics):
   *   P* = |ε| / (|ε| - 1) × MC
   * 
   * Where:
   *   P* = optimal price (revenue-maximizing)
   *   ε  = price elasticity of demand
   *   MC = marginal cost (we use base_price as proxy)
   * 
   * Constraints:
   *   - |ε| must be > 1 (elastic demand) for formula to work
   *   - If |ε| ≤ 1 (inelastic), use a conservative 1.5× markup
   *   - Cap final price at 2× base_price to prevent price shock
   * 
   * @param {number} basePrice - Equipment base/cost price (MC proxy)
   * @param {number} elasticity - Elasticity coefficient (negative value)
   * @param {Object} options - { seasonalFactor, inventoryFactor }
   * @returns {Object} { optimalPrice, lernerMarkup, factors }
   */
  computeOptimalPrice(basePrice, elasticity, options = {}) {
    const absElasticity = Math.abs(elasticity);
    const seasonalFactor = options.seasonalFactor || 1.0;
    const inventoryFactor = options.inventoryFactor || 1.0;

    let lernerMarkup;

    if (absElasticity > 1) {
      // Standard Lerner formula
      lernerMarkup = absElasticity / (absElasticity - 1);
    } else {
      // Inelastic demand: formula gives infinity or negative
      // Use conservative 1.5× markup
      lernerMarkup = 1.5;
    }

    // Cap Lerner markup at 3× (prevents extreme pricing)
    lernerMarkup = Math.min(lernerMarkup, 3.0);

    // Calculate optimal price with all factors
    let optimalPrice = basePrice * lernerMarkup * seasonalFactor * inventoryFactor;

    // Hard cap: never exceed 2× base price (prevent sticker shock)
    const maxPrice = basePrice * 2.0;
    optimalPrice = Math.min(optimalPrice, maxPrice);

    // Round to nearest ₹50 (Indian pricing convention)
    optimalPrice = Math.round(optimalPrice / 50) * 50;

    // Floor: never go below base price
    optimalPrice = Math.max(optimalPrice, basePrice);

    return {
      optimalPrice,
      lernerMarkup: Math.round(lernerMarkup * 100) / 100,
      seasonalFactor,
      inventoryFactor,
      basePrice,
      elasticity,
      maxPriceCap: maxPrice,
      wasCapped: optimalPrice >= maxPrice
    };
  }

  /**
   * Upsert elasticity estimate into the database.
   * Uses ON CONFLICT to update if equipment already has an estimate.
   */
  async _upsertEstimate(equipmentId, result) {
    try {
      await db.query(`
        INSERT INTO elasticity_estimates 
          (equipment_id, elasticity_coeff, demand_intercept, r_squared, sample_size)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (equipment_id) DO UPDATE SET
          elasticity_coeff = $2,
          demand_intercept = $3,
          r_squared = $4,
          sample_size = $5,
          estimated_at = NOW()
      `, [
        equipmentId,
        result.elasticity,
        result.intercept,
        result.r_squared,
        result.sampleSize
      ]);
    } catch (err) {
      console.error('Failed to store elasticity estimate:', err.message);
    }
  }
}

module.exports = new ElasticityEstimator();
