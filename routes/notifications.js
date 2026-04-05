const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/v1/notifications (authenticated)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM notifications 
      WHERE customer_id = $1 
      ORDER BY created_at DESC LIMIT 20
    `, [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    // Only return empty if the notifications table doesn't exist yet
    if (err.code === '42P01') { // relation does not exist
      return res.json({ success: true, data: [] });
    }
    next(err);
  }
});

// GET /api/v1/notifications/unread-count (authenticated)
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*)::int FROM notifications 
      WHERE customer_id = $1 AND is_read = false
    `, [req.user.id]);
    res.json({ success: true, count: rows[0].count });
  } catch (err) {
    if (err.code === '42P01') {
      return res.json({ success: true, count: 0 });
    }
    next(err);
  }
});

// PATCH /api/v1/notifications/mark-all-read (authenticated)
router.patch('/mark-all-read', authenticate, async (req, res, next) => {
  try {
    await pool.query(`
      UPDATE notifications SET is_read = true 
      WHERE customer_id = $1 AND is_read = false
    `, [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/notifications/:id/read (authenticated)
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      UPDATE notifications SET is_read = true 
      WHERE id = $1 AND customer_id = $2 RETURNING *
    `, [req.params.id, req.user.id]);

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
