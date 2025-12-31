const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const cameraExecuteModel = require('../models/CameraExecute');
const Pagination = require('../utils/pagination');
const { syncCameraBySocket} = require('../app');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

// Get all cameras without pagination
router.get('/async-cameras', verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get cameras execute: ",{ admin: req.user,body: req.query });
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 9;
    const offset = (page_id - 1) * perPage;

    const totalCount = await cameraExecuteModel.getCamerasTotalCount();

    const currentPage = page_id;
    const pageUri = '/async-cameras';
    const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage);

    const camerasPaginate = await cameraExecuteModel.getCamerasPaginate(perPage, offset);
    logger.success("get async cameras successfully", {admin: req.user, totalCount: totalCount});
    res.json({
      message: 'Cameras fetched successfully',
      total: totalCount,
      data: camerasPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get cameras execute failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// Sync
router.get('/sync-camera/:id', verifyToken, requirePermission("create_camera"), async (req, res) => {
  try {
    logger.info("Try to sync camera: ",{ admin: req.user,body: req.query });
    const id = req.params.id;
    const camera =await cameraExecuteModel.getCameraById(id);
    const integration_data = {data:camera[0],old_camera_id:camera[0].old_camera_id,type:camera[0].type};
    const result = await syncCameraBySocket(integration_data);
    console.log('==============',result);
    res.json(result);
    logger.success("Sync camera successfully", {admin: req.user, camera: camera});
    res.json({
      message: 'Sync camera successfully',
    });
  } catch (err) {
    logger.error('Error sync camera failed', { admin: req.user, error: err.message });
    res.status(500).json({ message: 'something are wrong! ', error: err.message });
  }
});


// Delete
router.delete('/delete-async-camera/:id', verifyToken, requirePermission("delete_camera"), async (req, res) => {
  try {
    logger.info("delete async camera: ",{ admin: req.user });
    const id = req.params.id;

    const result = await cameraExecuteModel.deleteCamera(id);

    if (!result) return res.status(400).json({ message: 'Async camera not found or already deleted' });

    logger.success("delete async camera successfully", { admin: req.user });
    res.json({
      message: 'Asycn camera deleted successfully',
      data: result
    });

  } catch (err) {
    logger.error('delete async camera failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
