const { Post, User, Like, Comment, Follower } = require("../models");
const { Op } = require("sequelize");
const { cloudinary } = require("../config/cloudinary");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const getCloudinaryUrl = require("../utils/getCloudinaryUrl");
const { createNotification } = require('./notification.service');

const POST_AUTHOR_FIELDS = ["id", "name", "username", "avatar", "isPrivate"];

const withCommentAvatarUrl = (comment) => {
  const json = comment.toJSON ? comment.toJSON() : { ...comment };
  if (json.author && json.author.avatar) {
    json.author.avatar = getCloudinaryUrl(json.author.avatar);
  }
  return json;
};

const withUserAvatarUrl = (user) => {
  const json = user.toJSON ? user.toJSON() : { ...user };
  if (json.avatar) {
    json.avatar = getCloudinaryUrl(json.avatar);
  }
  return json;
};

/**
 * Converts post image `public_id` → full URL and author avatar `public_id` → full URL.
 * Mirrors the `withAvatarUrl` pattern from user.service.js.
 */
const withImageUrls = (post) => {
  const json = post.toJSON ? post.toJSON() : { ...post };

  // Post image — use post-specific transforms (wider, not face-cropped)
  json.imageUrl = getCloudinaryUrl(json.imageUrl, {
    transformation: [
      { width: 1200, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  });

  // Author avatar
  if (json.author && json.author.avatar) {
    json.author.avatar = getCloudinaryUrl(json.author.avatar);
  }

  return json;
};

// Helper — check if currentUser can view posts of targetUser
const canViewPosts = async (targetUserId, currentUserId) => {
  const targetUser = await User.findByPk(targetUserId);
  if (!targetUser) throw new Error("User not found");

  // Public account → anyone can view
  if (!targetUser.isPrivate) return true;

  // Own profile → always can view
  if (targetUserId === currentUserId) return true;

  // Private account → check if following
  const follow = await Follower.findOne({
    where: {
      followerId: currentUserId,
      followingId: targetUserId,
      status: "accepted",
    },
  });

  return !!follow;
};

const createPost = async (userId, data, file) => {
  const { content, codeSnippet, language } = data;

  // Parse tags — could be a JSON string from form-data or already an array
  let parsedTags = data.tags || [];
  if (typeof parsedTags === "string") {
    try {
      parsedTags = JSON.parse(parsedTags);
    } catch {
      // Comma-separated fallback: "javascript,react" → ["javascript", "react"]
      parsedTags = parsedTags.split(",").map((t) => t.trim()).filter(Boolean);
    }
  }

  let imageUrl = null;

  // Upload image if provided — stores public_id in DB
  if (file) {
    const result = await uploadToCloudinary(
      file.buffer,
      "posts",
      `${userId}_${Date.now()}`,
      { type: 'post' }
    );
    imageUrl = result.public_id;
  }

  const post = await Post.create({
    userId,
    content,
    codeSnippet: codeSnippet || null,
    language: language || null,
    imageUrl,
    tags: parsedTags,
  });

  // Return post with author info and resolved URLs
  const fullPost = await Post.findByPk(post.id, {
    include: [{ model: User, as: "author", attributes: POST_AUTHOR_FIELDS }],
  });

  return withImageUrls(fullPost);
};

const getPostById = async (postId, currentUserId) => {
  const post = await Post.findByPk(postId, {
    include: [{ model: User, as: "author", attributes: POST_AUTHOR_FIELDS }],
  });

  if (!post) throw new Error("Post not found");

  // Check visibility
  const canView = await canViewPosts(post.userId, currentUserId);
  if (!canView) throw new Error("This account is private");

  // Check if current user liked this post
  const like = await Like.findOne({
    where: { userId: currentUserId, postId },
  });

  return withImageUrls({ ...post.toJSON(), isLiked: !!like });
};

const deletePost = async (postId, currentUserId) => {
  const post = await Post.findByPk(postId);
  if (!post) throw new Error("Post not found");

  // Only post owner can delete
  if (post.userId !== currentUserId) {
    throw new Error("You are not authorized to delete this post");
  }

  // Delete image from cloudinary if exists
  if (post.imageUrl) {
    await cloudinary.uploader.destroy(post.imageUrl);
  }

  // Soft delete
  await post.destroy();

  return { message: "Post deleted successfully" };
};

const getPersonalFeed = async (currentUserId, page, limit, tag) => {
  // Get all accepted following ids
  const following = await Follower.findAll({
    where: { followerId: currentUserId, status: "accepted" },
    attributes: ["followingId"],
  });

  const followingIds = following.map((f) => f.followingId);

  // Include own posts in feed
  followingIds.push(currentUserId);

  const whereClause = {
    userId: { [Op.in]: followingIds },
  };

  // Filter by tag if provided
  if (tag) {
    whereClause.tags = { [Op.contains]: [tag] };
  }

  const offset = (page - 1) * limit;

  const { count, rows: posts } = await Post.findAndCountAll({
    where: whereClause,
    include: [{ model: User, as: "author", attributes: POST_AUTHOR_FIELDS }],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  // Check which posts current user has liked
  const postIds = posts.map((p) => p.id);
  const likes = await Like.findAll({
    where: { userId: currentUserId, postId: { [Op.in]: postIds } },
    attributes: ["postId"],
  });
  const likedPostIds = new Set(likes.map((l) => l.postId));

  const postsWithLikes = posts.map((post) =>
    withImageUrls({
      ...post.toJSON(),
      isLiked: likedPostIds.has(post.id),
    }),
  );

  return {
    posts: postsWithLikes,
    totalPosts: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
  };
};

const getExploreFeed = async (currentUserId, page, limit, tag) => {
  const whereClause = {};

  if (tag) {
    whereClause.tags = { [Op.contains]: [tag] };
  }

  const offset = (page - 1) * limit;

  // Only show posts from public accounts
  const { count, rows: posts } = await Post.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: "author",
        attributes: POST_AUTHOR_FIELDS,
        where: { isPrivate: false }, // only public accounts
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  // Check which posts current user has liked
  const postIds = posts.map((p) => p.id);
  const likes = await Like.findAll({
    where: { userId: currentUserId, postId: { [Op.in]: postIds } },
    attributes: ["postId"],
  });
  const likedPostIds = new Set(likes.map((l) => l.postId));

  const postsWithLikes = posts.map((post) =>
    withImageUrls({
      ...post.toJSON(),
      isLiked: likedPostIds.has(post.id),
    }),
  );

  return {
    posts: postsWithLikes,
    totalPosts: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
  };
};

const getUserPosts = async (targetUserId, currentUserId, page, limit) => {
  // Check visibility
  const canView = await canViewPosts(targetUserId, currentUserId);
  if (!canView) throw new Error("This account is private");

  const offset = (page - 1) * limit;

  const { count, rows: posts } = await Post.findAndCountAll({
    where: { userId: targetUserId },
    include: [{ model: User, as: "author", attributes: POST_AUTHOR_FIELDS }],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  // Check which posts current user liked
  const postIds = posts.map((p) => p.id);
  const likes = await Like.findAll({
    where: { userId: currentUserId, postId: { [Op.in]: postIds } },
    attributes: ["postId"],
  });
  const likedPostIds = new Set(likes.map((l) => l.postId));

  const postsWithLikes = posts.map((post) =>
    withImageUrls({
      ...post.toJSON(),
      isLiked: likedPostIds.has(post.id),
    }),
  );

  return {
    posts: postsWithLikes,
    totalPosts: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
  };
};

const toggleLike = async (postId, userId) => {
  const post = await Post.findByPk(postId);
  if (!post) throw new Error("Post not found");

  // Check visibility
  const canView = await canViewPosts(post.userId, userId);
  if (!canView) throw new Error("This account is private");

  // Check if already liked (including soft deleted)
  const existingLike = await Like.findOne({
    where: { userId, postId },
    paranoid: false,
  });

  if (existingLike) {
    if (existingLike.deletedAt) {
      // Previously unliked → restore (re-like)
      await existingLike.restore();
      await post.increment("likesCount", { by: 1 });
      await post.reload();

      await createNotification({
        userId: post.userId,
        actorId: userId,
        type: 'like',
        referenceId: postId,
        message: 'liked your post',
      });
      
      return { isLiked: true, likesCount: post.likesCount };
    }

    // Currently liked → unlike (soft delete)
    await existingLike.destroy();
    await post.decrement("likesCount", { by: 1 });
    await post.reload();
    return { isLiked: false, likesCount: post.likesCount };
  }

  // Never liked before → create like
  await Like.create({ userId, postId });

  await createNotification({
    userId: post.userId,
    actorId: userId,
    type: 'like',
    referenceId: postId,
    message: 'liked your post',
  });

  await post.increment("likesCount", { by: 1 });
  await post.reload();
  return { isLiked: true, likesCount: post.likesCount };
};

const getPostLikes = async (postId, currentUserId) => {
  const post = await Post.findByPk(postId);
  if (!post) throw new Error("Post not found");

  const canView = await canViewPosts(post.userId, currentUserId);
  if (!canView) throw new Error("This account is private");

  const likes = await Like.findAll({
    where: { postId },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "username", "avatar"],
      },
    ],
  });

  return likes.map((l) => withUserAvatarUrl(l.user));
};

const addComment = async (postId, userId, content) => {
  const post = await Post.findByPk(postId);
  if (!post) throw new Error("Post not found");

  const canView = await canViewPosts(post.userId, userId);
  if (!canView) throw new Error("This account is private");

  const comment = await Comment.create({ postId, userId, content });

  await createNotification({
    userId: post.userId,
    actorId: userId,
    type: 'comment',
    referenceId: postId,
    message: 'commented on your post',
  });

  // Increment cached count
  await post.increment("commentsCount", { by: 1 });

  const fullComment = await Comment.findByPk(comment.id, {
    include: [
      {
        model: User,
        as: "author",
        attributes: ["id", "name", "username", "avatar"],
      },
    ],
  });

  return withCommentAvatarUrl(fullComment);
};

const getPostComments = async (postId, currentUserId, page, limit) => {
  const post = await Post.findByPk(postId);
  if (!post) throw new Error("Post not found");

  const canView = await canViewPosts(post.userId, currentUserId);
  if (!canView) throw new Error("This account is private");

  const offset = (page - 1) * limit;

  const { count, rows: comments } = await Comment.findAndCountAll({
    where: { postId },
    include: [
      {
        model: User,
        as: "author",
        attributes: ["id", "name", "username", "avatar"],
      },
    ],
    order: [["createdAt", "ASC"]],
    limit,
    offset,
    distinct: true,
  });

  return {
    comments: comments.map(withCommentAvatarUrl),
    totalComments: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
  };
};

const deleteComment = async (commentId, postId, currentUserId) => {
  const comment = await Comment.findOne({ where: { id: commentId, postId } });
  if (!comment) throw new Error("Comment not found");

  const post = await Post.findByPk(postId);

  // Comment owner OR post owner can delete
  if (comment.userId !== currentUserId && post.userId !== currentUserId) {
    throw new Error("You are not authorized to delete this comment");
  }

  // Soft delete
  await comment.destroy();

  // Decrement cached count
  await post.decrement("commentsCount", { by: 1 });

  return { message: "Comment deleted successfully" };
};

module.exports = {
  createPost,
  getPostById,
  deletePost,
  getPersonalFeed,
  getExploreFeed,
  getUserPosts,
  toggleLike,
  getPostLikes,
  addComment,
  getPostComments,
  deleteComment,
};
