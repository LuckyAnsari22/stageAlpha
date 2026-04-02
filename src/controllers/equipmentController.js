const db = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const redis = require('../config/redis');

/**
 * Standard CRUD Operations built safely with the catchAsync interceptor
 * Nullifies repetitive try/catch scaffolding allowing pure logical focus
 */

const getEquipment = catchAsync(async (req, res) => {
  const query = `
    SELECT e.id, e.name, c.name as category_name, e.price_per_day, e.stock, e.image_url 
    FROM equipment e
    JOIN categories c ON e.category_id = c.id
    ORDER BY e.stock ASC, e.id ASC
  `;
  const result = await db.query(query);
  res.status(200).json({ success: true, count: result.rowCount, data: result.rows });
});

const createEquipment = catchAsync(async (req, res) => {
  const { category_id, name, price_per_day, stock, image_url } = req.body;
  if (!name || !price_per_day || stock === undefined) {
    throw new ApiError(400, 'Malformed Payload: Minimum attributes required {name, price, stock}');
  }

  const query = `
    INSERT INTO equipment (category_id, name, price_per_day, stock, image_url)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `;
  const result = await db.query(query, [category_id, name, price_per_day, stock, image_url]);
  
  if (redis.status === 'ready') await redis.del('equipment:global:list').catch(() => {});
  
  // Notice NO manual 'io.emit()' here!
  // The PostgreSQL NOTIFY trigger handles it completely invisibly at the DB level.
  res.status(201).json({ success: true, data: result.rows[0] });
});

const updateEquipment = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { price_per_day, stock } = req.body;
  
  const query = `
    UPDATE equipment 
    SET price_per_day = $1, stock = $2
    WHERE id = $3 RETURNING *
  `;
  const result = await db.query(query, [price_per_day, stock, id]);
  
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Logical Reference Error: Asset node unlocatable by ID');
  }
  
  if (redis.status === 'ready') await redis.del('equipment:global:list').catch(() => {});
  
  res.status(200).json({ success: true, data: result.rows[0] });
});

const deleteEquipment = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const query = `DELETE FROM equipment WHERE id = $1 RETURNING id`;
  const result = await db.query(query, [id]);
  
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Logical Reference Error: Target node already purged or nonexistent');
  }
  
  if (redis.status === 'ready') await redis.del('equipment:global:list').catch(() => {});
  
  res.status(204).send(); // 204 No Content for successful deletion
});

module.exports = {
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment
};
