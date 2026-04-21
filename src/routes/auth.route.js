const express = require('express');
const authRouter = express.Router();
const { register, login, refreshTokens, logout } = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validations/auth.validation');

authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/refresh', refreshTokens);
authRouter.post('/logout', logout);

module.exports = authRouter;