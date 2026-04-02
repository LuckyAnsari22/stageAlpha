const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

// Convert non-ApiError errors to ApiError
const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;
  
  if (process.env.NODE_ENV === 'development') {
    logger.error(err);
  }

  res.status(statusCode).send({
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  errorConverter,
  errorHandler,
};
