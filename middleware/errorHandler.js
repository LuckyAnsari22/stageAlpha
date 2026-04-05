const config = require('../config')

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.name = this.constructor.name
  }
}

function errorHandler(err, req, res, next) {
  // Map PostgreSQL error codes to meaningful HTTP status
  let status = err.status || 500
  let message = err.message || 'Internal server error'

  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        status = 409
        message = 'A record with this value already exists'
        break
      case '23503': // foreign_key_violation
        status = 400
        message = 'Referenced record does not exist'
        break
      case '23502': // not_null_violation
        status = 400
        message = `Missing required field: ${err.column || 'unknown'}`
        break
      case '23514': // check_violation
        status = 400
        message = 'Value violates validation constraint'
        break
      case '42P01': // undefined_table
        status = 500
        message = 'Database table not found — run npm run db:init'
        break
      case 'ECONNREFUSED':
        status = 503
        message = 'Database connection refused'
        break
    }
  }

  if (err.name === 'ValidationError') status = 400
  if (err.name === 'JsonWebTokenError') { status = 401; message = 'Invalid token' }
  if (err.name === 'TokenExpiredError') { status = 401; message = 'Token expired' }

  // Log with request context
  const method = req.method || 'UNKNOWN'
  const path = req.originalUrl || req.path || 'UNKNOWN'
  console.error(`\x1b[31m[ERROR]\x1b[0m ${method} ${path} → ${status}: ${message}`)
  if (err.stack && config.app.nodeEnv !== 'production') {
    console.error(err.stack)
  }

  const response = {
    success: false,
    message: config.app.nodeEnv === 'production' && status === 500 
      ? 'Internal server error' 
      : message
  }

  if (config.app.nodeEnv !== 'production' && err.stack) {
    response.stack = err.stack
  }

  // Prevent double-send
  if (res.headersSent) return next(err)

  res.status(status).json(response)
}

module.exports = errorHandler
module.exports.ApiError = ApiError
