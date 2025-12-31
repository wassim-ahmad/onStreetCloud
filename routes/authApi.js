const express = require('express');
const router = express.Router();
const userModel = require('../models/user');
const bcrypt = require('bcrypt');
const multer = require("multer");
const upload = multer();
const { generateToken, verifyToken } = require('../config/auth');
const moment = require('moment');
const logger = require('../utils/logger');

// POST /api/login
router.post('/login', upload.none(), async (req, res) => {
  logger.info("Login tryieng: ",{ body: req.body });
  const { username, password } = req.body;
  try {
    const user = await userModel.findByUsername(username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    logger.success("Login successfully", {user:user});
    res.json({ message: 'Login successful', token });
  } catch (err) {
    logger.error('Login failed', { error: err.message });
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /api/register
// router.post('/register', upload.none(), async (req, res) => {
//   console.log(req.body);
//   try {
//     const id = await userModel.create(req.body);
//     res.json({ message: 'User registered successfully', id });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to register user', details: err.message });
//   }
// });

// GET /api/profile (Protected route)
// router.get('/profile', verifyToken, async (req, res) => {
//   req.user.iat = moment.unix(req.user.iat).format("YYYY-MM-DD HH:mm:ss");
//   req.user.exp = req.user.exp ? moment.unix(req.user.exp).format("YYYY-MM-DD HH:mm:ss") : 'infinity';
//   res.json({ message: 'Welcome!', user: req.user });
// });

router.get('/profile', verifyToken, async (req, res) => {
  try {
    logger.info("user profile: ",{ admin: req.user });
    const userId = req.user.id;

    req.user.iat = moment.unix(req.user.iat).format("YYYY-MM-DD HH:mm:ss");
    req.user.exp = req.user.exp ? moment.unix(req.user.exp).format("YYYY-MM-DD HH:mm:ss") : 'infinity';

    const permissions = await userModel.getUserPermissionsWithStatus(userId);
    
    logger.success("get user profile successfully", {admin: req.user});
    res.json({
      message: 'Welcome!',
      user: {
        ...req.user,
        permissions
      }
    });

  } catch (err) {
    logger.error('user profile failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;