/**
 * Standardised API response helpers.
 *
 * Usage:
 *   const { sendSuccess, sendError } = require('../utils/ApiResponse');
 *
 *   sendSuccess(res, 201, 'User created', { user });
 *   sendError(res, 422, 'Validation failed', errors);
 */

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_ERROR: 500,
};

/**
 * Send a success response.
 *
 * @param {import('express').Response} res
 * @param {number}  statusCode  – HTTP status (default 200)
 * @param {string}  message     – Human-readable message
 * @param {*}       [data]      – Optional payload
 */
const sendSuccess = (res, statusCode = HTTP_STATUS.OK, message = 'Success', data = null) => {
  const response = { success: true, message };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send an error response.
 *
 * @param {import('express').Response} res
 * @param {number}  statusCode  – HTTP status (default 500)
 * @param {string}  message     – Human-readable error message
 * @param {*}       [errors]    – Optional detailed error list (e.g. validation errors)
 */
const sendError = (res, statusCode = HTTP_STATUS.INTERNAL_ERROR, message = 'Something went wrong', errors = null) => {
  const response = { success: false, message };

  if (errors !== null && errors !== undefined) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = { sendSuccess, sendError, HTTP_STATUS };
