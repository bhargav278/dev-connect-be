'use strict';

const notificationService = require('../services/notification.service');
const { sendSuccess, HTTP_STATUS } = require('../utils/ApiResponse');

/**
 * GET /api/notifications
 * Returns paginated notifications for the authenticated user.
 * Response includes resolved actor avatar URLs and current unread count.
 *
 * Query params:
 *   page  {number} default 1
 *   limit {number} default 20
 */
const getNotifications = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await notificationService.getNotifications(
      req.user.id,
      parseInt(page) || 1,
      parseInt(limit) || 20,
    );
    sendSuccess(res, HTTP_STATUS.OK, 'Notifications fetched', result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns the count of unread notifications for the authenticated user.
 * Lightweight endpoint used for the notification badge in the UI.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    sendSuccess(res, HTTP_STATUS.OK, 'Unread count fetched', { unreadCount: count });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/mark-all-read
 * Marks all unread notifications for the authenticated user as read.
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    sendSuccess(res, HTTP_STATUS.OK, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Marks a single notification as read.
 * Returns 404 if the notification doesn't belong to the authenticated user.
 *
 * Params:
 *   id {UUID} notification ID
 */
const markOneAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markOneAsRead(
      req.params.id,
      req.user.id,
    );
    sendSuccess(res, HTTP_STATUS.OK, 'Notification marked as read', { notification });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 * Soft-deletes a notification.
 * Returns 404 if the notification doesn't belong to the authenticated user.
 *
 * Params:
 *   id {UUID} notification ID
 */
const deleteNotification = async (req, res, next) => {
  try {
    const result = await notificationService.deleteNotification(
      req.params.id,
      req.user.id,
    );
    sendSuccess(res, HTTP_STATUS.OK, result.message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markOneAsRead,
  deleteNotification,
};
