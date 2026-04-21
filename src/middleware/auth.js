const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { sendError, HTTP_STATUS } = require('../utils/ApiResponse');

/**
 * Verify the access token from the Authorization header.
 * On success, attaches the full user object to `req.user`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Check if token exists in header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Access token required');
    }

    // 2. Extract token from "Bearer <token>"
    const token = authHeader.split(' ')[1];

    // 3. Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // 4. Find user in DB
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'User no longer exists');
    }

    // 5. Check if account is active
    if (!user.isActive) {
      return sendError(res, HTTP_STATUS.FORBIDDEN, 'Account is deactivated');
    }

    // 6. Attach user to request
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Access token expired', null);
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid access token');
    }
    next(error);
  }
};

/**
 * Role-based access control middleware.
 * Must be used after `authenticate`.
 *
 * @param  {...string} roles – Allowed roles (e.g., 'admin', 'user')
 * @returns {import('express').RequestHandler}
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, HTTP_STATUS.FORBIDDEN, 'Access denied: insufficient permissions');
    }
    next();
  };
};

module.exports = { authenticate, authorize };