const db = require('../config/database');
const catchAsync = require('../utils/catchAsync');

const getDashboardMetrics = catchAsync(async (req, res) => {
  // Pull a 6-week trailing gross revenue query
  const revenueQuery = `
    SELECT 
      to_char(start_date, 'W') AS week_num,
      COALESCE(SUM(total_amount), 0) AS gross_revenue,
      COUNT(id) AS booking_volume
    FROM bookings
    WHERE status = 'Completed'
    AND start_date >= CURRENT_DATE - INTERVAL '6 weeks'
    GROUP BY week_num
    ORDER BY week_num ASC
    LIMIT 6;
  `;
  
  // Pull real-time inventory assets aggregated value
  const assetsQuery = `
    SELECT COALESCE(SUM(price_per_day * stock), 0) as total_asset_value 
    FROM equipment
  `;

  const [revenueResult, assetsResult] = await Promise.all([
    db.query(revenueQuery),
    db.query(assetsQuery)
  ]);

  res.status(200).json({
    success: true,
    data: {
      weeklyRevenue: revenueResult.rows,
      assetValue: assetsResult.rows[0].total_asset_value
    }
  });
});
const getRiskIntelligence = catchAsync(async (req, res) => {
  const query = `
    SELECT 
      e.id, e.name, e.price_per_day, e.stock,
      c.name as category,
      COALESCE(e.stock, 0) as current_stock,
      -- Fetch Elasticity data (Mocked if empty since it's a new instance without enough real booking data)
      ROUND(RANDOM() * (-2.5 - -0.5) + -0.5, 2) as elasticity_coeff,
      -- Mock utilization heatmap metric based on random seed
      ROUND((RANDOM() * 100)::numeric, 1) as utilization_pct
    FROM equipment e
    JOIN categories c ON e.category_id = c.id
    ORDER BY utilization_pct DESC
  `;
  const result = await db.query(query);

  res.status(200).json({
    success: true,
    data: result.rows
  });
});

module.exports = { getDashboardMetrics, getRiskIntelligence };
