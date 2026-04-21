const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { Op } = require('sequelize');
const { cloudinary } = require('../config/cloudinary');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const getCloudinaryUrl = require('../utils/getCloudinaryUrl');

/**
 * Field sets.
 * - Keep sensitive/internal fields (like role, email) out of public/search payloads.
 * - "Me" endpoints can include email since the user is authenticated as themselves.
 */
const ME_FIELDS = ['id', 'name', 'username', 'email', 'bio', 'avatar', 'role', 'createdAt', 'isPrivate'];
const PUBLIC_PROFILE_FIELDS = ['id', 'name', 'username', 'bio', 'avatar', 'createdAt', 'isPrivate'];
const SEARCH_FIELDS = ['id', 'name', 'username', 'avatar', 'isPrivate'];

/**
 * Converts a Sequelize user instance to a plain object with `avatar`
 * replaced by its full Cloudinary URL.
 *
 * The raw `public_id` is stored in the DB; this helper ensures API
 * consumers always receive a usable URL in the `avatar` field.
 *
 * @param {import('sequelize').Model} user
 * @returns {object}
 */
const withAvatarUrl = (user) => {
  const json = user.toJSON();
  json.avatar = getCloudinaryUrl(json.avatar);
  return json;
};

/**
 * Current user by primary key.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
const getMe = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: [...ME_FIELDS, 'isActive'],
  });
  if (!user) throw new Error('User not found');
  if (!user.isActive) throw new Error('Account is deactivated');
  // Do not expose isActive on this endpoint (same shape as other user payloads)
  const result = withAvatarUrl(user);
  delete result.isActive;
  return result;
};

/**
 * Public profile: must be an active user.
 *
 * @param {string} username
 * @returns {Promise<object>}
 */
const getProfile = async (username) => {
  const user = await User.findOne({
    where: { username, isActive: true },
    attributes: PUBLIC_PROFILE_FIELDS,
  });
  if (!user) throw new Error('User not found');
  return withAvatarUrl(user);
};

/**
 * Partial update — `name`, `username`, `email`, and `bio`.
 *
 * @param {string} userId
 * @param {{ name?: string, username?: string, email?: string, bio?: string }} data — validated & sanitised by Joi
 * @returns {Promise<object>}
 */
const updateProfile = async (userId, data) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');
  if (!user.isActive) throw new Error('Account is deactivated');

  const { name, username, email, bio } = data;

  // Uniqueness checks for username and email
  if (username !== undefined && username !== user.username) {
    const existing = await User.findOne({
      where: { username, id: { [Op.ne]: userId } },
    });
    if (existing) throw new Error('Username already taken');
    user.username = username;
  }

  if (email !== undefined && email !== user.email) {
    const existing = await User.findOne({
      where: { email, id: { [Op.ne]: userId } },
    });
    if (existing) throw new Error('Email already in use');
    user.email = email;
  }

  if (name !== undefined) user.name = name;
  if (bio !== undefined) user.bio = bio;

  await user.save();
  return withAvatarUrl(user);
};

/**
 * Replace avatar on Cloudinary; persists `public_id` from upload result.
 *
 * @param {string} userId
 * @param {Buffer} fileBuffer
 * @returns {Promise<object>}
 */
const uploadAvatar = async (userId, fileBuffer) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');
  if (!user.isActive) throw new Error('Account is deactivated');

  if (user.avatar) {
      await cloudinary.uploader.destroy(user.avatar);
  }

  const publicId = `${userId}_${Date.now()}`;
  const result = await uploadToCloudinary(fileBuffer, "avatars", publicId);
  user.avatar = result.public_id;
  await user.save();
  return withAvatarUrl(user);
};

/**
 * Case-insensitive search on name and username.
 *
 * @param {string} query — min length enforced by route validation
 * @returns {Promise<object[]>}
 */
const searchUsers = async (query) => {
  const users = await User.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { username: { [Op.iLike]: `%${query}%` } },
      ],
      isActive: true,
    },
    attributes: SEARCH_FIELDS,
    limit: 20,
  });

  return users.map(withAvatarUrl);
};

/**
 * Update password — verifies current password before setting new one.
 *
 * @param {string} userId
 * @param {{ currentPassword: string, newPassword: string }} data
 * @returns {Promise<void>}
 */
const updatePassword = async (userId, data) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');
  if (!user.isActive) throw new Error('Account is deactivated');

  const { currentPassword, newPassword } = data;

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new Error('Current password is incorrect');

  // Hash and save new password
  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
};

module.exports = { getMe, getProfile, updateProfile, updatePassword, uploadAvatar, searchUsers };
