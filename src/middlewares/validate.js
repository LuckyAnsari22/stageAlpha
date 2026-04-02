const Joi = require('joi');
const ApiError = require('../utils/ApiError');

/**
 * OWASP Level 1: Input Validation Interceptor
 * Dynamically hooks against schema blueprints immediately rejecting 
 * malformed parameters avoiding database layer injections natively.
 */
const validate = (schema) => (req, res, next) => {
  const customPick = (object, keys) => {
    return keys.reduce((obj, key) => {
      if (object && Object.prototype.hasOwnProperty.call(object, key)) {
        obj[key] = object[key];
      }
      return obj;
    }, {});
  };

  const validSchema = customPick(schema, ['params', 'query', 'body']);
  const object = customPick(req, Object.keys(validSchema));
  
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    // Merge all Joi detail messages into a concise string avoiding stack reveals
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new ApiError(400, `Input Validation Breach: ${errorMessage}`));
  }
  
  Object.assign(req, value);
  return next();
};

module.exports = validate;
