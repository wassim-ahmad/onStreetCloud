const express = require('express');
const path = require('path');
const router = express.Router();
const fs = require('fs');
const { verifyToken } = require('../config/auth');
const submittedTicketsModel = require('../models/Submittedticket');
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

// get all submitted tickets without paginate
router.get('/submitted-tickets-all', verifyToken, requirePermission("view_submitted"), async (req, res) => {
  try {
    logger.info("get all submitted tickets without paginate.", { admin: req.user });

    const tickets = await submittedTicketsModel.getTickets();

    logger.success("get all submitted tickets without paginate successfully.", { admin: req.user });
    res.json({
      message: 'Tickets fetched successfully',
      data: tickets,
    });
  } catch (err) {
    logger.error('get all submitted tickets without paginate failed.', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get submitted tickets paginate with total count
router.get('/submitted-tickets', verifyToken, requirePermission("view_submitted"), async (req, res) => {
  try {
    logger.info("get submitted tickets:", { admin: req.user });

    const page_id = parseInt(req.query.page) || 1;
    const currentPage = page_id;
    const pageUri = '/submitted-tickets';
    const perPage = parseInt(req.query.perPage) || 9;

    const totalCount = await submittedTicketsModel.getTicketsTotalCount();
    const offset = (page_id - 1) * perPage;

    const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage);
    const ticketsPaginate = await submittedTicketsModel.getTicketsPaginate(perPage, offset);

    logger.success("get submitted tickets successfully", { admin: req.user, total: totalCount });
    res.json({
      message: 'Tickets fetched successfully',
      total: totalCount,
      data: ticketsPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get submitted tickets paginate failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get submitted ticket by id
router.get('/submitted-ticket/:ticket_id', verifyToken, requirePermission("view_submitted"), async (req, res) => {
  try {
    const ticket_id = req.params.ticket_id;
    logger.info("get submitted ticket by id:", { admin: req.user, ticket_id });

    const ticket = await submittedTicketsModel.getTicketById(ticket_id);

    logger.success("get submitted ticket by id successfully", { admin: req.user, ticket });
    res.json({
      message: 'Ticket fetched successfully',
      data: ticket
    });
  } catch (err) {
    logger.error('get submitted ticket by id failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// delete submitted ticket
router.delete('/delete-submitted-ticket/:id', verifyToken, requirePermission("delete_submitted"), async (req, res) => {
  try {
    logger.info("delete submitted ticket:", { admin: req.user, ticket_id: req.params.id });
    const ticket_id = parseInt(req.params.id, 10); // convert to number
    if (!ticket_id) {
      return res.status(400).json({ message: 'Ticket ID is required and must be a number' });
    }

    const result = await submittedTicketsModel.deleteTicket(ticket_id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    logger.success("delete submitted ticket successfully", { admin: req.user, result });
    res.json({ message: 'Ticket deleted successfully', id: ticket_id, data: result });

  } catch (err) {
    logger.error('delete submitted ticket failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// get submitted tickets by camera_id with pagination
router.get(
  '/submitted-tickets/by-camera/:camera_id',
  verifyToken,
  requirePermission("view_submitted"),
  async (req, res) => {
    try {
      logger.info("get submitted tickets by camera:", {
        admin: req.user,
        camera_id: req.params.camera_id
      });

      const camera_id = Number(req.params.camera_id);
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 9;
      const offset = (page - 1) * perPage;
      const pageUri = `/submitted-tickets/by-camera/${camera_id}`;

      if (!camera_id) {
        return res.status(400).json({ message: "camera_id is required" });
      }

      // total count BY CAMERA
      const totalCountResult = await submittedTicketsModel.getTicketsTotalCountByCamera(camera_id);
      const totalCount = totalCountResult[0]?.total || 0;

      // paginated tickets BY CAMERA
      const ticketsPaginate = await submittedTicketsModel.getTicketsPaginateByCamera(
        camera_id,
        perPage,
        offset
      );

      const Paginate = new Pagination(totalCount, page, pageUri, perPage);

      logger.success("get submitted tickets by camera successfully", {
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
      logger.error('get submitted tickets by camera paginate failed', {
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

// get submitted tickets by location_id with pagination
router.get(
  '/submitted-tickets/by-location/:location_id',
  verifyToken,
  requirePermission("view_submitted"),
  async (req, res) => {
    try {
      const location_id = Number(req.params.location_id);
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 9;
      const offset = (page - 1) * perPage;
      const pageUri = `/submitted-tickets/by-location/${location_id}`;

      logger.info("get submitted tickets by location:", {
        admin: req.user,
        location_id
      });

      if (!location_id) {
        return res.status(400).json({ message: "location_id is required" });
      }

      // total count by location
      const totalCountResult =
        await submittedTicketsModel.getTicketsTotalCountByLocation(location_id);
      const totalCount = totalCountResult[0]?.total || 0;

      // paginated tickets by location
      const tickets =
        await submittedTicketsModel.getTicketsPaginateByLocation(
          location_id,
          perPage,
          offset
        );

      const Paginate = new Pagination(totalCount, page, pageUri, perPage);

      logger.success("get submitted tickets by location successfully", {
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
      logger.error('get submitted tickets by location paginate failed', {
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









module.exports = router;