const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { bookingValidation, handleValidation } = require('../middleware/validate');
const { ApiError } = require('../middleware/errorHandler');

// POST /api/v1/bookings
router.post('/', authenticate, bookingValidation, handleValidation, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { event_date, venue_id, event_type, items, special_requests } = req.body;
    
    await client.query('BEGIN');
    
    // 1. Lock equipment rows to prevent race conditions
    await client.query(
      'SELECT id, stock_qty FROM equipment WHERE id = ANY($1) FOR UPDATE',
      [items.map(i => i.equipment_id)]
    );
    
    // 2. Check all items have sufficient stock
    for (const item of items) {
      const { rows } = await client.query('SELECT stock_qty FROM equipment WHERE id = $1', [item.equipment_id]);
      if (!rows[0] || rows[0].stock_qty < item.qty) {
        throw new ApiError(400, `Insufficient stock for equipment ${item.equipment_id}`);
      }
    }
    
    // 3. Create booking
    const { rows: [booking] } = await client.query(
      `INSERT INTO bookings (customer_id, event_date, venue_id, event_type, special_requests)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [req.user.id, event_date, venue_id, event_type || 'general', special_requests]
    );
    
    // 4. For each item: get algorithm price, insert booking_item
    let subtotal = 0;
    for (const item of items) {
      // Joining equipment explicitly with the generate optimal price row
      const { rows: [priceRow] } = await client.query(
        'SELECT e.base_price, e.current_price, calc.final_optimal_price FROM equipment e, calculate_optimal_price(e.id, $2) calc WHERE e.id = $1',
        [item.equipment_id, event_date]
      );
      
      // Fallback if procedure fails
      const basePrice = priceRow?.base_price || priceRow?.current_price;
      const algoPrice = priceRow?.final_optimal_price || basePrice;
      const finalPrice = algoPrice; // Final selection
      
      await client.query(
        `INSERT INTO booking_items (booking_id, equipment_id, qty, base_price_at_booking, algorithm_price_at_booking, final_price)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [booking.id, item.equipment_id, item.qty, basePrice, algoPrice, finalPrice]
      );
      subtotal += finalPrice * item.qty;
      // Note: trg_manage_stock deducts stock_qty automatically!
      //       trg_calculate_booking_totals recalculates subtotal automatically!
    }
    
    // 5. Update booking totals (although trigger works, we explicitly guarantee the transaction's visibility)
    const taxAmount = subtotal * 0.18;
    await client.query(
      'UPDATE bookings SET subtotal=$1, tax_amount=$2, total_price=$3 WHERE id=$4',
      [subtotal, taxAmount, subtotal + taxAmount, booking.id]
    );
    
    await client.query('COMMIT');
    
    // 6. Emit Socket.IO event for real-time inventory update
    const socketService = require('../services/socket');
    if (socketService.emitInventoryUpdate) {
      socketService.emitInventoryUpdate(items.map(i => i.equipment_id));
    }
    
    res.status(201).json({ success: true, data: { booking_id: booking.id, total_price: subtotal + taxAmount } });
    
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/v1/bookings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { status, date_from, date_to, customer_id } = req.query;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let baseSql = 'FROM vw_booking_details v JOIN bookings b ON v.booking_id = b.id WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    // Permissions
    if (!isAdmin) {
      baseSql += ` AND b.customer_id = $${paramIdx++}`;
      params.push(req.user.id);
    } else if (customer_id) {
      baseSql += ` AND b.customer_id = $${paramIdx++}`;
      params.push(customer_id);
    }

    // Dynamic Filters
    if (status) {
      baseSql += ` AND v.status = $${paramIdx++}`;
      params.push(status);
    }
    if (date_from) {
      baseSql += ` AND v.event_date >= $${paramIdx++}`;
      params.push(date_from);
    }
    if (date_to) {
      baseSql += ` AND v.event_date <= $${paramIdx++}`;
      params.push(date_to);
    }

    const { rows: countRows } = await pool.query(`SELECT COUNT(*) ${baseSql}`, params);
    const total = parseInt(countRows[0].count);

    const { rows } = await pool.query(`
      SELECT v.* ${baseSql} ORDER BY v.event_date DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}
    `, [...params, limit, offset]);

    res.json({ success: true, data: rows, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/bookings/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT v.*, b.customer_id, b.created_at 
      FROM vw_booking_details v 
      JOIN bookings b ON v.booking_id = b.id 
      WHERE v.booking_id = $1
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Booking not found' });
    
    if (req.user.role !== 'admin' && rows[0].customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden to access this booking' });
    }

    // Load booking items explicitly for details
    const { rows: itemsRows } = await pool.query(`
      SELECT bi.*, e.name AS equipment_name, c.name AS category_name
      FROM booking_items bi
      JOIN equipment e ON bi.equipment_id = e.id
      JOIN categories c ON e.category_id = c.id
      WHERE bi.booking_id = $1
    `, [req.params.id]);

    rows[0].items = itemsRows;

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/bookings/:id/status
router.patch('/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body; 
    const permitted = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!permitted.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status provided' });
    }

    const { rows } = await pool.query(
      `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, 
      [status, req.params.id]
    );
    
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Note: Database trigger handles stock restoration automatically if "deleted"
    // Wait; if it's "cancelled", stock restoration might be mapped in the schema logic
    
    const socketService = require('../services/socket');
    if (socketService.emitBookingUpdated) {
      socketService.emitBookingUpdated(req.params.id, status);
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;