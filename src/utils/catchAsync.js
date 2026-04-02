/**
 * Wraps an async route handler or middleware.
 * If the promise rejects, it automatically forwards the error to next().
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

module.exports = catchAsync;
