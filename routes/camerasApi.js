const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const cameraModel = require('../models/Camera'); // camera model
const Pagination = require('../utils/pagination');
const { getCamerasWithStatus , excecuteCameraBySocket , getAllCamerasWithStatus} = require('../app');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");
const { allOnlineCameras , getOnlinePoleCameras } = require("../utils/cameras");
const settingsModel = require('../models/Setting');
const issueModel = require('../models/Issue');


// Get all cameras without pagination
router.get('/cameras', verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get cameras: ",{ admin: req.user,body: req.query });
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 9;
    const offset = (page_id - 1) * perPage;

    const totalCount = await cameraModel.getCamerasTotalCount();

    const currentPage = page_id;
    const pageUri = '/cameras';
    const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage);

    const camerasPaginate = await cameraModel.getCamerasPaginate(perPage, offset);
    logger.success("get cameras successfully", {admin: req.user, totalCount: totalCount});
    res.json({
      message: 'Cameras fetched successfully',
      total: totalCount,
      data: camerasPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// Get camera by id
router.get('/camera/:camera_id', verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get camera by id: ",{ admin: req.user, body: req.params });
    const camera_id = req.params.camera_id;
    const camera = await cameraModel.getCameraById(camera_id);
    
    logger.success("get camera by id successfully", { admin: req.user, camera: camera });
    res.json({
      message: 'Camera fetched successfully',
      data: camera
    });
  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// create new camera
router.post('/create-camera', verifyToken, requirePermission("create_camera"), upload.none(), async (req, res) => {
  try {
    logger.info("create camera: ",{ admin: req.user, body: req.body });
    const { pole_id, camera_ip, access_point_id, number_of_parking,zone_name} = req.body;

    // Validate required fields
    if (!pole_id) {
      return res.status(400).json({ message: "Pole ID is required" });
    }
    if (!camera_ip) {
      return res.status(400).json({ message: "Camera IP is required" });
    }
    if (!zone_name) {
      return res.status(400).json({ message: "Zone name is required" });
    }
    const result = await cameraModel.createCamera({
      pole_id: Number(pole_id),
      camera_ip: camera_ip || null,
      access_point_id: access_point_id || null,
      number_of_parking: number_of_parking !== undefined ? Number(number_of_parking) : null,
      zone_name: zone_name || null,
    });

    const integration_data = {data:req.body, type:'create'};
    await excecuteCameraBySocket(integration_data);

    logger.success("get cameras successfully", { admin: req.user, result: result });
    res.json({
      message: 'Camera created successfully',
      data: result,
    });

  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});


// update camera
router.put('/update-camera/:id', upload.none(), verifyToken, requirePermission("edit_camera"), async (req, res) => {
  try {
    logger.info("update camera: ",{ admin: req.user, body: req.body });
    const id = req.params.id;
    const { pole_id, camera_ip, access_point_id, number_of_parking,zone_name } = req.body;
    const old_camera = await cameraModel.getCameraById(id);
    const result = await cameraModel.updateCamera(id, {
      pole_id,
      camera_ip,
      access_point_id,
      number_of_parking,
      zone_name
    });

    if (!result) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    const integration_data = {data:req.body,old_camera_id:old_camera[0].camera_ip,type:'edit'};
    await excecuteCameraBySocket(integration_data);

    logger.success("update cameras successfully", { admin: req.user, result: result});
    res.json({
      message: 'Camera updated successfully',
      data: result
    });

  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});



// Soft delete camera
router.delete('/delete-camera/:id', verifyToken, requirePermission("delete_camera"), async (req, res) => {
  try {
    logger.info("delete camera: ",{ admin: req.user, camera_id: req.params.id });
    const id = req.params.id;

    const old_camera = await cameraModel.getCameraById(id);
    const data = {pole_code: old_camera[0].pole_code,camera_ip: old_camera[0].camera_ip,number_of_parking:old_camera[0].number_of_parking,pole_id:old_camera[0].pole_id};
    const integration_data = {data,old_camera_id:old_camera[0].camera_ip,type:'delete'};
    await excecuteCameraBySocket(integration_data);

    const result = await cameraModel.softDeleteCamera(id);

    if (!result) return res.status(400).json({ message: 'Camera not found or already deleted' });

    logger.success("delete camera successfully", { admin: req.user, old_camera: old_camera });
    res.json({
      message: 'Camera deleted successfully',
      data: result
    });

  } catch (err) {
    logger.error('delete camera failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// Restore camera
router.put('/restore-camera/:id', verifyToken, requirePermission("restore_camera"), async (req, res) => {
  try {
    logger.info("restore camera: ",{ admin: req.user, camera_id: req.params.id });
    const id = req.params.id;

    const old_camera = await cameraModel.getDeletedCameraById(id);
    const data = {pole_code: old_camera[0].pole_code,camera_ip: old_camera[0].camera_ip,number_of_parking:old_camera[0].number_of_parking,pole_id:old_camera[0].pole_id};
    const integration_data = {data,old_camera_id:old_camera[0].camera_ip,type:'restore'};
    await excecuteCameraBySocket(integration_data);

    const result = await cameraModel.restoreCamera(id);

    if (!result) return res.status(400).json({ message: 'Camera not found or not deleted' });
    
    logger.success("restore camera successfully", { admin: req.user, old_camera: old_camera });
    res.json({
      message: 'Camera restored successfully',
      data: result
    });

  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// get cameras by pole id
router.get('/cameras-pole/:pole_id', verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get cameras by pole: ",{ admin: req.user, pole_id: req.params.pole_id });
    const pole_id = parseInt(req.params.pole_id);
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 9;
    const offset = (page_id - 1) * perPage;

    // Get total cameras count for this pole
    const totalCountQuery = await cameraModel.getCamerasCountByPole(pole_id);

    const currentPage = page_id;
    const pageUri = `/cameras-pole/${pole_id}`;
    const Paginate = new Pagination(totalCountQuery, currentPage, pageUri, perPage);

    // Fetch paginated cameras for this pole
    const camerasByPole = await cameraModel.getCamerasByPole(pole_id, perPage, offset);

    logger.success("get pole's cameras successfully", { admin: req.user, total: totalCountQuery });
    res.json({
      message: 'Cameras for pole fetched successfully',
      total: totalCountQuery,
      data: camerasByPole,
      links: Paginate.links()
    });

  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// Get cameras by zone with pagination
router.get('/cameras-zone/:zone_id', verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get cameras by zone: ",{ admin: req.user, body: req.query });
    const zone_id = parseInt(req.params.zone_id);
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 9;
    const offset = (page_id - 1) * perPage;

    const totalCountQuery = await cameraModel.getCamerasCountByZone(zone_id);

    const currentPage = page_id;
    const pageUri = `/cameras-zone/${zone_id}`;
    const Paginate = new Pagination(totalCountQuery, currentPage, pageUri, perPage);

    const camerasByZone = await cameraModel.getCamerasByZone(zone_id, perPage, offset);

    logger.success("get zone's cameras successfully", { admin: req.user, total: totalCountQuery });
    res.json({
      message: 'Cameras for zone fetched successfully',
      total: totalCountQuery,
      data: camerasByZone,
      links: Paginate.links()
    });

  } catch (err) {
    logger.error("get zone's cameras failed", { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

router.get("/cameras_with_status/:pole_code", verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get cameras status: ",{ admin: req.user, pole_code: req.params.pole_code });
    const pole_code = req.params.pole_code;
    const camerasCount = await cameraModel.getCamerasCountByPoleCode(pole_code);
    const onlineCamerasCount = await getOnlinePoleCameras(pole_code).length;
    console.log('=================== ',await getOnlinePoleCameras(pole_code),pole_code,req.query.page);
    const offlineCamerasCount = parseInt(camerasCount) - parseInt(onlineCamerasCount);
    const cameras = await getCamerasWithStatus(pole_code);

    // pagiantion on array not from the model
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedItems = cameras.slice(startIndex, endIndex);

    const totalPages = Math.ceil(camerasCount / limit);
console.log('=====' , paginatedItems);

    logger.success("get cameras status successfully", { admin: req.user, pole_code: pole_code });
    res.json({
      message: 'All Cameras by pole_code with status',
      total: camerasCount,
      online: onlineCamerasCount,

      offline: offlineCamerasCount,
      data: paginatedItems,
      links: {
        page,
        limit,
        camerasCount,
        totalPages,
      }
    });
  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).send("Error fetching cameras");
  }
});

router.get("/cameras_all_with_status", verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get all cameras status: ",{ admin: req.user });
    const camerasCount = await cameraModel.getCamerasTotalCount();
    const onlineCamerasCount = await allOnlineCameras().length;
    const offlineCamerasCount = parseInt(camerasCount) - parseInt(onlineCamerasCount);
    const cameras = await getAllCamerasWithStatus();

    // pagiantion on array not from the model
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedItems = cameras.slice(startIndex, endIndex);

    const totalPages = Math.ceil(camerasCount / limit);

    logger.success("get all cameras status successfully", { admin: req.user });
    res.json({
      message: 'All Cameras with status',
      total: camerasCount,
      online: onlineCamerasCount,

      offline: offlineCamerasCount,
      data: paginatedItems,
      links: {
        page,
        limit,
        camerasCount,
        totalPages,
      }
    });
  } catch (err) {
    logger.error('get all cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).send("Error fetching poles");
  }
});

// last report
router.get('/camera-last-report/:zone_name', verifyToken, requirePermission("last_report"), async (req, res) => {
  try {
    logger.info("camera last report by zone_name: ",{ admin: req.user, body: req.params });
    const zone_name = req.params.zone_name;
    const old_record = await cameraModel.getCameraByZoneName(zone_name);
    if(!old_record[0]){
      return res.status(400).json({ message: 'Camera not found!' });
    }
    const camera_issue_time = await settingsModel.getSetting('camera_issue_time');

    if(!camera_issue_time[0]){
      return res.status(400).json({ message: 'No time setting from camera issue!' });
    }

    const dbValue = camera_issue_time[0].value;
    const [timeStr] = JSON.parse(dbValue);
    const [daysPart, hmPart] = timeStr.split(" ");
    const [hoursPart, minutesPart] = hmPart.split(":");

    const days = Number(daysPart);
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);


    const LIMIT_MS =
      (days * 24 * 60 * 60 * 1000) +
      (hours * 60 * 60 * 1000) +
      (minutes * 60 * 1000);

    const lastReport = new Date(old_record[0].last_report).getTime();
    if (Date.now() - lastReport >= LIMIT_MS) {
      const diffMs = new Date(Date.now()) - new Date(old_record[0].last_report);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const duration = `${hours}h ${minutes}m`.toString();

      const camera_issue = issueModel.createIssue({
        camera_id:old_record[0].id,
        pole_id:old_record[0].pole_id,
        last_report:new Date(old_record[0].last_report).toISOString().slice(0, 19).replace("T", " "),
        next_report:new Date(Date.now()).toISOString().slice(0, 19).replace("T", " "),
        duration:duration
      });
      if(camera_issue.insertId == 0){
        logger.error('camera issue create faild!', { admin: req.user, zone_name: zone_name });
        res.status(400).json({ error: true });
      }
    }
    const camera = await cameraModel.addLastReport(zone_name);

    if(camera.affectedRows == 0){
      logger.error('camera not found', { admin: req.user, zone_name: zone_name });
      res.json({
        message: 'camera not found!',
        data: camera
      });
    }
    logger.success("camera add last report successfully", { admin: req.user, camera: camera });
    res.json({
      message: 'last report add successfully',
      data: camera
    });
  } catch (err) {
    logger.error('camera add last report failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});


module.exports = router;
