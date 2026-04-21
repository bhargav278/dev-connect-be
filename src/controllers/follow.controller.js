const {
  followUser: followUserSvc,
  unfollowUser: unfollowUserSvc,
  acceptFollowRequest: acceptFollowRequestSvc,
  rejectFollowRequest: rejectFollowRequestSvc,
  getFollowers: getFollowersSvc,
  getFollowing: getFollowingSvc,
  getPendingRequests: getPendingRequestsSvc,
  getFollowStatus: getFollowStatusSvc,
  updatePrivacy: updatePrivacySvc,
} = require('../services/follow.service');
const { sendSuccess, sendError, HTTP_STATUS } = require('../utils/ApiResponse');

const mapFollowError = (message) => {
  switch (message) {
    case 'User not found':
    case 'No pending follow request found':
      return HTTP_STATUS.NOT_FOUND;
    case 'This account is private':
      return HTTP_STATUS.FORBIDDEN;
    case 'Account is deactivated':
      return HTTP_STATUS.FORBIDDEN;
    case 'Follow request already sent':
    case 'Already following this user':
      return HTTP_STATUS.CONFLICT;
    case 'You cannot follow yourself':
    case 'You cannot unfollow yourself':
    case 'You are not following this user':
      return HTTP_STATUS.BAD_REQUEST;
    default:
      return HTTP_STATUS.INTERNAL_ERROR;
  }
};

const followUser = async (req, res) => {
  try {
    const result = await followUserSvc(req.user.id, req.params.userId);
    return sendSuccess(res, HTTP_STATUS.OK, result.message, { status: result.status });
  } catch (error) {
    return sendError(res, mapFollowError(error.message), error.message);
  }
};

const unfollowUser = async (req, res) => {
  try {
    const result = await unfollowUserSvc(req.user.id, req.params.userId);
    return sendSuccess(res, HTTP_STATUS.OK, result.message);
  } catch (error) {
    return sendError(res, mapFollowError(error.message), error.message);
  }
};

const acceptFollowRequest = async (req, res) => {
  try {
    const result = await acceptFollowRequestSvc(req.user.id, req.params.userId);
    return sendSuccess(res, HTTP_STATUS.OK, result.message);
  } catch (error) {
    return sendError(res, mapFollowError(error.message), error.message);
  }
};

const rejectFollowRequest = async (req, res) => {
  try {
    const result = await rejectFollowRequestSvc(req.user.id, req.params.userId);
    return sendSuccess(res, HTTP_STATUS.OK, result.message);
  } catch (error) {
    return sendError(res, mapFollowError(error.message), error.message);
  }
};

const getFollowers = async (req, res) => {
  try {
    const followers = await getFollowersSvc(req.params.userId, req.user.id);
    return sendSuccess(res, HTTP_STATUS.OK, 'Followers fetched successfully', { followers });
  } catch (error) {
    return sendError(res, mapFollowError(error.message), error.message);
  }
};

const getFollowing = async (req, res) => {
  try {
    const following = await getFollowingSvc(req.params.userId, req.user.id);
    return sendSuccess(res, HTTP_STATUS.OK, 'Following fetched successfully', { following });
  } catch (error) {
    return sendError(res, mapFollowError(error.message), error.message);
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const requests = await getPendingRequestsSvc(req.user.id);
    return sendSuccess(res, HTTP_STATUS.OK, 'Pending requests fetched', { requests });
  } catch (error) {
    return sendError(res, HTTP_STATUS.INTERNAL_ERROR, error.message);
  }
};

const getFollowStatus = async (req, res) => {
  try {
    const result = await getFollowStatusSvc(req.user.id, req.params.userId);
    return sendSuccess(res, HTTP_STATUS.OK, 'Follow status fetched', result);
  } catch (error) {
    return sendError(res, HTTP_STATUS.INTERNAL_ERROR, error.message);
  }
};

const updatePrivacy = async (req, res) => {
  try {
    const { isPrivate } = req.body;
    const result = await updatePrivacySvc(req.user.id, isPrivate);
    return sendSuccess(res, HTTP_STATUS.OK, result.message, { isPrivate: result.isPrivate });
  } catch (error) {
    if (error.message === 'Account is deactivated') {
      return sendError(res, HTTP_STATUS.FORBIDDEN, error.message);
    }
    if (error.message === 'User not found') {
      return sendError(res, HTTP_STATUS.NOT_FOUND, error.message);
    }
    return sendError(res, HTTP_STATUS.BAD_REQUEST, error.message);
  }
};

module.exports = {
  followUser,
  unfollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
  getFollowers,
  getFollowing,
  getPendingRequests,
  getFollowStatus,
  updatePrivacy,
};
