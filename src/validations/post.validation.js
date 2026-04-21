const Joi = require("joi");

/**
 * POST /api/posts — create a new post.
 */
const createPostSchema = Joi.object({
  content: Joi.string().trim().min(1).max(5000).required().messages({
    "string.empty": "Post content cannot be empty",
    "string.min": "Post content cannot be empty",
    "string.max": "Post content must be at most 5000 characters",
    "any.required": "Post content is required",
  }),
  codeSnippet: Joi.string().trim().max(10000).allow("", null).messages({
    "string.max": "Code snippet must be at most 10000 characters",
  }),
  language: Joi.string()
    .trim()
    .max(50)
    .allow("", null)
    .when("codeSnippet", {
      is: Joi.string().min(1),
      then: Joi.string().trim().max(50).optional(),
      otherwise: Joi.string().valid("", null).optional(),
    })
    .messages({
      "string.max": "Language must be at most 50 characters",
    }),
  tags: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().max(30)).max(10),
      Joi.string().trim().max(300),
    )
    .optional()
    .messages({
      "array.max": "A post can have at most 10 tags",
    }),
});

/**
 * POST /api/posts/:id/comments — add a comment.
 */
const addCommentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required().messages({
    "string.empty": "Comment cannot be empty",
    "string.min": "Comment cannot be empty",
    "string.max": "Comment must be at most 2000 characters",
    "any.required": "Comment content is required",
  }),
});

/**
 * GET /api/posts/feed, /api/posts/explore — query params.
 */
const feedQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(50).default(20).messages({
    "number.base": "Limit must be a number",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must be at most 50",
  }),
  tag: Joi.string().trim().max(30).allow("").optional().messages({
    "string.max": "Tag must be at most 30 characters",
  }),
});

module.exports = { createPostSchema, addCommentSchema, feedQuerySchema };
