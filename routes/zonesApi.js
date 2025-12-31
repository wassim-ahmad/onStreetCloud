const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const zoneModel = require('../models/Zone');
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

// get zones without paginate
router.get('/zones', verifyToken, requirePermission("view_zone"), async (req, res) => {
  try {
    logger.info("get zones: ",{ admin: req.user });
    // Pagination parameters
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 9;
    const offset = (page_id - 1) * perPage;

    // Get total count of zones
    const totalCount = await zoneModel.getZonesTotalCount();

    // Pagination helper
    const currentPage = page_id;
    const pageUri = '/zones';
    const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage);

    // Fetch paginated zones with location name and poles count
    const zonesPaginate = await zoneModel.getZonesPaginate(perPage, offset);

    logger.success("get zones successfully", {admin: req.user, total: totalCount});
    res.json({
      message: 'Zones fetched successfully',
      total: totalCount,
      data: zonesPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get zones failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get zone by id
router.get('/zone/:zone_id', verifyToken, requirePermission("view_zone"), async (req, res) => {
  try {
    logger.info("get zone by id: ",{ admin: req.user, zone_id: req.params.zone_id });
    const zone_id = req.params.zone_id;
    const zone = await zoneModel.getZoneById(zone_id);

    logger.success("get zone by id successfully", {admin: req.user,zone: zone });
    res.json({
      message: 'Zone fetched successfully',
      data: zone
    });
  } catch (err) {
    logger.error('get zone by id failed', { admin: req.user, zone_id: req.params.zone_id , error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// create new zone
router.post('/create-zone', verifyToken, requirePermission("create_zone"), upload.none(), async (req, res) => {
  try {
    logger.info("create new zone: ",{ admin: req.user, body: req.body });
    const { name, coordinates, location_id, border_color, fill_color } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Zone name is required" });
    }
    if (!location_id) {
      return res.status(400).json({ message: "Location ID is required" });
    }

    const result = await zoneModel.createZone({
      name,
      coordinates: coordinates || null,
      location_id,
      border_color,
      fill_color,
    });

    logger.success("create zone successfully ", {admin: req.user, result:result});
    res.json({
      message: 'Zone created successfully',
      data: result,
    });

  } catch (err) {
    logger.error('create new zone failed:', { admin: req.user, body: req.body, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// update zone
router.put('/update-zone/:id', upload.none(), verifyToken, requirePermission("edit_zone"), async (req, res) => {
  try {
    logger.info("update zone: ",{ admin: req.user, zone_id: req.params.id, body:req.body });
    const id = req.params.id;
    const { name, coordinates, location_id, border_color, fill_color } = req.body;

    const result = await zoneModel.updateZone(id, {
      name,
      coordinates,
      location_id,
      border_color,
      fill_color,
    });

    if (!result) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    logger.success("update zone successfully ", {admin: req.user, result:result});
    res.json({
      message: 'Zone updated successfully',
      data: result
    });

  } catch (err) {
    logger.error('update zone failed:', { admin: req.user, zone_id: req.params.id, body: req.body, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// delete zone
router.delete('/delete-zone/:id', verifyToken, requirePermission("delete_zone"), async (req, res) => {
  try {
    logger.info("delete zone: ",{ admin: req.user, zone_id: req.params.id });
    const id = req.params.id;
    const result = await zoneModel.softDeleteZone(id);

    if (!result) {
      return res.status(400).json({ message: 'Zone not found or already deleted' });
    }

    logger.success("delete zone successfully ", {admin: req.user, zone_id: req.params.id, result:result});
    res.json({
      message: 'Zone deleted successfully',
      data: result
    });

  } catch (err) {
    logger.error('delete zone failed:', { admin: req.user, zone_id: req.params.id, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// restore zone
router.put('/restore-zone/:id', verifyToken, requirePermission("restore_zone"), async (req, res) => {
  try {
    logger.info("restore zone: ",{ admin: req.user, zone_id: req.params.id });
    const id = req.params.id;
    const result = await zoneModel.restoreZone(id);

    if (!result) {
      return res.status(400).json({ message: 'Zone not found or not deleted' });
    }

    logger.success("restore zone successfully ", {admin: req.user, result:result});
    res.json({
      message: 'Zone restored successfully',
      data: result
    });

  } catch (err) {
    logger.error('restore zone failed:', { admin: req.user, zone_id: req.params.id, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.get('/zones-location/:location_id', verifyToken, requirePermission("view_zone"), async (req, res) => {
  try {
    logger.info("get location's zones: ",{ admin: req.user, location_id: req.params.location_id });
    const location_id = parseInt(req.params.location_id);
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 9;
    const offset = (page_id - 1) * perPage;

    const totalCountQuery = await zoneModel.getZonesCountByLocation(location_id);

    const currentPage = page_id;
    const pageUri = `/zones-location/${location_id}`;
    const Paginate = new Pagination(totalCountQuery, currentPage, pageUri, perPage);

    const zonesByLocation = await zoneModel.getZonesByLocation(location_id, perPage, offset);

    logger.success("get location's zones successfully ", {admin: req.user, location_id: req.params.location_id, total: totalCountQuery});
    res.json({
      message: 'Zones for location fetched successfully',
      total: totalCountQuery,
      data: zonesByLocation,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error("get location's zones failed:", { admin: req.user, location_id: req.params.location_id, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

module.exports = router;