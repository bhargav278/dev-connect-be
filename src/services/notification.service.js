'use strict';

const { Notification, User } = require('../models');
const { sendNotificationToUser } = require('./socket.service');
const getCloudinaryUrl = require('../utils/getCloudinaryUrl');

/** Fields to select when embedding the actor (who triggered the notification) */
const ACTOR_FIELDS = ['id', 'name', 'username', 'avatar'];

/**
 * Resolves the actor's avatar public_id → full Cloudinary URL.
 * All other fields are returned as-is.
 *
 * @param {object} notification - Sequelize Notification instance or plain object
 * @returns {object} notification with actor.avatar as a full URL
 */
const withActorAvatarUrl = (notification) => {
  const json = notification.toJSON ? notification.toJSON() : { ...notification };
  if (json.actor?.avatar) {
    json.actor.avatar = getCloudinaryUrl(json.actor.avatar);
  }
  return json;
};

/**
 * Creates a notification in the DB and emits it in real-time via Socket.io.
 * Silently skips if actor === recipient (no self-notifications).
 *
 * @param {object} params
 * @param {string} params.userId      - ID of the user who receives the notification
 * @param {string} params.actorId     - ID of the user who triggered the action
 * @param {string} params.type        - Notification type: like | comment | follow | follow_request | follow_accept
 * @param {string|null} params.referenceId - Related entity ID (postId for like/comment, null for follow)
 * @param {string} params.message     - Human-readable message e.g. "liked your post"
 * @returns {Promise<object|null>} The created notification with resolved avatar URL, or null if self-action
 */
const createNotification = async ({ userId, actorId, type, referenceId, message }) => {
  // Never create a notification when a user acts on their own content
  if (userId === actorId) return null;

  // Lazy-require to avoid circular dependency (getIo → socket.service → notification.service)
  const { getIo } = require('../utils/getIo');
  const io = getIo();

  // Persist to DB
  const notification = await Notification.create({
    userId,
    actorId,
    type,
    referenceId: referenceId || null,
    message,
  });

  // Re-fetch with actor details so the real-time payload is complete
  const fullNotification = await Notification.findByPk(notification.id, {
    include: [{ model: User, as: 'actor', attributes: ACTOR_FIELDS }],
  });

  // Resolve avatar URL before sending over the socket
  const payload = withActorAvatarUrl(fullNotification);

  // Emit to the recipient's personal room if they are online
  if (io) {
    sendNotificationToUser(io, userId, payload);
  }

  return payload;
};

/**
 * Fetches paginated notifications for a user, newest first.
 * Also returns the current unread count for badge display.
 *
 * @param {string} userId
 * @param {number} page  - 1-based page number
 * @param {number} limit - Items per page
 * @returns {Promise<object>} { notifications, totalNotifications, totalPages, currentPage, unreadCount }
 */
const getNotifications = async (userId, page, limit) => {
  const offset = (page - 1) * limit;

  const { count, rows } = await Notification.findAndCountAll({
    where: { userId },
    include: [{ model: User, as: 'actor', attributes: ACTOR_FIELDS }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  // Resolve avatar URLs for all notifications
  const notifications = rows.map(withActorAvatarUrl);

  // Fetch unread count separately for the badge
  const unreadCount = await getUnreadCount(userId);

  return {
    notifications,
    totalNotifications: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    unreadCount,
  };
};

/**
 * Marks all unread notifications for a user as read.
 *
 * @param {string} userId
 * @returns {Promise<{ message: string }>}
 */
const markAllAsRead = async (userId) => {
  await Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } },
  );
  return { message: 'All notifications marked as read' };
};

/**
 * Marks a single notification as read.
 * Throws if the notification doesn't belong to the user.
 *
 * @param {string} notificationId
 * @param {string} userId
 * @returns {Promise<object>} Updated notification
 */
const markOneAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new Error('Notification not found');

  notification.isRead = true;
  await notification.save();
  return notification;
};

/**
 * Soft-deletes a notification.
 * Throws if the notification doesn't belong to the user.
 *
 * @param {string} notificationId
 * @param {string} userId
 * @returns {Promise<{ message: string }>}
 */
const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new Error('Notification not found');

  await notification.destroy();
  return { message: 'Notification deleted' };
};

/**
 * Returns the count of unread notifications for a user.
 * Used for the notification badge in the UI.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
const getUnreadCount = async (userId) => {
  return Notification.count({
    where: { userId, isRead: false },
  });
};

module.exports = {
  createNotification,
  getNotifications,
  markAllAsRead,
  markOneAsRead,
  deleteNotification,
  getUnreadCount,
};
