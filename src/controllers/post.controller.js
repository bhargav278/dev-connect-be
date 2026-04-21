const postService = require("../services/post.service");
const { sendSuccess, sendError, HTTP_STATUS } = require("../utils/ApiResponse");

/** Map known service errors to HTTP status codes. */
const mapPostError = (message) => {
  switch (message) {
    case "Post not found":
    case "Comment not found":
    case "User not found":
      return HTTP_STATUS.NOT_FOUND;
    case "This account is private":
    case "You are not authorized to delete this post":
    case "You are not authorized to delete this comment":
      return HTTP_STATUS.FORBIDDEN;
    default:
      return HTTP_STATUS.INTERNAL_ERROR;
  }
};

const createPost = async (req, res) => {
  try {
    const post = await postService.createPost(req.user.id, req.body, req.file);
    return sendSuccess(res, HTTP_STATUS.CREATED, "Post created successfully", {
      post,
    });
  } catch (error) {
    return sendError(res, mapPostError(error.message), error.message);
  }
};

const getPostById = async (req, res) => {
  try {
    const post = await postService.getPostById(req.params.id, req.user.id);
    return sendSuccess(res, HTTP_STATUS.OK, "Post fetched successfully", { post });
  } catch (error) {
    return sendError(res, mapPostError(error.message), error.message);
  }
};

const deletePost = async (req, res) => {
  try {
    const result = await postService.deletePost(req.params.id, req.user.id);
    return sendSuccess(res, HTTP_STATUS.OK, result.message);
  } catch (error) {
    return sendError(res, mapPostError(error.message), error.message);
  }
};

const getPersonalFeed = async (req, res) => {
  try {
    const { page, limit, tag } = req.query;
    const result = await postService.getPersonalFeed(
      req.user.id,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      tag,
    );
    return sendSuccess(res, HTTP_STATUS.OK, "Feed fetched successfully", result);
  } catch (error) {
    return sendError(res, mapPostError(error.message), error.message);
  }
};

const getExploreFeed = async (req, res) => {
  try {
    const { page, limit, tag } = req.query;
    const result = await postService.getExploreFeed(
      req.user.id,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      tag,
    );
    return sendSuccess(res, HTTP_STATUS.OK, "Explore feed fetched successfully", result);
  } catch (error) {
    return sendError(res, mapPostError(error.message), error.message);
  }
};

const getUserPosts = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await postService.getUserPosts(
      req.params.userId,
      req.user.id,
      parseInt(page) || 1,
      parseInt(limit) || 20,
    );
    return sendSuccess(res, HTTP_STATUS.OK, "User posts fetched successfully", result);
  } catch (error) {
    return sendError(res, mapPostError(error.message), error.message);
  }
};

const toggleLike = async (req, res) => {
  try {
    const result = await postService.toggleLike(req.params.id, req.user.id);
    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      result.isLiked ? "Post liked" : "Post unliked",
      result,
    );
  } catch (error) {
    return sendError(res, mapPostError(error.message), error.message);
  }
};

const getPostLikes = async (req, res) => {
  try {
    const users = await postService.getPostLikes(req.params.id, req.user.id);
    return sendSuccess(res, HTTP_STATUS.OK, "Likes fetched successfully", { users });
  } catch (error) {
    return sendError(res, mapPostError(error.message), error.message);
  }
};

const addComment = async (req, res) => {
  try {
    const comment = await postService.addComment(
      req.params.id,
      req.user.id,
      req.body.content,
    );
    return sendSuccess(res, HTTP_STATUS.CREATED, "Comment added successfully", {
      comment,
    });
  } catch (error) {
    return sendError(res, mapPostError(error.message), error.message);
  }
};

const getPostComments = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await postService.getPostComments(
      req.params.id,
      req.user.id,
      parseInt(page) || 1,
      parseInt(limit) || 20,
    );
    return sendSuccess(res, HTTP_STATUS.OK, "Comments fetched successfully", result);
  } catch (error) {
    return sendError(res, mapPostError(error.message), error.message);
  }
};

const deleteComment = async (req, res) => {
  try {
    const result = await postService.deleteComment(
      req.params.commentId,
      req.params.id,
      req.user.id,
    );
    return sendSuccess(res, HTTP_STATUS.OK, result.message);
  } catch (error) {
    return sendError(res, mapPostError(error.message), error.message);
  }
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
