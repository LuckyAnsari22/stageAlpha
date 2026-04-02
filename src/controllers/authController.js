const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const JWT_SECRET = process.env.JWT_SECRET || 'stagealpha_dev_secret';
const JWT_EXPIRES = '7d';

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
};

/** POST /api/auth/register */
const register = catchAsync(async (req, res) => {
    const { name, email, phone, password } = req.body;
    
    if (!name || !email || !password) {
        throw new ApiError(400, 'Name, email, and password are required.');
    }
    
    if (password.length < 6) {
        throw new ApiError(400, 'Password must be at least 6 characters.');
    }
    
    // Check if email exists
    const existing = await db.query('SELECT id FROM customers WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
        throw new ApiError(409, 'An account with this email already exists.');
    }
    
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const result = await db.query(
        `INSERT INTO customers (name, email, phone, password_hash, role) 
         VALUES ($1, $2, $3, $4, 'customer') RETURNING id, name, email, role, created_at`,
        [name, email, phone || null, password_hash]
    );
    
    const user = result.rows[0];
    const token = generateToken(user);
    
    res.status(201).json({
        success: true,
        data: { user, token }
    });
});

/** POST /api/auth/login */
const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required.');
    }
    
    const result = await db.query(
        'SELECT id, name, email, phone, password_hash, role FROM customers WHERE email = $1',
        [email]
    );
    
    if (result.rowCount === 0) {
        throw new ApiError(401, 'Invalid email or password.');
    }
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
        throw new ApiError(401, 'Invalid email or password.');
    }
    
    const token = generateToken(user);
    
    res.status(200).json({
        success: true,
        data: {
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            token
        }
    });
});

/** GET /api/auth/me */
const getMe = catchAsync(async (req, res) => {
    const result = await db.query(
        'SELECT id, name, email, phone, role, created_at FROM customers WHERE id = $1',
        [req.user.id]
    );
    
    if (result.rowCount === 0) {
        throw new ApiError(404, 'User not found.');
    }
    
    res.status(200).json({ success: true, data: result.rows[0] });
});

module.exports = { register, login, getMe };
