const express = require('express');
const path = require('path');
const router = express.Router();
const multer = require("multer");
// const upload = multer();
const fs = require('fs');
const { verifyToken } = require('../config/auth');
const ticketModel = require('../models/Ticket');
const cancelledTicketsModel = require('../models/Cancelledticket');

const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

const UPLOAD_DIR = path.join(__dirname, '../uploads/tickets');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// get all tickets without paginate
router.get('/tickets-all', verifyToken, requirePermission("view_ticket"), async (req, res) => {
  try {
    logger.info("get all tickets without paginate.", { admin: req.user });

    const tickets = await ticketModel.getTickets();

    logger.success("get all tickets without paginate successfully.", { admin: req.user });
    res.json({
      message: 'Tickets fetched successfully',
      data: tickets,
    });
  } catch (err) {
    logger.error('get all tickets without paginate failed.', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get tickets paginate with total count
router.get('/tickets', verifyToken, requirePermission("view_ticket"), async (req, res) => {
  try {
    logger.info("get tickets:", { admin: req.user });

    const page_id = parseInt(req.query.page) || 1;
    const currentPage = page_id;
    const pageUri = '/tickets';
    const perPage = parseInt(req.query.perPage) || 9;

    const totalCount = await ticketModel.getTicketsTotalCount();
    const offset = (page_id - 1) * perPage;

    const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage);
    const ticketsPaginate = await ticketModel.getTicketsPaginate(perPage, offset);

    logger.success("get tickets successfully", { admin: req.user, total: totalCount });
    res.json({
      message: 'Tickets fetched successfully',
      total: totalCount,
      data: ticketsPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get tickets paginate failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get ticket by id
router.get('/ticket/:ticket_id', verifyToken, requirePermission("view_ticket"), async (req, res) => {
  try {
    const ticket_id = req.params.ticket_id;
    logger.info("get ticket by id:", { admin: req.user, ticket_id });

    const ticket = await ticketModel.getTicketById(ticket_id);

    logger.success("get ticket by id successfully", { admin: req.user, ticket });
    res.json({
      message: 'Ticket fetched successfully',
      data: ticket
    });
  } catch (err) {
    logger.error('get ticket by id failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// create new ticket
router.post('/create-ticket', verifyToken, requirePermission("create_ticket"), upload.fields([
    { name: 'entry_image', maxCount: 1 },
    { name: 'crop_image', maxCount: 1 },
    { name: 'exit_image', maxCount: 1 }
  ])
  , async (req, res) => {
  try {
    logger.info("create ticket:", { admin: req.user, body: req.body });

    const {
      camera_id,
      spot_number,
      plate_number,
      plate_code,
      plate_city,
      confidence,
      entry_time,
      exit_time,
      parkonic_trip_id,
      entry_image_path,
      exit_clip_path
    } = req.body;

    if (!camera_id || !spot_number || !plate_number || !entry_time) {
      return res.status(400).json({ message: "camera_id, spot_number, plate_number, and entry_time are required" });
    }

    const entry_image = req.files?.entry_image
        ? `uploads/tickets/${req.files.entry_image[0].filename}`
        : null;

      const crop_image = req.files?.crop_image
        ? `uploads/tickets/${req.files.crop_image[0].filename}`
        : null;

      const exit_image = req.files?.exit_image
        ? `uploads/tickets/${req.files.exit_image[0].filename}`
        : null;

    const result = await ticketModel.createTicket({
      camera_id,
      spot_number,
      plate_number,
      plate_code: plate_code || null,
      plate_city: plate_city || null,
      confidence: confidence || null,
      entry_time,
      exit_time: exit_time || null,
      parkonic_trip_id: parkonic_trip_id || null,
      entry_image: entry_image,
      crop_image: crop_image,
      exit_image: exit_image,
      entry_image_path: entry_image_path || null,
      exit_clip_path: exit_clip_path || null,
    });

    logger.success("create ticket successfully", { admin: req.user, result:result });
    res.json({
      message: 'Ticket created successfully',
      data: result,
    });

  } catch (err) {
    logger.error('create ticket failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// update ticket
router.put('/update-ticket/:id', upload.none(), verifyToken, requirePermission("edit_ticket"), async (req, res) => {
  try {
    logger.info("update ticket:", { admin: req.user, body: req.body });
    const id = req.params.id;

    const {
      camera_id,
      spot_number,
      plate_number,
      plate_code,
      plate_city,
      confidence,
      entry_time,
      exit_time,
      parkonic_trip_id,
      entry_image,
      crop_image,
      exit_image,
      entry_image_path,
      exit_clip_path
    } = req.body;

    const result = await ticketModel.updateTicket(id, {
      camera_id,
      spot_number,
      plate_number,
      plate_code,
      plate_city,
      confidence,
      entry_time,
      exit_time,
      parkonic_trip_id,
      entry_image,
      crop_image,
      exit_image,
      entry_image_path,
      exit_clip_path
    });

    if (!result) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    logger.success("update ticket successfully", { admin: req.user, result });
    res.json({
      message: 'Ticket updated successfully',
      data: result
    });

  } catch (err) {
    logger.error('update ticket failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// delete ticket
router.delete('/delete-ticket/:id', verifyToken, requirePermission("delete_ticket"), async (req, res) => {
  try {
    logger.info("delete ticket:", { admin: req.user, ticket_id: req.params.id });
    const ticket_id = parseInt(req.params.id, 10); // convert to number
    if (!ticket_id) {
      return res.status(400).json({ message: 'Ticket ID is required and must be a number' });
    }

    const result = await ticketModel.deleteTicket(ticket_id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    logger.success("delete ticket successfully", { admin: req.user, result });
    res.json({ message: 'Ticket deleted successfully', id: ticket_id, data: result });

  } catch (err) {
    logger.error('delete ticket failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// get tickets by camera_id with pagination
router.get(
  '/tickets/by-camera/:camera_id',
  verifyToken,
  requirePermission("view_ticket"),
  async (req, res) => {
    try {
      logger.info("get tickets by camera:", {
        admin: req.user,
        camera_id: req.params.camera_id
      });

      const camera_id = Number(req.params.camera_id);
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 9;
      const offset = (page - 1) * perPage;
      const pageUri = `/tickets/by-camera/${camera_id}`;

      if (!camera_id) {
        return res.status(400).json({ message: "camera_id is required" });
      }

      // total count BY CAMERA
      const totalCountResult = await ticketModel.getTicketsTotalCountByCamera(camera_id);
      const totalCount = totalCountResult[0]?.total || 0;

      // paginated tickets BY CAMERA
      const ticketsPaginate = await ticketModel.getTicketsPaginateByCamera(
        camera_id,
        perPage,
        offset
      );

      const Paginate = new Pagination(totalCount, page, pageUri, perPage);

      logger.success("get tickets by camera successfully", {
        admin: req.user,
        camera_id,
        total: totalCount
      });

      res.json({
        message: 'Tickets fetched successfully',
        total: totalCount,
        data: ticketsPaginate,
        links: Paginate.links()
      });

    } catch (err) {
      logger.error('get tickets by camera paginate failed', {
        admin: req.user,
        error: err.message
      });

      console.error(err);
      res.status(500).json({
        message: 'Database error',
        error: err.message
      });
    }
  }
);

// get tickets by location_id with pagination
router.get(
  '/tickets/by-location/:location_id',
  verifyToken,
  requirePermission("view_ticket"),
  async (req, res) => {
    try {
      const location_id = Number(req.params.location_id);
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 9;
      const offset = (page - 1) * perPage;
      const pageUri = `/tickets/by-location/${location_id}`;

      logger.info("get tickets by location:", {
        admin: req.user,
        location_id
      });

      if (!location_id) {
        return res.status(400).json({ message: "location_id is required" });
      }

      // total count by location
      const totalCountResult =
        await ticketModel.getTicketsTotalCountByLocation(location_id);
      const totalCount = totalCountResult[0]?.total || 0;

      // paginated tickets by location
      const tickets =
        await ticketModel.getTicketsPaginateByLocation(
          location_id,
          perPage,
          offset
        );

      const Paginate = new Pagination(totalCount, page, pageUri, perPage);

      logger.success("get tickets by location successfully", {
        admin: req.user,
        location_id,
        total: totalCount
      });

      res.json({
        message: 'Tickets fetched successfully',
        total: totalCount,
        data: tickets,
        links: Paginate.links()
      });

    } catch (err) {
      logger.error('get tickets by location paginate failed', {
        admin: req.user,
        error: err.message
      });

      console.error(err);
      res.status(500).json({
        message: 'Database error',
        error: err.message
      });
    }
  }
);

// cancel ticket
router.post('/cancel-ocr-ticket/:id', verifyToken, requirePermission("cancel_ticket"), async (req, res) => {
  try {
    logger.info("cancel ocr ticket:", { admin: req.user, ticket_id: req.params.id });
    const ticket_id = parseInt(req.params.id, 10); // convert to number
    
    if (!ticket_id) {
      return res.status(400).json({ message: 'Ticket ID is required and must be a number' });
    }

    const old_ticket = await ticketModel.getTicketById(ticket_id);
    if (!old_ticket[0]) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    delete old_ticket[0].id;
    old_ticket[0].type = 'OCR';

    const cancel_result = await cancelledTicketsModel.createTicket(old_ticket[0]);

    if (cancel_result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not cancelled !!!' });
    }

    const result = await ticketModel.deleteTicket(ticket_id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not found!' });
    }

    logger.success("OCR Ticket cancelled successfully", { admin: req.user, result });
    res.json({ message: 'Ticket cancelled successfully', id: ticket_id, data: result });

  } catch (err) {
    logger.error('OCR Ticket cancelled failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});











module.exports = router;