const Joi = require('joi');

/**
 * Partial profile update — only fields that exist on the User model.
 * At least one field required so PUT is not an empty body.
 */
const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 50 characters',
      'string.pattern.base': 'Name can only contain letters and spaces',
    }),

  username: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/)
    .min(3)
    .max(30)
    .lowercase()
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, underscores and periods (but not consecutive or at the edges)',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 30 characters',
    }),

  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),

  bio: Joi.string().trim().max(500).allow('', null).messages({
    'string.max': 'Bio must not exceed 500 characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'Provide at least one field to update',
  });

/**
 * Password update — requires current password + new password with confirmation.
 */
const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required',
      'any.required': 'Current password is required',
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password must not exceed 128 characters',
      'string.pattern.base':
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
      'any.required': 'New password is required',
      'any.invalid': 'New password must be different from current password',
    }),

  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'string.empty': 'Please confirm your new password',
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your new password',
    }),
});

/**
 * Query string for GET /api/user/search
 */
const searchUsersQuerySchema = Joi.object({
  q: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.base': 'Search query must be a string',
      'string.empty': 'Search query is required',
      'string.min': 'Search query must be at least 2 characters',
      'string.max': 'Search query must not exceed 100 characters',
      'any.required': 'Search query is required',
    }),
});

module.exports = { updateProfileSchema, updatePasswordSchema, searchUsersQuerySchema };
