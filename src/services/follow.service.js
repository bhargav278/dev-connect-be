const { User, Follower } = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('./notification.service');

/** Safe fields when embedding users in follow payloads */
const PUBLIC_USER_FIELDS = ['id', 'name', 'username', 'avatar', 'isPrivate'];

const includeActiveUser = (as) => ({
  model: User,
  as,
  attributes: PUBLIC_USER_FIELDS,
  where: { isActive: true },
  required: true,
});

/**
 * @param {string} followerId – authenticated user
 * @param {string} followingId – user to follow
 * @returns {Promise<{ status: string, message: string }>}
 */
const followUser = async (followerId, followingId) => {
  if (followerId === followingId) {
    throw new Error('You cannot follow yourself');
  }

  const targetUser = await User.findByPk(followingId);
  if (!targetUser || !targetUser.isActive) {
    throw new Error('User not found');
  }

  const existingFollow = await Follower.findOne({
    where: { followerId, followingId },
    paranoid: false,
  });

  if (existingFollow) {
    if (existingFollow.deletedAt) {
      await existingFollow.restore();
      existingFollow.status = targetUser.isPrivate ? 'pending' : 'accepted';
      await existingFollow.save();

      return {
        status: existingFollow.status,
        message: targetUser.isPrivate ? 'Follow request sent' : 'Following successfully',
      };
    }

    if (existingFollow.status === 'pending') {
      throw new Error('Follow request already sent');
    }
    if (existingFollow.status === 'accepted') {
      throw new Error('Already following this user');
    }

    existingFollow.status = targetUser.isPrivate ? 'pending' : 'accepted';
    await existingFollow.save();

    return {
      status: existingFollow.status,
      message: targetUser.isPrivate ? 'Follow request sent' : 'Following successfully',
    };
  }

  const status = targetUser.isPrivate ? 'pending' : 'accepted';
  await Follower.create({ followerId, followingId, status });

  if (targetUser.isPrivate) {
    await createNotification({
      userId: followingId,
      actorId: followerId,
      type: 'follow_request',
      referenceId: null,
      message: 'sent you a follow request',
    });
  } else {
    await createNotification({
      userId: followingId,
      actorId: followerId,
      type: 'follow',
      referenceId: null,
      message: 'started following you',
    });
  }

  return {
    status,
    message: targetUser.isPrivate ? 'Follow request sent' : 'Following successfully',
  };
};

/**
 * @param {string} followerId
 * @param {string} followingId
 */
const unfollowUser = async (followerId, followingId) => {
  if (followerId === followingId) {
    throw new Error('You cannot unfollow yourself');
  }

  const follow = await Follower.findOne({
    where: { followerId, followingId, status: { [Op.in]: ['accepted', 'pending'] } },
  });

  if (!follow) {
    throw new Error('You are not following this user');
  }

  await follow.destroy();

  return { message: 'Unfollowed successfully' };
};

/**
 * @param {string} currentUserId – account owner (accepts the request)
 * @param {string} requesterId – user who sent the follow request
 */
const acceptFollowRequest = async (currentUserId, requesterId) => {
  const follow = await Follower.findOne({
    where: {
      followerId: requesterId,
      followingId: currentUserId,
      status: 'pending',
    },
  });

  if (!follow) {
    throw new Error('No pending follow request found');
  }

  follow.status = 'accepted';
  await follow.save();

  await createNotification({
    userId: requesterId,
    actorId: currentUserId,
    type: 'follow_accept',
    referenceId: null,
    message: 'accepted your follow request',
  });

  return { message: 'Follow request accepted' };
};

/**
 * @param {string} currentUserId
 * @param {string} requesterId
 */
const rejectFollowRequest = async (currentUserId, requesterId) => {
  const follow = await Follower.findOne({
    where: {
      followerId: requesterId,
      followingId: currentUserId,
      status: 'pending',
    },
  });

  if (!follow) {
    throw new Error('No pending follow request found');
  }

  follow.status = 'rejected';
  await follow.save();

  return { message: 'Follow request rejected' };
};

/**
 * Accepted followers of `userId` (users where followingId = userId).
 *
 * @param {string} userId – profile being viewed
 * @param {string} viewerId – authenticated user (for private checks)
 */
const getFollowers = async (userId, viewerId) => {
  const user = await User.findByPk(userId);
  if (!user || !user.isActive) {
    throw new Error('User not found');
  }

  if (user.isPrivate && userId !== viewerId) {
    const isFollowing = await Follower.findOne({
      where: { followerId: viewerId, followingId: userId, status: 'accepted' },
    });
    if (!isFollowing) {
      throw new Error('This account is private');
    }
  }

  const followers = await Follower.findAll({
    where: { followingId: userId, status: 'accepted' },
    include: [includeActiveUser('follower')],
  });

  return followers.map((f) => f.follower);
};

/**
 * Users that `userId` follows (accepted only).
 *
 * @param {string} userId
 * @param {string} viewerId
 */
const getFollowing = async (userId, viewerId) => {
  const user = await User.findByPk(userId);
  if (!user || !user.isActive) {
    throw new Error('User not found');
  }

  if (user.isPrivate && userId !== viewerId) {
    const isFollowing = await Follower.findOne({
      where: { followerId: viewerId, followingId: userId, status: 'accepted' },
    });
    if (!isFollowing) {
      throw new Error('This account is private');
    }
  }

  const following = await Follower.findAll({
    where: { followerId: userId, status: 'accepted' },
    include: [includeActiveUser('following')],
  });

  return following.map((f) => f.following);
};

/**
 * Incoming pending requests for the authenticated user’s private account flow.
 *
 * @param {string} userId
 */
const getPendingRequests = async (userId) => {
  const requests = await Follower.findAll({
    where: { followingId: userId, status: 'pending' },
    include: [includeActiveUser('follower')],
    order: [['createdAt', 'DESC']],
  });

  return requests.map((r) => ({
    requestId: r.id,
    user: r.follower,
    requestedAt: r.createdAt,
  }));
};

/**
 * @param {string} userId
 * @param {boolean} isPrivate
 */
const getFollowStatus = async (followerId, followingId) => {
  if (followerId === followingId) return { status: 'self' };

  const follow = await Follower.findOne({
    where: { followerId, followingId },
  });

  if (!follow) return { status: 'none' };
  return { status: follow.status }; // 'pending' | 'accepted' | 'rejected'
};

/**
 * @param {string} userId
 * @param {boolean} isPrivate
 */
const updatePrivacy = async (userId, isPrivate) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  user.isPrivate = isPrivate;
  await user.save();

  return {
    isPrivate: user.isPrivate,
    message: user.isPrivate ? 'Account is now private' : 'Account is now public',
  };
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
