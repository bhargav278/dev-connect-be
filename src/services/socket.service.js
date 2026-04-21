'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const getCloudinaryUrl = require('../utils/getCloudinaryUrl');

/**
 * In-memory map of currently connected users.
 * key   = userId (string)
 * value = socketId (string)
 *
 * Note: this is per-process only. For multi-server deployments
 * a Redis adapter would be needed to share state across instances.
 */
const onlineUsers = new Map();

/**
 * Initialises Socket.io with JWT auth middleware and connection/disconnect handlers.
 * Must be called once at server startup after `setIo`.
 *
 * @param {import('socket.io').Server} io
 */
const initializeSocket = (io) => {

  // ─── Auth Middleware ────────────────────────────────────────────────────────
  // Runs before every socket connection is established.
  // Verifies the JWT sent in socket.handshake.auth.token and attaches the
  // authenticated user to the socket instance.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'name', 'username', 'avatar'],
      });

      if (!user) return next(new Error('User not found'));

      // Resolve avatar public_id → full Cloudinary URL before attaching to socket
      const userJson = user.toJSON();
      if (userJson.avatar) {
        userJson.avatar = getCloudinaryUrl(userJson.avatar);
      }

      socket.user = userJson; // attach resolved user to socket
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`⚡ User connected: ${socket.user.username} (${socket.id})`);

    // Track this user as online
    onlineUsers.set(userId, socket.id);

    // Each user joins a personal room named after their userId.
    // This allows targeted notification delivery via io.to(userId).emit(...)
    socket.join(userId);

    // Send the current list of online userIds to the newly connected client
    socket.emit('online_users_list', { userIds: Array.from(onlineUsers.keys()) });

    // Broadcast to all other connected clients that this user is now online
    socket.broadcast.emit('user_online', { userId });

    // ─── get_online_users — client can request the list at any time ───────────
    socket.on('get_online_users', () => {
      socket.emit('online_users_list', { userIds: Array.from(onlineUsers.keys()) });
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.user.username} (${reason})`);
      onlineUsers.delete(userId);
      socket.broadcast.emit('user_offline', { userId });
    });  });
};

/**
 * Emits a `new_notification` event to a specific user's personal room.
 * The user receives it on all their connected devices/tabs.
 *
 * @param {import('socket.io').Server} io
 * @param {string} userId       - Recipient's user ID (room name)
 * @param {object} notification - Full notification payload with resolved avatar URL
 */
const sendNotificationToUser = (io, userId, notification) => {
  io.to(userId).emit('new_notification', notification);
};

/**
 * Checks whether a user currently has an active socket connection.
 *
 * @param {string} userId
 * @returns {boolean}
 */
const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

/**
 * Returns an array of all currently online user IDs.
 *
 * @returns {string[]}
 */
const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

module.exports = {
  initializeSocket,
  sendNotificationToUser,
  isUserOnline,
  getOnlineUsers,
};
