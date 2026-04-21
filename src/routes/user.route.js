const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const validateQuery = validate.validateQuery;
const { authenticate } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const { updateProfileSchema, updatePasswordSchema, searchUsersQuerySchema } = require('../validations/user.validation');
const {
  getMe,
  getProfile,
  updateProfile,
  updatePassword,
  uploadAvatar,
  searchUsers,
} = require('../controllers/user.controller');

// --- Authenticated: current user (JWT) ---
router.get('/profile', authenticate, getMe);

// --- Authenticated: search by name/username; q validated ---
router.get('/search', authenticate, validateQuery(searchUsersQuerySchema), searchUsers);

// --- Public: profile by username (inactive users hidden in service) ---
router.get('/:username', getProfile);

// --- Authenticated: name/bio/username/email update; body validated ---
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);

// --- Authenticated: password update; body validated ---
router.put('/update-password', authenticate, validate(updatePasswordSchema), updatePassword);

// --- Authenticated: multipart avatar; type/size via multer ---
router.put('/upload-avatar', authenticate, upload.single('avatar'), uploadAvatar);

module.exports = router;
