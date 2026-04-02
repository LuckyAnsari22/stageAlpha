const config = require('../config')

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.name = this.constructor.name
  }
}

function errorHandler(err, req, res, next) {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500)
  const message = err.message || 'Internal server error'
  
  console.error(`[${new Date().toISOString()}] ERROR: ${status} - ${message}`)
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

  res.status(status).json(response)
}

module.exports = errorHandler
module.exports.ApiError = ApiError
