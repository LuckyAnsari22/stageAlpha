/**
 * BACKTEST ENGINE — Historical Simulation Module
 * 
 * Purpose: Prove the algorithm's revenue impact using real historical data.
 * This is the single most impressive quantitative feature.
 * 
 * Algorithm:
 * 1. Fetch all COMPLETED bookings from historical period (e.g., 6 months)
 * 2. For each booking_item: actual_price = final_price, algorithm_price stored at booking time
 * 3. Calculate: actual_revenue = sum(final_price * qty), algorithm_revenue = sum(algorithm_price * qty)
 * 4. Compute improvement_pct = (algorithm_revenue - actual_revenue) / actual_revenue * 100
 * 5. Store breakdown by equipment, by month, by event type
 * 
 * Teaching: This is what separates an academic project from a professional one.
 * Using stored prices (algorithm_price_at_booking) lets you prove the algorithm worked
 * without needing to re-compute prices retroactively (which might use different logic).
 * 
 * This is the code that impresses quant/finance interviewers.
 */

const db = require('../config/db');

class BacktestEngine {
  constructor() {
    // In-progress backtest tracking: { [backtestId]: { progress, status, ... } }
    this.inProgress = new Map();
  }

  /**
   * RUN BACKTEST
   * Asynchronously run backtest for historical period
   * 
   * @param {Date} startDate - Period start (e.g., 6 months ago)
   * @param {Date} endDate - Period end (today)
   * @param {Object} options - { emitProgress: callback } for real-time updates
   * @returns {Promise<Object>} { backtest_id, status, message }
   */
  async runBacktest(startDate, endDate, options = {}) {
    const backtestId = `backtest_${Date.now()}`;
    
    try {
      // Start async process, don't wait for completion
      this._executeBacktest(backtestId, startDate, endDate, options);
      
      return {
        success: true,
        data: {
          backtest_id: backtestId,
          status: 'processing',
          message: 'Backtest started. Monitor progress via WebSocket.'
        }
      };
    } catch (error) {
      console.error('Failed to start backtest:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * EXECUTE BACKTEST (Private)
   * The actual computation happens here, running async
   */
  async _executeBacktest(backtestId, startDate, endDate, options) {
    const emitProgress = options.emitProgress || (() => {});
    const formatStart = this._formatDate(startDate);
    const formatEnd = this._formatDate(endDate);

    try {
      // Step 1: Fetch all COMPLETED bookings in period with their items
      console.log(`[Backtest ${backtestId}] Starting: ${formatStart} to ${formatEnd}`);
      emitProgress({
        backtest_id: backtestId,
        stage: 'fetching',
        message: 'Fetching historical booking data...'
      });

      const sql = `
        SELECT 
          b.id as booking_id,
          DATE(b.created_at) as booking_date,
          DATE(b.event_date) as event_date,
          c.name as customer_name,
          e.id as equipment_id,
          e.name as equipment_name,
          e.category_id,
          cat.name as category_name,
          bi.qty,
          bi.base_price_at_booking,
          bi.algorithm_price_at_booking,
          bi.final_price,
          b.total_price,
          e.stock_qty
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN booking_items bi ON b.id = bi.booking_id
        JOIN equipment e ON bi.equipment_id = e.id
        JOIN categories cat ON e.category_id = cat.id
        WHERE b.status = 'completed'
          AND DATE(b.event_date) >= $1
          AND DATE(b.event_date) <= $2
        ORDER BY b.event_date, b.id, e.id
      `;

      const result = await db.query(sql, [formatStart, formatEnd]);
      const allItems = result.rows;

      if (allItems.length === 0) {
        console.log(`[Backtest ${backtestId}] No completed bookings found in period`);
        await this._storeResult(backtestId, startDate, endDate, {
          total_bookings: 0,
          total_items: 0,
          actual_revenue: 0,
          algorithm_revenue: 0,
          improvement_pct: 0,
          breakdown_by_equipment: [],
          breakdown_by_month: [],
          top_uplift_bookings: [],
          top_downward_bookings: [],
          notes: 'No completed bookings found in this period'
        });
        emitProgress({
          backtest_id: backtestId,
          stage: 'complete',
          message: 'No data found',
          result: null
        });
        return;
      }

      console.log(`[Backtest ${backtestId}] Found ${allItems.length} items from completed bookings`);

      // Step 2: Group by booking and calculate totals
      emitProgress({
        backtest_id: backtestId,
        stage: 'processing',
        message: `Processing ${allItems.length} items...`,
        progress: 0
      });

      const bookingGroups = this._groupByBooking(allItems);
      const bookingIds = Object.keys(bookingGroups);
      
      let totalActual = 0;
      let totalAlgorithm = 0;
      const equipmentStats = {};
      const monthStats = {};
      const allUpliftBookings = [];

      // Step 3: Calculate revenue for each booking
      for (let idx = 0; idx < bookingIds.length; idx++) {
        const bookingId = bookingIds[idx];
        const items = bookingGroups[bookingId];

        // Calculate actual and algorithm revenue for this booking
        let bookingActual = 0;
        let bookingAlgorithm = 0;

        for (const item of items) {
          const actualItemRevenue = parseFloat(item.final_price) * parseInt(item.qty);
          const algorithmItemRevenue = parseFloat(item.algorithm_price_at_booking) * parseInt(item.qty);
          
          bookingActual += actualItemRevenue;
          bookingAlgorithm += algorithmItemRevenue;
        }

        totalActual += bookingActual;
        totalAlgorithm += bookingAlgorithm;

        // Track uplift
        const uplift = bookingAlgorithm - bookingActual;
        const upliftPct = bookingActual > 0 ? (uplift / bookingActual) * 100 : 0;

        allUpliftBookings.push({
          booking_id: bookingId,
          booking_date: items[0].booking_date,
          event_date: items[0].event_date,
          customer_name: items[0].customer_name,
          actual_revenue: bookingActual,
          algorithm_revenue: bookingAlgorithm,
          uplift: uplift,
          uplift_pct: upliftPct
        });

        // Aggregate by equipment
        for (const item of items) {
          const key = `${item.equipment_id}_${item.equipment_name}`;
          if (!equipmentStats[key]) {
            equipmentStats[key] = {
              equipment_name: item.equipment_name,
              category_name: item.category_name,
              actual_revenue: 0,
              algorithm_revenue: 0
            };
          }
          equipmentStats[key].actual_revenue += parseFloat(item.final_price) * parseInt(item.qty);
          equipmentStats[key].algorithm_revenue += parseFloat(item.algorithm_price_at_booking) * parseInt(item.qty);
        }

        // Aggregate by month
        const eventDateStr = items[0].event_date instanceof Date
          ? items[0].event_date.toISOString().split('T')[0]
          : String(items[0].event_date);
        const monthKey = eventDateStr.substring(0, 7); // YYYY-MM
        if (!monthStats[monthKey]) {
          monthStats[monthKey] = {
            month: monthKey,
            actual_revenue: 0,
            algorithm_revenue: 0
          };
        }
        monthStats[monthKey].actual_revenue += bookingActual;
        monthStats[monthKey].algorithm_revenue += bookingAlgorithm;

        // Emit progress
        if ((idx + 1) % Math.max(1, Math.floor(bookingIds.length / 10)) === 0) {
          emitProgress({
            backtest_id: backtestId,
            stage: 'processing',
            message: `Processing booking ${idx + 1}/${bookingIds.length}`,
            progress: Math.round((idx + 1) / bookingIds.length * 100),
            current_booking_id: bookingId
          });
        }
      }

      // Step 4: Calculate improvement percentage
      const improvementPct = totalActual > 0
        ? ((totalAlgorithm - totalActual) / totalActual) * 100
        : 0;

      console.log(`[Backtest ${backtestId}] Complete:`
        + ` ${bookingIds.length} bookings`
        + ` | Actual: ₹${totalActual.toFixed(0)}`
        + ` | Algorithm: ₹${totalAlgorithm.toFixed(0)}`
        + ` | Improvement: ${improvementPct.toFixed(2)}%`);

      // Step 5: Sort and format breakdowns
      const equipmentBreakdown = Object.values(equipmentStats)
        .map(stat => ({
          ...stat,
          uplift: stat.algorithm_revenue - stat.actual_revenue,
          uplift_pct: stat.actual_revenue > 0
            ? ((stat.algorithm_revenue - stat.actual_revenue) / stat.actual_revenue) * 100
            : 0
        }))
        .sort((a, b) => b.uplift_pct - a.uplift_pct);

      const monthBreakdown = Object.values(monthStats)
        .sort((a, b) => a.month.localeCompare(b.month));

      // Bookings with highest uplift
      const topUpliftBookings = allUpliftBookings
        .sort((a, b) => b.uplift_pct - a.uplift_pct)
        .slice(0, 10);

      // Bookings where algorithm suggested LOWER price (most conservative)
      const topDownwardBookings = allUpliftBookings
        .filter(b => b.uplift < 0)
        .sort((a, b) => a.uplift_pct - b.uplift_pct)
        .slice(0, 10);

      const resultData = {
        total_bookings: bookingIds.length,
        total_items: allItems.length,
        actual_revenue: totalActual,
        algorithm_revenue: totalAlgorithm,
        improvement_pct: improvementPct,
        breakdown_by_equipment: equipmentBreakdown,
        breakdown_by_month: monthBreakdown,
        top_uplift_bookings: topUpliftBookings,
        top_downward_bookings: topDownwardBookings
      };

      // Step 6: Store results in database
      await this._storeResult(backtestId, startDate, endDate, resultData);

      // Step 7: Emit completion event
      emitProgress({
        backtest_id: backtestId,
        stage: 'complete',
        message: 'Backtest complete',
        progress: 100,
        result: resultData
      });

    } catch (error) {
      console.error(`[Backtest ${backtestId}] Error:`, error);
      emitProgress({
        backtest_id: backtestId,
        stage: 'error',
        message: error.message,
        error: true
      });
    }
  }

  /**
   * STORE RESULT
   * Persist backtest result to backtest_results table
   */
  async _storeResult(backtestId, startDate, endDate, resultData) {
    const formatStart = this._formatDate(startDate);
    const formatEnd = this._formatDate(endDate);

    // Schema alignment:
    //   - improvement_pct is a GENERATED column — do NOT insert it
    //   - 'notes' column stores the JSON breakdown (no 'breakdown_json' column)
    //   - No 'backtest_id' column — use serial 'id' PK
    const sql = `
      INSERT INTO backtest_results 
        (run_at, period_start, period_end, 
         n_bookings, actual_revenue, algorithm_revenue, 
         notes)
      VALUES (NOW(), $1, $2, $3, $4, $5, $6)
      RETURNING id, improvement_pct
    `;

    const result = await db.query(sql, [
      formatStart,
      formatEnd,
      resultData.total_bookings,
      resultData.actual_revenue,
      resultData.algorithm_revenue,
      JSON.stringify({ ...resultData, backtest_id: backtestId })
    ]);

    // Store the DB-generated ID for reference
    if (result.rows.length > 0) {
      this.inProgress.set(backtestId, {
        db_id: result.rows[0].id,
        improvement_pct: result.rows[0].improvement_pct
      });
    }
  }

  /**
   * GET LAST RESULT
   * Fetch the most recent backtest result
   */
  async getLastResult() {
    const sql = `
      SELECT 
        id,
        run_at,
        period_start,
        period_end,
        n_bookings,
        actual_revenue,
        algorithm_revenue,
        improvement_pct,
        notes
      FROM backtest_results
      ORDER BY run_at DESC
      LIMIT 1
    `;

    const result = await db.query(sql);
    if (result.rows.length === 0) {
      return { success: false, message: 'No backtest results found' };
    }

    const row = result.rows[0];
    const breakdown = row.notes ? JSON.parse(row.notes) : {};
    return {
      success: true,
      data: {
        backtest_id: breakdown.backtest_id || `backtest_${row.id}`,
        db_id: row.id,
        run_at: row.run_at,
        period_start: row.period_start,
        period_end: row.period_end,
        n_bookings: row.n_bookings,
        actual_revenue: row.actual_revenue,
        algorithm_revenue: row.algorithm_revenue,
        improvement_pct: row.improvement_pct,
        ...breakdown
      }
    };
  }

  /**
   * GET RESULT BY ID
   * Fetch specific backtest result
   */
  async getResultById(backtestId) {
    // Try to find by DB id (integer) or by backtest_id in notes JSON
    const isNumeric = /^\d+$/.test(backtestId);
    
    let sql, params;
    if (isNumeric) {
      sql = `
        SELECT id, run_at, period_start, period_end,
               n_bookings, actual_revenue, algorithm_revenue,
               improvement_pct, notes
        FROM backtest_results WHERE id = $1
      `;
      params = [parseInt(backtestId)];
    } else {
      sql = `
        SELECT id, run_at, period_start, period_end,
               n_bookings, actual_revenue, algorithm_revenue,
               improvement_pct, notes
        FROM backtest_results 
        WHERE notes::text LIKE $1
        ORDER BY run_at DESC LIMIT 1
      `;
      params = [`%${backtestId}%`];
    }

    const result = await db.query(sql, params);
    if (result.rows.length === 0) {
      return { success: false, message: 'Backtest not found' };
    }

    const row = result.rows[0];
    const breakdown = row.notes ? JSON.parse(row.notes) : {};
    return {
      success: true,
      data: {
        backtest_id: breakdown.backtest_id || `backtest_${row.id}`,
        db_id: row.id,
        run_at: row.run_at,
        period_start: row.period_start,
        period_end: row.period_end,
        n_bookings: row.n_bookings,
        actual_revenue: row.actual_revenue,
        algorithm_revenue: row.algorithm_revenue,
        improvement_pct: row.improvement_pct,
        ...breakdown
      }
    };
  }

  /**
   * FORMAT RESULT FOR CHART
   * Transform SQL result into Chart.js compatible format
   */
  formatResultForChart(result) {
    if (!result || !result.success || !result.data) {
      return null;
    }

    const data = result.data;

    return {
      headline: {
        actual_revenue: data.actual_revenue,
        algorithm_revenue: data.algorithm_revenue,
        improvement_pct: data.improvement_pct,
        improvement_amount: data.algorithm_revenue - data.actual_revenue
      },
      revenueByMonth: {
        labels: data.breakdown_by_month.map(m => m.month),
        datasets: [
          {
            label: 'Actual Revenue',
            data: data.breakdown_by_month.map(m => m.actual_revenue),
            borderColor: '#8888aa',
            backgroundColor: 'rgba(136, 136, 170, 0.1)',
            borderWidth: 2,
            tension: 0.4
          },
          {
            label: 'Algorithm Revenue',
            data: data.breakdown_by_month.map(m => m.algorithm_revenue),
            borderColor: '#6c63ff',
            backgroundColor: 'rgba(108, 99, 255, 0.1)',
            borderWidth: 2,
            tension: 0.4
          }
        ]
      },
      improvementByEquipment: {
        labels: data.breakdown_by_equipment.map(e => e.equipment_name),
        datasets: [
          {
            label: 'Improvement %',
            data: data.breakdown_by_equipment.map(e => e.uplift_pct),
            backgroundColor: data.breakdown_by_equipment.map(e =>
              e.uplift_pct >= 10 ? 'rgba(76, 175, 80, 0.7)' :    // Green: >10%
              e.uplift_pct >= 5 ? 'rgba(33, 150, 243, 0.7)' :     // Blue: 5-10%
              e.uplift_pct >= 0 ? 'rgba(245, 158, 11, 0.7)' :     // Amber: 0-5%
              'rgba(239, 68, 68, 0.7)'                            // Red: negative
            ),
            borderColor: '#6c63ff',
            borderWidth: 1
          }
        ]
      }
    };
  }

  // ===== PRIVATE HELPERS =====

  _groupByBooking(items) {
    const groups = {};
    for (const item of items) {
      if (!groups[item.booking_id]) {
        groups[item.booking_id] = [];
      }
      groups[item.booking_id].push(item);
    }
    return groups;
  }

  _formatDate(date) {
    if (typeof date === 'string') return date;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

module.exports = new BacktestEngine();
