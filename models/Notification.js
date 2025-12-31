var pool = require('../config/dbConnection');

// async function mainQuery(query) {
//   const db = await connectDB();
//   try{
//     const [rows] = await db.execute(query);
//     return rows;
//   } finally {
//     await db.end();
//   }
// }

async function mainQuery(query) {
  const [rows] = await pool.execute(query);
  return rows;
}

exports.getNotificationsTotalCount = async (user_id) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM notifications
    WHERE user_id = ${user_id}
  `;
  return await mainQuery(query);
};

exports.getNotificationPaginate = async (user_id, perPage, offset) => {
  const query = `
    SELECT *
    FROM notifications
    WHERE user_id = ${user_id}
    ORDER BY created_at DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
  return await mainQuery(query);
};

// Delete a single notification by ID
exports.deleteNotification = async (notificationId) => {
  const query = `
    DELETE FROM notifications
    WHERE id = ${notificationId}
  `;
  return await mainQuery(query);
};

// Delete all notifications for a specific user
exports.deleteAllNotificationsForUser = async (userId) => {
  const query = `
    DELETE FROM notifications
    WHERE user_id = ${userId}
  `;
  return await mainQuery(query);
};

// Mark all notifications as read for a user
exports.markAllAsRead = async (userId) => {
  const query = `
    UPDATE notifications
    SET isRead = 1
    WHERE user_id = ${userId} AND isRead = 0
  `;
  return await mainQuery(query);
};

exports.markAsRead = async (notificationId) => {
  const query = `
    UPDATE notifications
    SET isRead = 1
    WHERE id = ${notificationId}
  `;
  return await mainQuery(query);
};

exports.createNotificationsForUsers = async (notifications) => {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    throw new Error("notifications must be a non-empty array");
  }

  const data = notifications[0]; // take first object
  if (!Array.isArray(data.user_id) || data.user_id.length === 0) {
    throw new Error("user_id must be a non-empty array");
  }

  const values = data.user_id
    .map(id => `(${id}, '${data.pole_router_ip}', '${data.pole_code}', '${data.description}', '${data.note}', 0)`)
    .join(", ");

  const query = `
    INSERT INTO notifications (user_id, pole_router_ip, pole_code, description, note, isRead)
    VALUES ${values};
  `;

  return await mainQuery(query);
};



