const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const JWT_SECRET = process.env.JWT_SECRET || 'stagealpha_dev_secret';

/** Verify JWT and attach user to request */
const protect = catchAsync(async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
        throw new ApiError(401, 'Not authenticated. Please log in.');
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, email, role }
        next();
    } catch (err) {
        throw new ApiError(401, 'Invalid or expired token. Please log in again.');
    }
});

/** Restrict to admin users only */
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return next(new ApiError(403, 'Access denied. Admin privileges required.'));
};

module.exports = { protect, adminOnly };
