const Joi = require('joi');

/**
 * Validation schema for user registration
 */
const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.base': 'Name must be a string',
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 50 characters',
      'string.pattern.base': 'Name can only contain letters and spaces',
      'any.required': 'Name is required',
    }),

  username: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/)
    .min(3)
    .max(30)
    .lowercase()
    .required()
    .messages({
      'string.base': 'Username must be a string',
      'string.empty': 'Username is required',
      'string.pattern.base': 'Username can only contain letters, numbers, underscores and periods (but not consecutive or at the edges)',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 30 characters',
      'any.required': 'Username is required',
    }),

  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
      'any.required': 'Password is required',
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'string.empty': 'Please confirm your password',
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password',
    }),
});

/**
 * Validation schema for user login
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
});

module.exports = { registerSchema, loginSchema };
