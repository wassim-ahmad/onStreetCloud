const express = require('express');
const net = require('net');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const settingsModel = require('../models/Setting');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

router.get(
  '/settings/all',
  verifyToken,
  requirePermission("view_setting"),
  async (req, res) => {
    try {
      const name = String(req.params.name);
      logger.info("get all settings :", { admin: req.user, name });

      const rows = await settingsModel.getAllSetting();

      if (!rows.length) {
        return res.status(404).json({ message: 'Settings not found' });
      }
      
      rows.forEach(setting => {
        const value = JSON.parse(setting.value)
        setting.value = value;

        console.log(setting);
        console.log(setting.name, value);
      });

      logger.success("Settings fetched successfully", { admin: req.user });
      res.json({
        message: 'Settings fetched successfully',
        settings: rows,
      });
    } catch (err) {
      logger.error('get all settings failed', { admin: req.user, error: err.message });
      res.status(500).json({ message: 'Database error' });
    }
  }
);

router.get(
  '/settings/:name',
  verifyToken,
  requirePermission("view_setting"),
  async (req, res) => {
    try {
      const name = req.params.name;
      logger.info("get setting by name:", { admin: req.user, name });

      const rows = await settingsModel.getSetting(name);
      console.log(rows);

      if (!rows.length) {
        return res.status(404).json({ message: 'Settings not found' });
      }

      const settings = rows[0];
      const ssettings = JSON.parse(settings.value);
      logger.success("Settings fetched successfully", { admin: req.user });

      res.json(ssettings);
    } catch (err) {
      logger.error('get setting by name failed', { admin: req.user, error: err.message });
      res.status(500).json({ message: 'Database error' });
    }
  }
);

router.put(
  '/settings/ticket-allowed-ips',
  verifyToken,
  requirePermission("edit_setting"),
  upload.none(),
  async (req, res) => {
    try {
      const ips = req.body.ips; // expecting an array of IPs
      if (!Array.isArray(ips)) {
        return res.status(400).json({ message: 'ips must be an array' });
      }

      await settingsModel.updateIPs(ips);

      logger.success("setting updated successfully", { admin: req.user });
      res.json({ message: 'Ticket IPs updated successfully', ips });
    } catch (err) {
      logger.error('update ticket IPs failed', { admin: req.user, error: err.message });
      res.status(500).json({ message: 'Database error' });
    }
  }
);

router.put(
  '/settings/camera-issue-time',
  verifyToken,
  requirePermission("edit_setting"),
  upload.none(),
  async (req, res) => {
    try {
      const resValue = req.body.time
      const time = [resValue];
      if (!Array.isArray(time)) {
        return res.status(400).json({ message: 'time must be an array' });
      }

      await settingsModel.updateCameraIssueTime(time);
      logger.success("Settings updated successfully", { admin: req.user });
      res.json({ message: 'time updated successfully', time });
    } catch (err) {
      logger.error('update time failed', { admin: req.user, error: err.message });
      res.status(500).json({ message: 'Database error' });
    }
  }
);


module.exports = router;

