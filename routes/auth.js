const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const config = require('../config');
const { registerValidation, loginValidation, handleValidation } = require('../middleware/validate');
const { login, register } = require('../middleware/rateLimit');
const { authenticate } = require('../middleware/auth');

// POST /api/v1/auth/register
router.post('/register', register, registerValidation, handleValidation, async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    
    // 1. Check email not already taken
    const existing = await pool.query('SELECT id FROM customers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // 2. Hash password
    const hashedPwd = await bcrypt.hash(password, config.security.bcryptRounds);
    
    // 3. Hash phone if provided
    let phoneHash = null;
    if (phone) {
      phoneHash = await bcrypt.hash(phone, 10);
    }

    // 4. INSERT customer
    const result = await pool.query(
      `INSERT INTO customers (name, email, password_hash, phone_hash, role) 
       VALUES ($1, $2, $3, $4, 'customer') 
       RETURNING id, name, email, role, created_at`,
      [name, email, hashedPwd, phoneHash]
    );

    const user = result.rows[0];
    
    // 5. Generate tokens
    const { access_token, refresh_token } = generateTokens(user);

    // 6. Set refresh token in httpOnly cookie
    setRefreshCookie(res, refresh_token);

    // 7. Return payload
    res.status(201).json({
      success: true,
      data: {
        access_token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
router.post('/login', login, loginValidation, handleValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const DUMMY_HASH = '$2a$12$invalidhashtopreventtimingattacksxxxxxxxxxxxxxxxxxxx';

    // 1. Find customer by email
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM customers WHERE email = $1',
      [email]
    );
    
    const user = result.rows[0];

    // 2 & 3. Constant time response preventing email enumeration
    let isMatch = false;
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    } else {
      isMatch = await bcrypt.compare(password, user.password_hash);
    }

    // 4. If mismatch
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 5. If is_active false
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }

    // 6. Update last_login_at
    await pool.query('UPDATE customers SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // 7. Generate tokens, set cookie, return
    const { access_token, refresh_token } = generateTokens(user);
    setRefreshCookie(res, refresh_token);

    delete user.password_hash; // Clean object before returning
    delete user.is_active;

    res.json({
      success: true,
      data: {
        access_token,
        user
      }
    });

  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', (req, res, next) => {
  try {
    // Read refresh_token from cookie manually since cookie-parser may not be installed
    const cookieHeader = req.headers.cookie;
    let refresh_token = null;
    
    if (cookieHeader) {
      const match = cookieHeader.split(';').find(c => c.trim().startsWith('refresh_token='));
      if (match) {
        refresh_token = match.split('=')[1];
      }
    }

    if (!refresh_token) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    // Verify with JWT_REFRESH_SECRET
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, config.jwt.refreshSecret);
    } catch (err) {
      // Clear cookie and return 401 if invalid
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: config.app.nodeEnv === 'production',
        sameSite: 'strict',
        path: '/'
      });
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Issue new access_token only
    const access_token = jwt.sign(
      { id: decoded.id },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiry }
    );

    res.json({
      success: true,
      data: { access_token }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: config.app.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/'
  });
  res.json({ success: true, message: 'Logged out' });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});


// Helper functions at bottom
function generateTokens(user) {
  const access_token = jwt.sign(
    { id: user.id }, 
    config.jwt.secret, 
    { expiresIn: config.jwt.accessExpiry }
  );
  const refresh_token = jwt.sign(
    { id: user.id }, 
    config.jwt.refreshSecret, 
    { expiresIn: config.jwt.refreshExpiry }
  );
  return { access_token, refresh_token };
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: config.app.nodeEnv === 'production', // true if prod
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  });
}

module.exports = router;
