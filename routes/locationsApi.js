const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const locationModel = require('../models/Location');
const ticketModel = require('../models/Ticket');
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

// get all locations without paginate
router.get('/locations-all', verifyToken, requirePermission("view_location"), async (req, res) => {
  try {
    logger.info("get all locations without paginate.",{ admin: req.user });
    const locations = await locationModel.getLocations();
    
    logger.success("get all locations without paginate successfully.",{admin: req.user});
    res.json({
      message: 'Locations fetched successfully',
      data: locations,
    });
  } catch (err) {
    logger.error('get all locations without paginate failed.', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get locations paginate with total and zones count
router.get('/locations', verifyToken, requirePermission("view_location"), async (req, res) => {
  try {
    logger.info("get locations: ",{ admin: req.user });
    const page_id = parseInt(req.query.page) || 1;
    const currentPage = page_id;
    const pageUri = '/locations';
    const perPage = parseInt(req.query.perPage) || 9;
    const totalCount = await locationModel.getLocationsTotalCount();
    const offset = (page_id - 1) * perPage;
    const Paginate = new Pagination(totalCount,currentPage,pageUri,perPage);
    const locationsPaginate = await locationModel.getLocationsPaginate(perPage,offset);

    logger.success("get locations successfully", { admin: req.user, total: totalCount });
    res.json({
      message: 'Locations fetched successfully',
      total: totalCount,
      data: locationsPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get locations paginate failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get location by id
router.get('/location/:location_id', verifyToken, requirePermission("view_location"), async (req, res) => {
  try {
    logger.info("get location by id: ",{ admin: req.user, location_id: req.params.location_id });
    const location_id = req.params.location_id;
    const location = await locationModel.getLocationById(location_id);

    logger.success("get location by id successfully", { admin: req.user, location: location});
    res.json({
      message: 'location fetched successfully',
      data: location
    });
  } catch (err) {
    logger.error('get location by id failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// create new location 
router.post('/create-location', verifyToken, requirePermission("create_location"), upload.none(), async (req, res) => {
  try {
    logger.info("create location: ",{ admin: req.user, body: req.body });
    const { name, description, boundary, camera_user, camera_pass, direct_transfer, border_color, fill_color } = req.body;
    const boundaryObj = JSON.parse(boundary);
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const result = await locationModel.createLocation({
      name,
      description: description || null,
      boundary: boundary || null,
      camera_user: camera_user || null,
      camera_pass: camera_pass || null,
      direct_transfer: direct_transfer || 0,
      border_color: border_color || 'red',
      fill_color: fill_color || 'red',
    });

    logger.success("create location successfully", { admin: req.user, result: result });
    res.json({
      message: 'Location created successfully',
      data: result,
    });

  } catch (err) {
    logger.error('create location failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// update location 
router.put('/update-location/:id', upload.none(), verifyToken, requirePermission("edit_location"), async (req, res) => {
  try {
    logger.info("update location: ",{ admin: req.user, body: req.body });
    const id = req.params.id;
    const { name, description, boundary, camera_user, camera_pass, direct_transfer, border_color, fill_color } = req.body;

    const result = await locationModel.updateLocation(id, {
      name,
      description,
      boundary,
      camera_user,
      camera_pass,
      direct_transfer,
      border_color,
      fill_color,
    });

    if (!result) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    logger.success("update location successfully", { admin: req.user, result: result });
    res.json({
      message: 'Location updated successfully',
      data: result
    });

  } catch (err) {
    logger.error('update location failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// delete location
router.delete('/delete-location/:id', verifyToken, requirePermission("delete_location"), async (req, res) => {
  try {
    logger.info("delete location: ",{ admin: req.user, location_id: req.params.id });
    const location_id = parseInt(req.params.id, 10); // convert to number
    if (!location_id) {
      return res.status(400).json({ message: 'Location ID is required and must be a number' });
    }

    const result = await locationModel.softDeleteLocation(location_id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Location not found or already deleted' });
    }

    logger.success("delete location successfully", { admin: req.user, result: result });
    res.json({ message: 'Location soft-deleted successfully', id: location_id,data:result });
  } catch (err) {
    logger.error('delete location failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// restore location
router.put('/restore-location/:id', verifyToken, requirePermission("restore_location"), async (req, res) => {
  try {
    logger.info("restore location: ",{ admin: req.user, location_id: req.params.id });
    const locationId = parseInt(req.params.id, 10);
    if (!locationId) {
      return res.status(400).json({ message: 'Location ID is required and must be a number' });
    }

    const result = await locationModel.restoreLocation(locationId);

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ message: 'Location not found or not deleted' });
    }

    logger.success("restore location successfully", { admin: req.user, result: result });
    res.json({ message: 'Location restored successfully', id: locationId });
  } catch (err) {
    logger.error('restore location failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// get tickets count by range date and location id
router.post('/get-total-ocr-tickets/:id', verifyToken, requirePermission("delete_ticket"), upload.none(), async (req, res) => {
  try {
    logger.info("delete ocr tickets range by location id: ",{ admin: req.user, location_id: req.params.id });
    const locationId = parseInt(req.params.id, 10);
    if (!locationId) {
      return res.status(400).json({ message: 'Location ID is required and must be a number' });
    }

    const { start , end } = req.body;

    if (!start || !end) {
      throw new Error('Start and end dates are required');
    }

    // Try to parse dates
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Strict date regex: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(start)) {
      throw new Error('Start date must be a valid date in YYYY-MM-DD format');
    }
    if (!dateRegex.test(end)) {
      throw new Error('End date must be a valid date in YYYY-MM-DD format');
    }

    // Convert to MySQL datetime
    const formattedStart = `${start} 00:00:00`;
    const formattedEnd = `${end} 23:59:59`;

    const result = await ticketModel.countTicketsByLocationAndRangeDate({
      location_id: 1,
      start: formattedStart,
      end: formattedEnd
    });

    if (!result) {
      return res.status(404).json({ message: 'ocr tickets not found' });
    }

    logger.success("OCR tickets by location and date fetched successfully", { admin: req.user, result: result });
    res.json({ message: 'OCR tickets by location and date fetched successfully', tickets: result[0].total });
  } catch (err) {
    logger.error('OCR tickets by location and date fetched failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// delete ocr tickets range
router.post('/delete-ocr-tickets/:id', verifyToken, requirePermission("delete_ticket"), upload.none(), async (req, res) => {
  try {
    logger.info("delete ocr tickets range by location id: ",{ admin: req.user, location_id: req.params.id });
    const locationId = parseInt(req.params.id, 10);
    if (!locationId) {
      return res.status(400).json({ message: 'Location ID is required and must be a number' });
    }

    const { start , end } = req.body;

    if (!start || !end) {
      throw new Error('Start and end dates are required');
    }

    // Try to parse dates
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Strict date regex: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(start)) {
      throw new Error('Start date must be a valid date in YYYY-MM-DD format');
    }
    if (!dateRegex.test(end)) {
      throw new Error('End date must be a valid date in YYYY-MM-DD format');
    }

    // Convert to MySQL datetime
    const formattedStart = `${start} 00:00:00`;
    const formattedEnd = `${end} 23:59:59`;

    const result = await ticketModel.deleteTicketRange({
      location_id: 1,
      start: formattedStart,
      end: formattedEnd
    });

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ message: 'No tickets to delete !' });
    }

    logger.success("OCR tickets by location and date fetched successfully", { admin: req.user, result: result });
    res.json({ message: 'OCR tickets by location and date fetched successfully', tickets: result });
  } catch (err) {
    logger.error('OCR tickets by location and date fetched failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;