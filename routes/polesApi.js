const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const { getDevicesWithStatus } = require('../app');
const poleModel = require('../models/Pole');
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");
const { getOnlineDevices } = require("../utils/devices");

router.get('/poles', verifyToken, requirePermission("view_pole"), async (req, res) => {
  try {
    logger.info("get poles: ",{ admin: req.user });
    // Pagination parameters
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 9;
    const offset = (page_id - 1) * perPage;

    // Get total count of poles
    const totalCount = await poleModel.getPolesTotalCount();

    // Pagination helper
    const currentPage = page_id;
    const pageUri = '/poles';
    const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage);

    // Fetch paginated poles with zone name and camera count
    const polesPaginate = await poleModel.getPolesPaginate(perPage, offset);

    logger.success("get poles successfully", {admin: req.user, total: totalCount});
    res.json({
      message: 'Poles fetched successfully',
      total: totalCount,
      data: polesPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get poles failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get pole by id
router.get('/pole/:pole_id', verifyToken, requirePermission("view_pole"), async (req, res) => {
  try {
    logger.info("get pole by id: ",{ admin: req.user, pole_id: req.params.pole_id });
    const pole_id = req.params.pole_id;
    const pole = await poleModel.getPoleById(pole_id);

    logger.success("get pole by id successfully", {admin: req.user,pole: pole });
    res.json({
      message: 'Pole fetched successfully',
      data: pole
    });
  } catch (err) {
    logger.error('get pole by id failed', { admin: req.user, pole_id: req.params.pole_id , error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// create new pole
router.post('/create-pole', verifyToken, requirePermission("create_pole"), upload.none(), async (req, res) => {
  try {
    logger.info("create new pole: ",{ admin: req.user, body: req.body });
    const { zone_id, code, router_ip, router_vpn_ip, lat, lng } = req.body;

    if (!zone_id) {
      return res.status(400).json({ message: "Zone ID is required" });
    }
    if (!code) {
      return res.status(400).json({ message: "Pole code is required" });
    }

    const result = await poleModel.createPole({
      zone_id,
      code,
      router_ip: router_ip || null,
      router_vpn_ip: router_vpn_ip || null,
      lat: lat || null,
      lng: lng || null,
    });

    logger.success("create pole successfully ", {admin: req.user, result:result});
    res.json({
      message: 'Pole created successfully',
      data: result,
    });

  } catch (err) {
    logger.error('create new pole failed:', { admin: req.user, body: req.body, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// update pole
router.put('/update-pole/:id', upload.none(), verifyToken, requirePermission("edit_pole"), async (req, res) => {
  try {
    logger.info("update pole: ",{ admin: req.user, pole_id: req.params.id, body:req.body });
    const id = req.params.id;
    const { zone_id, code, router_ip, router_vpn_ip, lat, lng } = req.body;

    const result = await poleModel.updatePole(id, {
      zone_id,
      code,
      router_ip,
      router_vpn_ip,
      lat,
      lng,
    });

    if (!result) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    logger.success("update pole successfully ", {admin: req.user, result:result});
    res.json({
      message: 'Pole updated successfully',
      data: result
    });

  } catch (err) {
    logger.error('update pole failed:', { admin: req.user, pole_id: req.params.id, body: req.body, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// delete pole
router.delete('/delete-pole/:id', verifyToken, requirePermission("delete_pole"), async (req, res) => {
  try {
    logger.info("delete pole: ",{ admin: req.user, pole_id: req.params.id });
    const id = req.params.id;
    const result = await poleModel.softDeletePole(id);

    if (!result) {
      return res.status(400).json({ message: 'Pole not found or already deleted' });
    }

    logger.success("delete pole successfully ", {admin: req.user, pole_id: req.params.id, result:result});
    res.json({
      message: 'Pole deleted successfully',
      data: result
    });
  } catch (err) {
    logger.error('delete pole failed:', { admin: req.user, pole_id: req.params.id, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// restore pole
router.put('/restore-pole/:id', verifyToken, requirePermission("restore_pole"), async (req, res) => {
  try {
    logger.info("restore pole: ",{ admin: req.user, pole_id: req.params.id });
    const id = req.params.id;
    const result = await poleModel.restorePole(id);

    if (!result) {
      return res.status(400).json({ message: 'Pole not found or not deleted' });
    }

    logger.success("restore pole successfully ", {admin: req.user, result:result});
    res.json({
      message: 'Pole restored successfully',
      data: result
    });
  } catch (err) {
    logger.error('restore pole failed:', { admin: req.user, pole_id: req.params.id, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// get poles by zone with pagination
router.get('/poles-zone/:zone_id', verifyToken, requirePermission("view_pole"), async (req, res) => {
  try {
    logger.info("get zone's poles: ",{ admin: req.user, zone_id: req.params.zone_id });
    const zone_id = parseInt(req.params.zone_id);
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 9;
    const offset = (page_id - 1) * perPage;

    // Get total count of poles in this zone
    const totalCountQuery = await poleModel.getPolesCountByZone(zone_id);

    // Pagination helper
    const currentPage = page_id;
    const pageUri = `/poles-zone/${zone_id}`;
    const Paginate = new Pagination(totalCountQuery, currentPage, pageUri, perPage);

    // Fetch paginated poles with camera_count
    const polesByZone = await poleModel.getPolesByZone(zone_id, perPage, offset);

    logger.success("get zone's poles successfully ", {admin: req.user, zone_id: req.params.zone_id, total: totalCountQuery});
    res.json({
      message: 'Poles for zone fetched successfully',
      total: totalCountQuery,
      data: polesByZone,
      links: Paginate.links()
    });

  } catch (err) {
    logger.error("get zone's poles failed:", { admin: req.user, zone_id: req.params.zone_id, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

router.get("/poles_with_status", verifyToken, async (req, res) => {
  try {

    const totalCount = await poleModel.getPolesTotalCount();
    const poles = getDevicesWithStatus();

    const onlinePolesCount = await getOnlineDevices().length;
    const offlinePolesCount = parseInt(totalCount) - parseInt(onlinePolesCount);

  // pagiantion on array not from the model
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedItems = poles.slice(startIndex, endIndex);

    const totalPages = Math.ceil(totalCount / limit);
  
    res.json({
      message: 'Poles fetched successfully',
      total: totalCount,
      online: onlinePolesCount,
      offline: offlinePolesCount,
      data: paginatedItems,
      links: {
        page,
        limit,
        totalCount,
        totalPages,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching poles");
  }
});

module.exports = router;