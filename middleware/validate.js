const { body, validationResult } = require('express-validator')

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/).matches(/[@$!%*?&]/),
  body('phone').optional().isMobilePhone('en-IN')
]

const loginValidation = [
  body('email').isEmail(),
  body('password').notEmpty()
]

const bookingValidation = [
  body('event_date').isDate(),
  body('items').isArray({ min: 1 })
]

const handleValidation = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors: errors.array() 
    })
  }
  next()
}

module.exports = {
  registerValidation,
  loginValidation,
  bookingValidation,
  handleValidation
}
