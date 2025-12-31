const permissionsHelper = require('../helper/permission');
const logger = require('../utils/logger');

function requirePermission(permission_key) {
  return async (req, res, next) => {
    try {
      logger.info(`tried to access ${permission_key}`,{ admin: req.user });
      const user_id = req.user.id;

      if (!user_id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!(await permissionsHelper.userHasPermission(user_id, permission_key))) {
        console.log(`User ${user_id} tried to access ${permission_key}`);
        return res.status(403).json({ message: "Access Denied" });
      }
      logger.success(`tried to access ${permission_key} successfully`, {admin: req.user});
      next();
    } catch (err) {
      logger.error(`tried to access ${permission_key} failed`, { admin: req.user, error: err.message });
      console.error('Permission check failed:', err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
}

module.exports = {
  requirePermission
};



// app.post('/camera/create', requirePermission('add_camera'), (req, res) => {
//   // Your create camera logic
//   res.json({ success: true });
// });

// app.get('/dashboard', requirePermission('view_dashboard'), (req, res) => {
//   res.json({ message: "Welcome to dashboard" });
// });
