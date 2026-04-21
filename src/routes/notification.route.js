'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markOneAsRead,
  deleteNotification,
} = require('../controllers/notification.controller');

// All notification routes require authentication

/** GET  /api/notifications              — paginated notification list + unread count */
router.get('/', authenticate, getNotifications);

/** GET  /api/notifications/unread-count — badge count only (lightweight) */
router.get('/unread-count', authenticate, getUnreadCount);

/** PUT  /api/notifications/mark-all-read — mark every notification as read */
router.put('/mark-all-read', authenticate, markAllAsRead);

/** PUT  /api/notifications/:id/read     — mark one notification as read */
router.put('/:id/read', authenticate, markOneAsRead);

/** DELETE /api/notifications/:id        — soft-delete one notification */
router.delete('/:id', authenticate, deleteNotification);

module.exports = router;
