const express = require('express');
const net = require('net');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const settingsModel = require('../models/Setting');
const submittedTicketsModel = require('../models/Submittedticket');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");
const moment = require('moment');


const path = require('path');
const fs = require('fs-extra');
const ExcelJS = require('exceljs');
const archiver = require('archiver');

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
        const value = setting.value
        // const value = JSON.parse(setting.value)
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

      if (!rows.length) {
        return res.status(404).json({ message: 'Settings not found' });
      }

      const settings = rows[0];
      const ssettings = settings.value;
      // const ssettings = JSON.parse(settings.value);
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

router.post(
  '/archive-tickets/:location_id',
  verifyToken,
  requirePermission('restore_location'),
  upload.none(),
  async (req, res) => {
    let tempDir = null;

    try {
      const location_id = Number(req.params.location_id);
      const { start, end } = req.body;

      if (!start || !end) {
        return res.status(400).send('start and end required');
      }

      // 1️⃣ Get tickets
      const tickets = await submittedTicketsModel.getTicketsForArchiveByLocation({
        location_id,
        start,
        end
      });

      if (!tickets.length) {
        return res.status(404).send('No tickets found');
      }

      // 2️⃣ Create temp folder
      tempDir = path.join(__dirname, `../temp_archive_${Date.now()}`);
      const imagesDir = path.join(tempDir, 'images');
      await fs.ensureDir(imagesDir);

      // 3️⃣ Copy images
      for (const t of tickets) {
        if (t.entry_image && fs.existsSync(t.entry_image)) {
          await fs.copy(
            t.entry_image,
            path.join(imagesDir, path.basename(t.entry_image))
          );
        }
        if (t.crop_image && fs.existsSync(t.crop_image)) {
          await fs.copy(
            t.crop_image,
            path.join(imagesDir, path.basename(t.crop_image))
          );
        }
        if (t.exit_image && fs.existsSync(t.exit_image)) {
          await fs.copy(
            t.exit_image,
            path.join(imagesDir, path.basename(t.exit_image))
          );
        }
      }

      // 4️⃣ Create Excel
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Tickets');

      sheet.columns = Object.keys(tickets[0]).map(key => ({
        header: key.toUpperCase(),
        key,
        width: 25
      }));

      tickets.forEach(t => {
        const row = { ...t };

        if (t.entry_image) {
          const name = path.basename(t.entry_image);
          row.entry_image = {
            text: name,
            hyperlink: `./images/${name}`
          };
        }

        if (t.crop_image) {
          const name = path.basename(t.crop_image);
          row.crop_image = {
            text: name,
            hyperlink: `./images/${name}`
          };
        }

        if (t.exit_image) {
          const name = path.basename(t.exit_image);
          row.exit_image = {
            text: name,
            hyperlink: `./images/${name}`
          };
        }

        sheet.addRow(row);
      });

      await workbook.xlsx.writeFile(
        path.join(tempDir, 'tickets.xlsx')
      );

      // 5️⃣ Stream ZIP to browser
      const zipName = `tickets_archive_${location_id}_${Date.now()}.zip`;

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${zipName}"`
      );
      res.setHeader('Content-Type', 'application/zip');

      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', err => {
        console.error('Archive error:', err);
        res.status(500).end();
      });

      archive.pipe(res);
      archive.directory(tempDir, false);
      archive.finalize();

      // ✅ DELETE ONLY AFTER ZIP IS FULLY SENT
      res.on('finish', async () => {
        try {
          console.log('ZIP sent successfully. Deleting tickets...');

          await submittedTicketsModel.deleteTicketRange({
            location_id,
            start,
            end
          });

          await fs.remove(tempDir);

          console.log('Tickets and images deleted safely.');
        } catch (err) {
          console.error('Cleanup failed:', err);
        }
      });

    } catch (err) {
      console.error(err);

      // cleanup temp folder if something failed early
      if (tempDir) {
        try { await fs.remove(tempDir); } catch (_) {}
      }

      res.status(500).send('Archive failed');
    }
  }
);

router.get(
  '/tickets/duplicates/groups',
  verifyToken,
  // requirePermission('view_duplicate_tickets'),
  async (req, res) => {
    try {
      logger.info('get duplicated ticket groups.', { admin: req.user });

      const groups = await settingsModel.getDuplicateTicketGroupsAllSources();

      logger.success('get duplicated ticket groups successfully.', {
        admin: req.user
      });

      res.json({
        message: 'Duplicate ticket groups fetched successfully',
        data: groups
      });
    } catch (err) {
      logger.error('get duplicated ticket groups failed.', {
        admin: req.user,
        error: err.message
      });

      console.error(err);
      res.status(500).json({
        message: 'Database error',
        error: err
      });
    }
  }
);

router.get(
  '/tickets/duplicates/details',
  verifyToken,
  // requirePermission('view_duplicate_tickets'),
  async (req, res) => {
    try {
      const { plate_number, location_id, first_entry_time } = req.query;

      if (!plate_number || !location_id || !first_entry_time) {
        return res.status(400).json({
          message:
            'plate_number, location_id, and first_entry_time are required'
        });
      }

     const firstEntryUtc = new Date(first_entry_time);

// Convert UTC → Dubai local time (+4 hours)
// const dbTime = new Date(firstEntryUtc.getTime() + 4*60*60*1000)
const dbTime = new Date(firstEntryUtc.getTime())
  .toISOString()
  .slice(0,19)
  .replace('T',' ');  // "2025-12-10 13:48:05"

console.log('DB normalized time:', dbTime);



      logger.info('get duplicated ticket details.', {
        admin: req.user,
        plate_number,
        location_id,
        dbTime
      });

      const tickets =
        await settingsModel.getDuplicateTicketsGroupDetailsAllSources(
          plate_number,
          location_id,
          dbTime
        );

      res.json({
        message: 'Duplicate tickets fetched successfully',
        data: tickets
      });
    } catch (err) {
      logger.error('get duplicated ticket details failed.', {
        admin: req.user,
        error: err.message
      });

      res.status(500).json({
        message: 'Database error',
        error: err
      });
    }
  }
);

// delete tickets by type and id
router.delete(
  '/delete-tickets/:type/:id',
  verifyToken,
  requirePermission('delete_ticket'),
  async (req, res) => {
    try {
      const { id, type } = req.params;
      const ticketId = parseInt(id, 10);

      if (!ticketId) {
        return res.status(400).json({
          message: 'Ticket ID must be a valid number'
        });
      }

      if (!['ocr', 'omc', 'hold'].includes(type)) {
        return res.status(400).json({
          message: 'Invalid ticket type'
        });
      }

      logger.info('delete ticket by type', {
        admin: req.user,
        ticket_id: ticketId,
        type
      });

      // 1️⃣ Get ticket (to delete files if exist)
      const tickets = await settingsModel.getTicketByIdAndType(ticketId, type);
      const ticket = tickets[0];

      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // 2️⃣ Delete images if they exist (OCR mostly)
      if (ticket.entry_image) await deleteFile(ticket.entry_image);
      if (ticket.crop_image) await deleteFile(ticket.crop_image);
      if (ticket.exit_image) await deleteFile(ticket.exit_image);

      // 3️⃣ Delete ticket from correct table
      const result = await settingsModel.deleteTicketByType(ticketId, type);

      logger.success('delete ticket successfully', {
        admin: req.user,
        ticket_id: ticketId,
        type
      });

      res.json({
        message: 'Ticket deleted successfully',
        id: ticketId,
        type,
        affectedRows: result.affectedRows
      });

    } catch (err) {
      logger.error('delete ticket failed', {
        admin: req.user,
        error: err.message
      });

      res.status(500).json({
        message: 'Database error',
        error: err.message
      });
    }
  }
);







module.exports = router;

