const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const cameraIssueModels = require('../models/Issue');
const cameraModel = require('../models/Camera'); // camera model
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

// get all camera issues without paginate
router.get('/issues-all', verifyToken, requirePermission("view_issue"), async (req, res) => {
  try {
    logger.info("get all camera issues without paginate.", { admin: req.user });

    const issues = await cameraIssueModels.getIssues();

    logger.success("get all cameras issues without paginate successfully.", { admin: req.user });
    res.json({
      message: 'Issues fetched successfully',
      data: issues,
    });
  } catch (err) {
    logger.error('get all camera issues without paginate failed.', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get camera issues paginate with total count
router.get('/issues', verifyToken, requirePermission("view_issue"), async (req, res) => {
  try {
    logger.info("get issues:", { admin: req.user });

    const page_id = parseInt(req.query.page) || 1;
    const currentPage = page_id;
    const pageUri = '/issues';
    const perPage = parseInt(req.query.perPage) || 9;

    const totalCount = await cameraIssueModels.getIssueTotalCount();
    const offset = (page_id - 1) * perPage;

    const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage);
    const issuesPaginate = await cameraIssueModels.getIssuesPaginate(perPage, offset);

    logger.success("get camera issues successfully", { admin: req.user, total: totalCount });
    res.json({
      message: 'Camera issues fetched successfully',
      total: totalCount,
      data: issuesPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get camera issues paginate failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get camera issue by id
router.get(
  '/issue/:issue_id',
  verifyToken,
  requirePermission("view_ticket"),
  async (req, res) => {
    try {
      const issue_id = Number(req.params.issue_id);
      logger.info("get camera issue by id:", { admin: req.user, issue_id });

      const rows = await cameraIssueModels.getIssueById(issue_id);

      if (!rows.length) {
        return res.status(404).json({ message: 'camera issue not found' });
      }

      const issue = rows[0];

      res.json({
        message: 'Ticket fetched successfully',
          issue,
      });
    } catch (err) {
      logger.error('get ticket by id failed', { admin: req.user, error: err.message });
      res.status(500).json({ message: 'Database error' });
    }
  }
);


// create new camera issue
router.post('/create-issue', verifyToken, requirePermission("create_issue"), upload.none(), async (req, res) => {
  try {
    logger.info("create camera issue:", { admin: req.user, body: req.body });

    const {
      camera_id,
      last_report,
      next_report,
    } = req.body;

    if (!camera_id || !last_report || !next_report) {
      return res.status(400).json({ message: "camera_ip, parkonic_token and status are required" });
    }

    const camera_by_id = await cameraModel.getCameraById(camera_id);
    if (!camera_by_id[0]) {
      return res.status(400).json({ message: "camera not found" });
    }

    const diffMs = new Date(next_report) - new Date(last_report) ;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const duration = `${hours}h ${minutes}m`.toString();

    const result = await cameraIssueModels.createIssue({
      camera_id,
      pole_id: camera_by_id[0].pole_id,
      last_report,
      next_report,
      duration: duration || null,
    });

    logger.success("create camera issue successfully", { admin: req.user, result:result });
    res.json({
      message: 'Camera issue created successfully',
      data: result,
    });

  } catch (err) {
    logger.error('create camera issue failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// resolve
router.put('/resolve-issue/:id', upload.none(), verifyToken, requirePermission("resolve_issue"), async (req, res) => {
  try {
    logger.info("resoleve camera issue:", { admin: req.user, body: req.body, id:req.params.id });
    const id = req.params.id;

    const reason = req.body.reason || null;
    const resolved_by = req.user.username;

    const result = await cameraIssueModels.resolveIssue(id, {
      reason: reason,
      resolved_by: resolved_by,
    });

    if (!result) {
      return res.status(400).json({ message: 'unresolved!' });
    }
    if(result.error){
      return res.status(402).json({message: result.message})
    }
    if(!result.affectedRows){
      return res.status(400).json({ message: 'No issue found!' });
    }

    logger.success("resolve issue successfully", { admin: req.user, result });
    res.json({
      message: 'issue resolved successfully',
      data: result
    });

  } catch (err) {
    logger.error('issue resolve failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});


// get camera issues by camera_id with pagination
router.get(
  '/issues/by-camera/:camera_id',
  verifyToken,
  requirePermission("view_issue"),
  async (req, res) => {
    try {
      logger.info("get camera issues by camera:", {
        admin: req.user,
        camera_id: req.params.camera_id
      });

      const camera_id = Number(req.params.camera_id);
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 9;
      const offset = (page - 1) * perPage;
      const pageUri = `/issues/by-camera/${camera_id}`;

      if (!camera_id) {
        return res.status(400).json({ message: "camera_id is required" });
      }

      // total count BY CAMERA
      const totalCountResult = await cameraIssueModels.getIssuesTotalCountByCamera(camera_id);
      const totalCount = totalCountResult[0]?.total || 0;

      // paginated camera issues BY CAMERA
      const issuesPaginate = await cameraIssueModels.getIssuesPaginateByCamera(
        camera_id,
        perPage,
        offset
      );

      const Paginate = new Pagination(totalCount, page, pageUri, perPage);

      logger.success("get camera issues by camera successfully", {
        admin: req.user,
        camera_id,
        total: totalCount
      });

      res.json({
        message: 'Camera issues fetched successfully',
        total: totalCount,
        data: issuesPaginate,
        links: Paginate.links()
      });

    } catch (err) {
      logger.error('get camera issues by camera paginate failed', {
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

// get camera issues by location_id with pagination
router.get(
  '/issues/by-location/:location_id',
  verifyToken,
  requirePermission("view_issue"),
  async (req, res) => {
    try {
      const location_id = Number(req.params.location_id);
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 9;
      const offset = (page - 1) * perPage;
      const pageUri = `/issues/by-location/${location_id}`;

      logger.info("get camera issues by location:", {
        admin: req.user,
        location_id
      });

      if (!location_id) {
        return res.status(400).json({ message: "location_id is required" });
      }

      // total count by location
      const totalCountResult =
        await cameraIssueModels.getIssuesTotalCountByLocation(location_id);
      const totalCount = totalCountResult[0]?.total || 0;

      // paginated tickets by location
      const issues =
        await cameraIssueModels.getIssuesPaginateByLocation(
          location_id,
          perPage,
          offset
        );

      const Paginate = new Pagination(totalCount, page, pageUri, perPage);

      logger.success("get camera issues by location successfully", {
        admin: req.user,
        location_id,
        total: totalCount
      });

      res.json({
        message: 'Camera issues fetched successfully',
        total: totalCount,
        data: issues,
        links: Paginate.links()
      });

    } catch (err) {
      logger.error('get camera issues by location paginate failed', {
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

// get unresolved camera issues with pagination
router.get(
  '/issues/unresolved',
  verifyToken,
  requirePermission("view_issue"),
  async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 9;
      const offset = (page - 1) * perPage;
      const pageUri = `/issues/unresolved`;

      logger.info("get unresolved camera issues:", {
        admin: req.user,
      });

      // total count
      const totalCountResult =
        await cameraIssueModels.getUnresolvedIssuesTotalCount();
      const totalCount = totalCountResult[0]?.total || 0;

      // paginated camera issues
      const issues =
        await cameraIssueModels.getUnresolvedIssuesPaginate(
          perPage,
          offset
        );

      const Paginate = new Pagination(totalCount, page, pageUri, perPage);

      logger.success("get unresolved camera issues successfully", {
        admin: req.user,
        total: totalCount
      });

      res.json({
        message: 'Unresolved camera issues fetched successfully',
        total: totalCount,
        data: issues,
        links: Paginate.links()
      });

    } catch (err) {
      logger.error('get unresolved camera issues paginate failed', {
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