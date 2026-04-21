const Joi = require('joi');

const uuidMessage = {
  'string.guid': 'Must be a valid user id',
  'any.required': 'User id is required',
};

/**
 * Routes under /api/follow/:userId/...
 */
const userIdParamSchema = Joi.object({
  userId: Joi.string().uuid().required().messages(uuidMessage),
});

/**
 * PUT /api/follow/me/privacy — explicit private/public flag (no ambiguous toggle).
 */
const updatePrivacySchema = Joi.object({
  isPrivate: Joi.boolean().required().messages({
    'boolean.base': 'isPrivate must be true or false',
    'any.required': 'isPrivate is required',
  }),
});

module.exports = { userIdParamSchema, updatePrivacySchema };
