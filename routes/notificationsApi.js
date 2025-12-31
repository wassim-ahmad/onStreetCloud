const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const notificationModel = require('../models/Notification');
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

router.get('/notifications', verifyToken, requirePermission("view_notification"), async (req, res) => {
  try {
    logger.info("get notifications by user: ",{ admin: req.user, user_id: req.user.id });
    const page_id = parseInt(req.query.page) || 1;
    const currentPage = page_id;
    const pageUri = '/notifications';
    const perPage = parseInt(req.query.perPage) || 10;
    const user_id = req.user.id;

    // Get total notifications count for this user
    const totalCountResult = await notificationModel.getNotificationsTotalCount(user_id);
    const totalCount = totalCountResult[0]?.total || 0;

    const offset = (page_id - 1) * perPage;

    const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage);

    // Get paginated notifications
    const notificationsPaginate = await notificationModel.getNotificationPaginate(user_id, perPage, offset);

    logger.success("get notifications by user successfully", { admin: req.user, user_id: req.user.id, total: totalCount});
    res.json({
      message: 'Notifications fetched successfully',
      total: totalCount,
      data: notificationsPaginate,
      links: Paginate.links()
    });

  } catch (err) {
    logger.error('get notifications by user failed', { admin: req.user, user_id: req.user.id, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});


router.delete('/delete-notification/:id', verifyToken, requirePermission("delete_notification"), async (req, res) => {
  try {
    logger.info("delete notification by id: ",{ admin: req.user, notification_id: req.params.id });
    const id = req.params.id;

    // Delete notification
    const result = await notificationModel.deleteNotification(id);

    logger.success("delete notification by id  successfully", { admin: req.user, result: result });
    res.json({
      message: 'Notification deleted successfully',
      data: result
    });

  } catch (err) {
    logger.error('delete notification by id failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.delete('/notifications/delete-all', verifyToken, requirePermission("delete_notification"), async (req, res) => {
  try {
    logger.info("delete all notifications by user: ",{ admin: req.user, user_id: req.user.id });
    const userId = req.user.id;
    console.log(userId);

    // Delete all notifications for this user
    const result = await notificationModel.deleteAllNotificationsForUser(userId);

    logger.success("delete all notifications by user successfully", { admin: req.user, result: result });
    res.json({
      message: 'All notifications deleted successfully',
      data: result
    });

  } catch (err) {
    logger.error('delete all notifications by user failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.post('/notifications/mark-all-read', verifyToken, requirePermission("read_notification"), async (req, res) => {
  try {
    logger.info("read all notifications by user: ",{ admin: req.user, user_id: req.user.id });
    const userId = req.user.id;

    // Mark all notifications as read for this user
    const result = await notificationModel.markAllAsRead(userId);

    logger.success("read all notifications by user successfully", { admin: req.user, result: result });
    res.json({
      message: 'All notifications marked as read successfully',
      data: result
    });

  } catch (err) {
    logger.error('read all notifications by user failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.post('/notifications/:id/mark-read', verifyToken, requirePermission("read_notification"), async (req, res) => {
  try {
    logger.info("read one notification by id: ",{ admin: req.user, notification_id: req.params.id });
    const notificationId = req.params.id;

    // Mark the notification as read
    const result = await notificationModel.markAsRead(notificationId);

    logger.success("read one notification by id successfully", { admin: req.user, result: result });
    res.json({
      message: 'Notification marked as read successfully',
      data: result
    });

  } catch (err) {
    logger.error('read on notification by id failed', { admin: req.user, notification_id: req.params.id,error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});


module.exports = router;
