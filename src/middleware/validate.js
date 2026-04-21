const { sendError, HTTP_STATUS } = require('../utils/ApiResponse');

const joiOptions = {
  abortEarly: false, // collect ALL errors, not just the first one
  stripUnknown: true, // remove fields not defined in the schema
};

/**
 * Generic Joi validation middleware factory for JSON bodies.
 * Pass a Joi schema and it returns an Express middleware
 * that validates req.body against that schema.
 *
 * On failure it returns a 422 response with structured error details.
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, joiOptions);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return sendError(res, HTTP_STATUS.UNPROCESSABLE, 'Validation failed', errors);
    }

    req.body = value;
    next();
  };
};

/**
 * Validates req.query (e.g. GET search ?q=).
 * Same 422 error shape as validate().
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, joiOptions);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return sendError(res, HTTP_STATUS.UNPROCESSABLE, 'Validation failed', errors);
    }

    req.query = value;
    next();
  };
};

/**
 * Validates req.params (e.g. /:userId/...).
 * Same 422 error shape as validate().
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, joiOptions);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return sendError(res, HTTP_STATUS.UNPROCESSABLE, 'Validation failed', errors);
    }

    req.params = value;
    next();
  };
};

module.exports = validate;
module.exports.validateQuery = validateQuery;
module.exports.validateParams = validateParams;
