const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");
const validateQuery = validate.validateQuery;
const { upload } = require("../config/cloudinary");
const {
  createPostSchema,
  addCommentSchema,
  feedQuerySchema,
} = require("../validations/post.validation");
const {
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
} = require("../controllers/post.controller");

// Feed routes (must be before /:id to avoid conflicts)
router.get("/feed", authenticate, validateQuery(feedQuerySchema), getPersonalFeed);
router.get("/explore", authenticate, validateQuery(feedQuerySchema), getExploreFeed);

// Post CRUD
router.post(
  "/",
  authenticate,
  upload.single("image"),
  validate(createPostSchema),
  createPost,
);
router.get("/user/:userId", authenticate, getUserPosts);
router.get("/:id", authenticate, getPostById);
router.delete("/:id", authenticate, deletePost);

// Likes
router.post("/:id/like", authenticate, toggleLike);
router.get("/:id/likes", authenticate, getPostLikes);

// Comments
router.post(
  "/:id/comments",
  authenticate,
  validate(addCommentSchema),
  addComment,
);
router.get("/:id/comments", authenticate, getPostComments);
router.delete("/:id/comments/:commentId", authenticate, deleteComment);

module.exports = router;
