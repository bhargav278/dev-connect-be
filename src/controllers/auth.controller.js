const authService = require('../services/auth.service');
const { sendSuccess, sendError, HTTP_STATUS } = require('../utils/ApiResponse');

// Cookie options for the refresh token
const COOKIE_OPTIONS = {
  httpOnly: true,   // JavaScript CANNOT access this cookie (XSS protection)
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
  sameSite: 'strict',  // cookie sent only to same site (CSRF protection)
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days in milliseconds
};

/**
 * Handle user registration.
 * Sets refresh token as HTTPOnly cookie, sends access token in response body.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const register = async (req, res) => {
  try {
    // req.body is already validated & sanitised by the Joi middleware
    const { name, username, email, password } = req.body;

    const result = await authService.register({ name, username, email, password });

    // Set refresh token as HTTPOnly cookie
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    // Send access token + user data in response body (NOT the refresh token)
    return sendSuccess(res, HTTP_STATUS.CREATED, 'User registered successfully', {
      user: result.user,
      accessToken: result.accessToken,
    });

  } catch (error) {
    // Duplicate-key or business-logic errors from the service layer
    return sendError(res, HTTP_STATUS.CONFLICT, error.message);
  }
};

/**
 * Handle user login.
 * Sets refresh token as HTTPOnly cookie, sends access token in response body.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const login = async (req, res) => {
  try {
    // req.body is already validated & sanitised by the Joi middleware
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    // Set refresh token as HTTPOnly cookie
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    // Send access token + user data in response body
    return sendSuccess(res, HTTP_STATUS.OK, 'Login successful', {
      user: result.user,
      accessToken: result.accessToken,
    });


  } catch (error) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, error.message);
  }
};

/**
 * Issue a new access token using the refresh token from the HTTPOnly cookie.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const refreshTokens = async (req, res) => {
  try {
    // Read the refresh token from the HTTPOnly cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'No refresh token provided');
    }

    const result = await authService.refresh(refreshToken);

    return sendSuccess(res, HTTP_STATUS.OK, 'Token refreshed successfully', {
      user: result.user,
      accessToken: result.accessToken,
    });

  } catch (error) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, error.message);
  }
};

/**
 * Logout the user — revoke refresh token in DB and clear the cookie.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear the cookie from the browser
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Logged out successfully');

  } catch (error) {
    return sendError(res, HTTP_STATUS.INTERNAL_ERROR, error.message);
  }
};


module.exports = { register, login, refreshTokens, logout };