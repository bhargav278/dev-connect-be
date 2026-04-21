const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../models');
const getCloudinaryUrl = require('../utils/getCloudinaryUrl');

/**
 * Converts a Sequelize user instance to a plain object with `avatar`
 * replaced by its full Cloudinary URL.
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
 * Generate a short-lived access token (15 min).
 *
 * @param {object} user – User model instance
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY }
  );
};

/**
 * Generate a long-lived refresh token (7 days) and save it in DB.
 *
 * @param {object} user – User model instance
 * @returns {Promise<string>} Signed JWT refresh token
 */
const generateRefreshToken = async (user) => {
  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY }
  );
  // Calculate expiry date for DB storage
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000); // exp is in seconds, Date needs ms
  // Save to database
  await RefreshToken.create({
    token,
    userId: user.id,
    expiresAt,
  });
  return token;
};

/**
 * Register a new user.
 *
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.username
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<{user: object, accessToken: string, refreshToken: string}>}
 * @throws {Error} If email or username already exists
 */
const register = async ({ name, username, email, password }) => {
  // Check if email already exists
  const existingEmail = await User.findOne({ where: { email } });
  if (existingEmail) throw new Error('Email already in use');

  // Check if username already exists
  const existingUsername = await User.findOne({ where: { username } });
  if (existingUsername) throw new Error('Username already taken');

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await User.create({
    name,
    username,
    email,
    password: hashedPassword,
  });

  // Generate token
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  return { user: withAvatarUrl(user), accessToken, refreshToken };
};

/**
 * Login with email and password.
 *
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<{user: object, accessToken: string, refreshToken: string}>}
 * @throws {Error} If credentials are invalid or account is deactivated
 */
const login = async ({ email, password }) => {
  // Find user — we need password here so we fetch it manually
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error('Invalid email or password');

  // Check if account is active
  if (!user.isActive) throw new Error('Account is deactivated');

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid email or password');

  // Generate token
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  return { user: withAvatarUrl(user), accessToken, refreshToken };
};

/**
 * Verify a refresh token and issue a new access token.
 *
 * @param {string} refreshTokenValue – The refresh token JWT string
 * @returns {Promise<{user: object, accessToken: string}>}
 * @throws {Error} If token is invalid, expired, revoked, or user not found
 */
const refresh = async (refreshTokenValue) => {
  // 1. Verify the JWT signature and expiry
  let payload;
  try {
    payload = jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired refresh token');
  }

  // 2. Find this token in DB
  const storedToken = await RefreshToken.findOne({
    where: { token: refreshTokenValue },
  });

  // 3. Check if token exists in DB
  if (!storedToken) {
    throw new Error('Refresh token not found');
  }

  // 4. Check if token is still valid (not revoked + not expired)
  if (!storedToken.isValid()) {
    throw new Error('Refresh token has been revoked or expired');
  }

  // 5. Find the user
  const user = await User.findByPk(payload.id);
  if (!user || !user.isActive) {
    throw new Error('User not found or deactivated');
  }

  // 6. Issue a new access token
  const accessToken = generateAccessToken(user);

  return { user: withAvatarUrl(user), accessToken };
};

/**
 * Revoke a refresh token (mark as isRevoked in DB).
 *
 * @param {string} refreshTokenValue – The refresh token JWT string
 * @returns {Promise<void>}
 */
const logout = async (refreshTokenValue) => {
  // Find the token in DB and mark it as revoked
  const storedToken = await RefreshToken.findOne({
    where: { token: refreshTokenValue },
  });

  if (storedToken) {
    storedToken.isRevoked = true;
    await storedToken.save();
  }
  // If token doesn't exist, that's fine — user is still "logged out"
};


module.exports = { register, login, refresh, logout };