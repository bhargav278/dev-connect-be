const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const validateParams = validate.validateParams;
const { authenticate } = require('../middleware/auth');
const { userIdParamSchema, updatePrivacySchema } = require('../validations/follow.validation');
const {
  followUser,
  unfollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
  getFollowers,
  getFollowing,
  getPendingRequests,
  getFollowStatus,
  updatePrivacy,
} = require('../controllers/follow.controller');

// --- Current user (no target id in path) ---
router.get('/me/requests', authenticate, getPendingRequests);
router.put('/me/privacy', authenticate, validate(updatePrivacySchema), updatePrivacy);

// --- Target user :userId (UUID validated) ---
router.get('/:userId/status', authenticate, validateParams(userIdParamSchema), getFollowStatus);

// --- Target user :userId (UUID validated) ---
router.post(
  '/:userId/follow',
  authenticate,
  validateParams(userIdParamSchema),
  followUser,
);
router.delete(
  '/:userId/follow',
  authenticate,
  validateParams(userIdParamSchema),
  unfollowUser,
);
router.post(
  '/:userId/follow/accept',
  authenticate,
  validateParams(userIdParamSchema),
  acceptFollowRequest,
);
router.post(
  '/:userId/follow/reject',
  authenticate,
  validateParams(userIdParamSchema),
  rejectFollowRequest,
);
router.get(
  '/:userId/followers',
  authenticate,
  validateParams(userIdParamSchema),
  getFollowers,
);
router.get(
  '/:userId/following',
  authenticate,
  validateParams(userIdParamSchema),
  getFollowing,
);

module.exports = router;
