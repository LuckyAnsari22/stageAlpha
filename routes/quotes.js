const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// POST /api/v1/quotes (authenticated customer)
router.post('/', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { event_date, venue_id, event_type, items, notes } = req.body;
    const customer_id = req.user.id;
    
    if (!event_date || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'event_date and items are required' });
    }

    await client.query('BEGIN');

    // Insert quote record
    const { rows: quoteRows } = await client.query(`
      INSERT INTO quotes (customer_id, event_date, venue_id, event_type, notes, valid_until)
      VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '48 hours')
      RETURNING *
    `, [customer_id, event_date, venue_id || null, event_type || 'general', notes || '']);
    
    const quote = quoteRows[0];
    let subtotal = 0;

    // Insert quote_items
    for (const item of items) {
      // Get current algorithm price
      const { rows: priceRows } = await client.query(`SELECT final_optimal_price FROM calculate_optimal_price($1, $2)`, [item.equipment_id, event_date]);
      
      let unit_price = 0;
      if (priceRows[0] && priceRows[0].final_optimal_price) {
        unit_price = parseFloat(priceRows[0].final_optimal_price);
      } else {
        // Fallback
        const { rows: eqRows } = await client.query(`SELECT current_price FROM equipment WHERE id = $1`, [item.equipment_id]);
        if (eqRows[0]) unit_price = parseFloat(eqRows[0].current_price);
      }

      await client.query(`
        INSERT INTO quote_items (quote_id, equipment_id, qty, unit_price)
        VALUES ($1, $2, $3, $4)
      `, [quote.id, item.equipment_id, item.qty, unit_price]);

      subtotal += unit_price * item.qty;
    }

    const tax = subtotal * 0.18; // assuming 18% tax
    const total = subtotal + tax;

    // Update quote totals
    await client.query(`
      UPDATE quotes SET subtotal = $1, tax_amount = $2, total_price = $3 WHERE id = $4
    `, [subtotal, tax, total, quote.id]);

    // Create notification
    await client.query(`
      INSERT INTO notifications (customer_id, type, title, message, link)
      VALUES ($1, $2, $3, $4, $5)
    `, [customer_id, 'QUOTE_CREATED', 'Quote Request Received', `Your quote request #${quote.id} has been received.`, `/quotes/${quote.id}`]);

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { ...quote, subtotal, tax_amount: tax, total_price: total } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/v1/quotes/mine (authenticated customer)
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM quotes WHERE customer_id = $1 ORDER BY created_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/quotes/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id;
    const { rows: quoteRows } = await pool.query(`
      SELECT q.*, v.name as venue_name, c.name as customer_name, c.email as customer_email
      FROM quotes q
      LEFT JOIN venues v ON q.venue_id = v.id
      JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
    `, [id]);

    if (!quoteRows[0]) return res.status(404).json({ success: false, message: 'Quote not found' });
    
    const quote = quoteRows[0];
    if (quote.customer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { rows: itemRows } = await pool.query(`
      SELECT qi.*, e.name, e.image_url 
      FROM quote_items qi
      JOIN equipment e ON qi.equipment_id = e.id
      WHERE qi.quote_id = $1
    `, [id]);

    quote.items = itemRows;
    res.json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/quotes/:id/accept (authenticated customer)
router.patch('/:id/accept', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const quoteId = req.params.id;
    await client.query('BEGIN');

    const { rows: quoteRows } = await client.query(`SELECT * FROM quotes WHERE id = $1 AND customer_id = $2`, [quoteId, req.user.id]);
    if (!quoteRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }

    const quote = quoteRows[0];
    if (quote.status !== 'sent') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Quote cannot be accepted in current state' });
    }

    // Convert to booking
    const { rows: bookingRows } = await client.query(`
      INSERT INTO bookings (customer_id, event_date, venue_id, event_type, status, subtotal, tax_amount, total_price, special_requests)
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8) RETURNING id
    `, [quote.customer_id, quote.event_date, quote.venue_id, quote.event_type, quote.subtotal, quote.tax_amount, quote.total_price, quote.notes]);

    const bookingId = bookingRows[0].id;

    // Move items
    const { rows: itemRows } = await client.query(`SELECT * FROM quote_items WHERE quote_id = $1`, [quote.id]);
    for (const item of itemRows) {
      await client.query(`
        INSERT INTO booking_items (booking_id, equipment_id, qty, base_price_at_booking, algorithm_price_at_booking, final_price)
        VALUES ($1, $2, $3, $4, $4, $4)
      `, [bookingId, item.equipment_id, item.qty, item.unit_price]);
    }

    // Update quote
    await client.query(`UPDATE quotes SET status = 'accepted', converted_booking_id = $1 WHERE id = $2`, [bookingId, quote.id]);

    await client.query('COMMIT');
    res.json({ success: true, data: { quote_id: quote.id, booking_id: bookingId } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/v1/quotes (admin only)
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    let qs = `
      SELECT q.*, c.name as customer_name 
      FROM quotes q JOIN customers c ON q.customer_id = c.id
    `;
    const params = [];
    if (status) {
      qs += ` WHERE q.status = $1`;
      params.push(status);
    }
    qs += ` ORDER BY q.created_at DESC`;

    const { rows } = await pool.query(qs, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/quotes/:id/approve (admin only)
router.patch('/:id/approve', authenticate, requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const quoteId = req.params.id;
    await client.query('BEGIN');

    const { rows: quoteRows } = await client.query(`UPDATE quotes SET status = 'sent', admin_notes = $1 WHERE id = $2 RETURNING *`, [req.body.admin_notes || null, quoteId]);
    if (!quoteRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }

    const quote = quoteRows[0];

    // Notification
    await client.query(`
      INSERT INTO notifications (customer_id, type, title, message, link)
      VALUES ($1, $2, $3, $4, $5)
    `, [quote.customer_id, 'QUOTE_APPROVED', 'Quote Approved', `Your quote #${quote.id} has been approved.`, `/quotes/${quote.id}`]);

    await client.query('COMMIT');
    res.json({ success: true, data: quote });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
