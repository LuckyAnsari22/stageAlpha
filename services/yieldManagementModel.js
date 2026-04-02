/**
 * YIELD MANAGEMENT MODEL
 * 
 * Extends the base pricing engine with real-world factors:
 * 1. Seasonal demand (Indian wedding calendar, festivals, monsoon)
 * 2. Inventory scarcity premium (low stock → higher price)
 * 3. Day-of-week adjustments (weekends are peak)
 * 4. RevPAE metric (Revenue Per Available Equipment-day)
 * 
 * This mirrors how airlines and hotels price dynamically:
 * - Base price × elasticity factor × seasonal factor × inventory factor
 * - Each factor is independently tunable and auditable
 * 
 * Teaching: This is the yield management layer that sits on top of
 * the elasticity estimator. It adds domain knowledge to the math.
 */

const db = require('../config/db');

class YieldManagementModel {

  /**
   * Seasonal factors for Indian event market.
   * These reflect real demand patterns in the Indian events industry.
   * 
   * High demand (1.2-1.35×):
   *   - October-November: Dussehra, Diwali, wedding season starts
   *   - December: Christmas, New Year, peak wedding season
   *   - January-February: Wedding season continues
   * 
   * Medium demand (1.0-1.1×):
   *   - March: Holi, season end
   *   - April-May: Corporate events, summer events
   *   - September: Post-monsoon recovery, Navratri
   * 
   * Low demand (0.85-0.95×):
   *   - June-August: Monsoon season (outdoor events down)
   *   - July: Shravan month (no Hindu weddings)
   */
  static SEASONAL_FACTORS = {
    1:  1.30,   // January — peak wedding season
    2:  1.25,   // February — wedding season + Valentine's events
    3:  1.10,   // March — Holi, season winding down
    4:  1.05,   // April — corporate events
    5:  1.00,   // May — summer events, baseline
    6:  0.90,   // June — monsoon starts
    7:  0.85,   // July — peak monsoon, Shravan
    8:  0.88,   // August — monsoon continues
    9:  1.05,   // September — post-monsoon, Navratri
    10: 1.25,   // October — Dussehra, weddings resume
    11: 1.30,   // November — Diwali, peak wedding
    12: 1.35,   // December — Christmas, New Year, peak demand
  };

  /**
   * Day-of-week multipliers.
   * Weekend events command premium pricing.
   */
  static DOW_FACTORS = {
    0: 1.20,  // Sunday — premium
    1: 0.90,  // Monday — low
    2: 0.90,  // Tuesday — low
    3: 0.95,  // Wednesday — mid-week
    4: 1.00,  // Thursday — baseline
    5: 1.15,  // Friday — pre-weekend
    6: 1.25,  // Saturday — premium
  };

  /**
   * Compute seasonal price factor for a given event date.
   * Combines monthly seasonality with day-of-week adjustment.
   * 
   * @param {string|Date} eventDate - Event date
   * @returns {Object} { factor, month, monthName, dayFactor, description }
   */
  computeSeasonalFactor(eventDate) {
    const date = new Date(eventDate);
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDay(); // 0-6

    const monthFactor = YieldManagementModel.SEASONAL_FACTORS[month] || 1.0;
    const dayFactor = YieldManagementModel.DOW_FACTORS[day] || 1.0;

    // Combined seasonal factor (month × day-of-week)
    // Cap combined at 1.5× to prevent extreme seasonal pricing
    const combined = Math.min(monthFactor * dayFactor, 1.50);

    const monthNames = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Human-readable description for the UI
    let description = '';
    if (monthFactor >= 1.25) description = 'Peak season (weddings/festivals)';
    else if (monthFactor >= 1.10) description = 'High demand period';
    else if (monthFactor >= 1.00) description = 'Standard demand';
    else description = 'Low demand (monsoon/off-season)';

    return {
      factor: Math.round(combined * 100) / 100,
      monthFactor: monthFactor,
      dayFactor: dayFactor,
      month: month,
      monthName: monthNames[month],
      dayName: dayNames[day],
      description
    };
  }

  /**
   * Compute inventory scarcity factor.
   * Low stock → premium pricing (economic scarcity principle).
   * 
   * Tiers:
   *   stock = 0:     Not available (no factor, should be blocked)
   *   stock 1-2:     Critical scarcity → 1.35× premium
   *   stock 3-5:     Low stock → 1.20× premium
   *   stock 6-10:    Normal → 1.05× slight premium
   *   stock > 10:    Abundant → 1.00× (no adjustment)
   * 
   * @param {number} stockQty - Current stock quantity
   * @returns {Object} { factor, level, description }
   */
  computeInventoryFactor(stockQty) {
    const qty = parseInt(stockQty) || 0;

    if (qty <= 0) {
      return {
        factor: 1.0,
        level: 'OUT_OF_STOCK',
        description: 'Out of stock — cannot book'
      };
    }

    if (qty <= 2) {
      return {
        factor: 1.35,
        level: 'CRITICAL',
        description: 'Last few units — scarcity premium applied'
      };
    }

    if (qty <= 5) {
      return {
        factor: 1.20,
        level: 'LOW',
        description: 'Low stock — moderate premium'
      };
    }

    if (qty <= 10) {
      return {
        factor: 1.05,
        level: 'NORMAL',
        description: 'Standard availability'
      };
    }

    return {
      factor: 1.00,
      level: 'ABUNDANT',
      description: 'High availability — no adjustment'
    };
  }

  /**
   * Compute Revenue Per Available Equipment-day (RevPAE).
   * 
   * RevPAE = Total Revenue / (Available Units × Days in Period)
   * 
   * This is analogous to RevPAR in hospitality:
   * Revenue Per Available Room = Total Room Revenue / Available Rooms
   * 
   * Higher RevPAE = better utilization of equipment inventory.
   * 
   * @param {number} equipmentId - Equipment to analyze
   * @param {number} days - Period in days (default: 30)
   * @returns {Object} { revpae, totalRevenue, availableDays, utilization }
   */
  async computeRevPAE(equipmentId, days = 30) {
    try {
      const result = await db.query(`
        SELECT 
          COALESCE(SUM(bi.final_price * bi.qty), 0) AS total_revenue,
          COUNT(DISTINCT DATE(b.event_date)) AS booked_days,
          e.stock_qty
        FROM equipment e
        LEFT JOIN booking_items bi ON e.id = bi.equipment_id
        LEFT JOIN bookings b ON bi.booking_id = b.id 
          AND b.status IN ('completed', 'confirmed')
          AND b.event_date >= CURRENT_DATE - INTERVAL '1 day' * $2
        WHERE e.id = $1
        GROUP BY e.id, e.stock_qty
      `, [equipmentId, days]);

      if (result.rows.length === 0) {
        return { revpae: 0, totalRevenue: 0, availableDays: 0, utilization: 0 };
      }

      const row = result.rows[0];
      const totalRevenue = parseFloat(row.total_revenue);
      const stockQty = parseInt(row.stock_qty) || 1;
      const bookedDays = parseInt(row.booked_days) || 0;
      const availableDays = stockQty * days;

      const revpae = availableDays > 0 ? totalRevenue / availableDays : 0;
      const utilization = days > 0 ? (bookedDays / days) * 100 : 0;

      return {
        revpae: Math.round(revpae * 100) / 100,
        totalRevenue: Math.round(totalRevenue),
        availableDays,
        bookedDays,
        utilization: Math.round(utilization * 10) / 10
      };
    } catch (err) {
      console.error('RevPAE computation error:', err.message);
      return { revpae: 0, totalRevenue: 0, availableDays: 0, utilization: 0 };
    }
  }

  /**
   * Compute optimal stock level using the Newsvendor model.
   * 
   * Newsvendor optimal: Q* where P(D ≤ Q*) = (p - c) / (p - s)
   *   p = selling price
   *   c = cost price
   *   s = salvage value (0 for perishable capacity)
   *   D = demand (uncertain)
   * 
   * Critical ratio: CR = (p - c) / (p - s)
   * 
   * For equipment rental:
   *   - p = rental price per day
   *   - c = maintenance cost per day (approximate)
   *   - s = 0 (idle equipment earns nothing)
   *   - CR = (price - cost) / price = profit margin
   * 
   * @param {number} rentalPrice - Current rental price
   * @param {number} costPerDay - Estimated daily cost
   * @param {number} avgDemand - Average daily demand
   * @param {number} demandStdDev - Standard deviation of demand
   * @returns {Object} { optimalStock, criticalRatio, expectedDemand }
   */
  computeOptimalStockLevel(rentalPrice, costPerDay, avgDemand, demandStdDev = 1.0) {
    const salvageValue = 0; // Idle equipment generates no revenue

    // Critical ratio
    const cr = (rentalPrice - costPerDay) / (rentalPrice - salvageValue);
    const clampedCR = Math.max(0.01, Math.min(0.99, cr));

    // Approximate inverse CDF of normal distribution using the Beasley-Springer-Moro algorithm
    // For simplicity, use a lookup-based approximation:
    const zScore = this._approximateInvNorm(clampedCR);

    // Optimal stock = mean demand + z × std dev
    const optimalStock = Math.max(1, Math.round(avgDemand + zScore * demandStdDev));

    return {
      optimalStock,
      criticalRatio: Math.round(clampedCR * 100) / 100,
      expectedDemand: avgDemand,
      zScore: Math.round(zScore * 100) / 100
    };
  }

  /**
   * Approximate inverse normal CDF (z-score for probability p).
   * Uses rational approximation for the central region.
   * Accurate to ~4 decimal places for 0.02 < p < 0.98.
   */
  _approximateInvNorm(p) {
    // Abramowitz and Stegun approximation (formula 26.2.23)
    if (p <= 0) return -3.0;
    if (p >= 1) return 3.0;
    if (p === 0.5) return 0;

    const t = p < 0.5
      ? Math.sqrt(-2 * Math.log(p))
      : Math.sqrt(-2 * Math.log(1 - p));

    const c0 = 2.515517;
    const c1 = 0.802853;
    const c2 = 0.010328;
    const d1 = 1.432788;
    const d2 = 0.189269;
    const d3 = 0.001308;

    const z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);

    return p < 0.5 ? -z : z;
  }
}

module.exports = new YieldManagementModel();
