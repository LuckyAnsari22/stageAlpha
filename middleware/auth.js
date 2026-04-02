const jwt = require('jsonwebtoken')
const config = require('../config')
const { pool } = require('../config/db')

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' })
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    // Always fetch from DB — token might be for deactivated user
    const { rows } = await pool.query(
      'SELECT id, email, role, is_active FROM customers WHERE id = $1', [decoded.id]
    )
    if (!rows[0] || !rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Account not found or suspended' })
    }
    req.user = rows[0]
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, message: 'Token expired' })
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Admin access required' })
  next()
}

module.exports = { authenticate, requireAdmin }
