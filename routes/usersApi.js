const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const userModel = require('../models/user');
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

// get users paginate
router.get('/users', verifyToken, requirePermission("view_user"), async (req, res) => {
  try {
    logger.info("get users: ",{ admin: req.user });
    // Pagination parameters
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 2;
    const offset = (page_id - 1) * perPage;

    // Get total count of users
    const totalCount = await userModel.getUsersTotalCount();

    // Pagination helper
    const currentPage = page_id;
    const pageUri = '/users';
    const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage);

    // Fetch paginated users
    const usersPaginate = await userModel.getUsersPaginate(perPage, offset);


    logger.success("get users successfully", {admin: req.user, total: totalCount});
    res.json({
      message: 'Users fetched successfully',
      total: totalCount,
      data: usersPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get users failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get user by id
router.get('/user/:user_id', verifyToken,  requirePermission("view_user"), async (req, res) => {
  try {
    logger.info("get user by id: ",{ admin: req.user, user_id: req.params.user_id });
    const user_id = req.params.user_id;
    const user = await userModel.getUserById(user_id);

    if (!user || user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    logger.success("get user by id successfully", {admin: req.user, user: user });
    res.json({
      message: 'User fetched successfully',
      data: user[0] // return single user object
    });
  } catch (err) {
    logger.error('get user by id failed', { admin: req.user, user_id: req.params.user_id , error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// create new user
router.post('/create-user', verifyToken,  requirePermission("create_user"), upload.none(), async (req, res) => {
  try {
    logger.info("create new user: ",{ admin: req.user, body: req.body });
    const { username, password, designation } = req.body;

    // Validate required fields
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }
    if (!password) {
        return res.status(400).json({ message: "Password is required" });
    }
    if (!designation) {
      return res.status(400).json({ message: "Designation is required" });
    }

    // Hash password before saving (optional, recommended)
    // const hashedPassword = await bcrypt.hash(password, 10);

    const result = await userModel.createUser({
      username,
      password, // use hashedPassword in real app
      designation: designation || 'User'
    });

    logger.success("create user successfully ", {admin: req.user, result:result});
    res.json({
      message: 'User created successfully',
      data: { id: result.insertId, username, designation: designation || 'user' }
    });

  } catch (err) {
    logger.error('create new user failed:', { admin: req.user, body: req.body, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.put('/update-user/:id', upload.none(), verifyToken,  requirePermission("edit_user"), async (req, res) => {
  try {
    logger.info("update user: ",{ admin: req.user, user_id: req.params.id, body:req.body });
    const id = req.params.id;
    const { username, password, designation } = req.body;

    const result = await userModel.updateUser(id, {
      username,
      password,
      designation
    });

    if (!result) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    logger.success("update user successfully ", {admin: req.user, result:result});
    res.json({
      message: 'User updated successfully',
      data: result
    });

  } catch (err) {
    logger.error('update user failed:', { admin: req.user, user_id: req.params.id, body: req.body, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.delete('/delete-user/:id', verifyToken,  requirePermission("delete_user"), async (req, res) => {
  try {
    logger.info("delete user: ",{ admin: req.user, user_id: req.params.id });
    const id = req.params.id;
    const result = await userModel.softDeleteUser(id);

    if (!result) {
      return res.status(400).json({ message: 'User not found or already deleted' });
    }

    logger.success("delete user successfully ", {admin: req.user, user_id: req.params.id, result:result});
    res.json({
      message: 'User deleted successfully',
      data: result
    });

  } catch (err) {
    logger.error('delete user failed:', { admin: req.user, user_id: req.params.id, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.put('/restore-user/:id', verifyToken, requirePermission("delete_user"), async (req, res) => {
  try {
    logger.info("restore user: ",{ admin: req.user, user_id: req.params.id });
    const id = req.params.id;
    const result = await userModel.restoreUser(id);

    if (!result) {
      return res.status(400).json({ message: 'User not found or not deleted' });
    }

    logger.success("restore user successfully ", {admin: req.user, result:result});
    res.json({
      message: 'User restored successfully',
      data: result
    });

  } catch (err) {
    logger.error('restore user failed:', { admin: req.user, user_id: req.params.id, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;