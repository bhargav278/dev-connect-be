const userService = require('../services/user.service');
const { sendSuccess, sendError, HTTP_STATUS } = require('../utils/ApiResponse');

/**
 * Authenticated user’s own profile.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getMe = async (req, res) => {
  try {
    const user = await userService.getMe(req.user.id);
    return sendSuccess(res, HTTP_STATUS.OK, 'Profile fetched successfully', { user });
  } catch (error) {
    if (error.message === 'Account is deactivated') {
      return sendError(res, HTTP_STATUS.FORBIDDEN, error.message);
    }
    return sendError(res, HTTP_STATUS.NOT_FOUND, error.message);
  }
};

/**
 * Public profile by username.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getProfile = async (req, res) => {
  try {
    const user = await userService.getProfile(req.params.username);
    return sendSuccess(res, HTTP_STATUS.OK, 'Profile fetched successfully', { user });
  } catch (error) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, error.message);
  }
};

/**
 * Update name/bio. req.body is validated by Joi middleware.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, HTTP_STATUS.OK, 'Profile updated successfully', { user });
  } catch (error) {
    if (error.message === 'Account is deactivated') {
      return sendError(res, HTTP_STATUS.FORBIDDEN, error.message);
    }
    if (error.message === 'Username already taken' || error.message === 'Email already in use') {
      return sendError(res, HTTP_STATUS.CONFLICT, error.message);
    }
    return sendError(res, HTTP_STATUS.NOT_FOUND, error.message);
  }
};

/**
 * Avatar upload — field name `avatar`, buffer from multer memoryStorage.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'No image file provided');
    }
    const result = await userService.uploadAvatar(req.user.id, req.file.buffer);
    return sendSuccess(res, HTTP_STATUS.OK, 'Avatar uploaded successfully', result);
  } catch (error) {
    if (error.message === 'Account is deactivated') {
      return sendError(res, HTTP_STATUS.FORBIDDEN, error.message);
    }
    return sendError(res, HTTP_STATUS.BAD_REQUEST, error.message);
  }
};

/**
 * Search users; `q` is validated on the route.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const users = await userService.searchUsers(q);
    return sendSuccess(res, HTTP_STATUS.OK, 'Users found', { users });
  } catch (error) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, error.message);
  }
};

/**
 * Update password — requires current password verification.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updatePassword = async (req, res) => {
  try {
    await userService.updatePassword(req.user.id, req.body);
    return sendSuccess(res, HTTP_STATUS.OK, 'Password updated successfully');
  } catch (error) {
    if (error.message === 'Account is deactivated') {
      return sendError(res, HTTP_STATUS.FORBIDDEN, error.message);
    }
    if (error.message === 'Current password is incorrect') {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, error.message);
    }
    return sendError(res, HTTP_STATUS.BAD_REQUEST, error.message);
  }
};

module.exports = { getMe, getProfile, updateProfile, updatePassword, uploadAvatar, searchUsers };
