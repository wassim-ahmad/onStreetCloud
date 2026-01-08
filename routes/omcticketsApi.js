const express = require('express');
const path = require('path');
const router = express.Router();
const multer = require("multer");
// const upload = multer();
const fs = require('fs');
const { verifyToken } = require('../config/auth');
const omcticketModel = require('../models/Omcticket');
const cameraModel = require('../models/Camera'); // camera model
const cancelledTicketsModel = require('../models/Cancelledticket');
const submittedTicketsModel = require('../models/Submittedticket');
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const axios = require('axios');
const { requirePermission } = require("../middleware/permission_middleware");
var pool = require('../config/dbConnection');

function imageToBase64(path) {
  if (!path) {
    return null;
  }
  return fs.readFileSync(path).toString('base64');
}

const UPLOAD_DIR = path.join(__dirname, '../uploads/omctickets');

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
router.get('/omc-tickets-all', verifyToken, requirePermission("view_omcticket"), async (req, res) => {
  try {
    logger.info("get all omc tickets without paginate.", { admin: req.user });

    const tickets = await omcticketModel.getTickets();

    logger.success("get all omc tickets without paginate successfully.", { admin: req.user });
    res.json({
      message: 'Tickets fetched successfully',
      data: tickets,
    });
  } catch (err) {
    logger.error('get all omc tickets without paginate failed.', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get tickets paginate with total count
router.get('/omc-tickets', verifyToken, requirePermission("view_omcticket"), async (req, res) => {
  try {
    logger.info("get omc tickets:", { admin: req.user });

    const page_id = parseInt(req.query.page) || 1;
    const currentPage = page_id;
    const pageUri = '/omc-tickets';
    const perPage = parseInt(req.query.perPage) || 9;

    const totalCount = await omcticketModel.getTicketsTotalCount();
    const offset = (page_id - 1) * perPage;

    const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage);
    const ticketsPaginate = await omcticketModel.getTicketsPaginate(perPage, offset);

    logger.success("get omc tickets successfully", { admin: req.user, total: totalCount });
    res.json({
      message: 'Tickets fetched successfully',
      total: totalCount,
      data: ticketsPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get omc tickets paginate failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// get ticket by id
router.get('/omc-ticket/:ticket_id', verifyToken, requirePermission("view_omcticket"), async (req, res) => {
  try {
    const ticket_id = req.params.ticket_id;
    logger.info("get omc ticket by id:", { admin: req.user, ticket_id });

    const ticket = await omcticketModel.getTicketById(ticket_id);

    logger.success("get omc ticket by id successfully", { admin: req.user, ticket });
    res.json({
      message: 'Ticket fetched successfully',
      data: ticket
    });
  } catch (err) {
    logger.error('get omc ticket by id failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// create new ticket
router.post('/create-omc-ticket', verifyToken, requirePermission("create_omcticket"), upload.fields([
    { name: 'entry_image', maxCount: 1 },
    { name: 'crop_image', maxCount: 1 },
    { name: 'exit_image', maxCount: 1 }
  ])
  , async (req, res) => {
  try {
    logger.info("create omc ticket:", { admin: req.user, body: req.body });

     const {
      parkonic_token,
      access_point_id,
      number,
      code,
      city,
      status,
      entry_time,
      exit_time,
      spot_number,
      camera_ip,
      zone_name,
      zone_region,
      entry_video_url,
      exit_video_url,
    } = req.body;

    if (!camera_ip || !parkonic_token || !status || !access_point_id) {
      return res.status(400).json({ message: "camera_ip, parkonic_token, status and access_point_id are required" });
    }

    const entry_image = req.files?.entry_image
        ? `uploads/omctickets/${req.files.entry_image[0].filename}`
        : null;

      const crop_image = req.files?.crop_image
        ? `uploads/omctickets/${req.files.crop_image[0].filename}`
        : null;

      const exit_image = req.files?.exit_image
        ? `uploads/omctickets/${req.files.exit_image[0].filename}`
        : null;

    const camera_id = await cameraModel.getCameraByIpAndAccessPointId(access_point_id,camera_ip);
    if (!camera_id[0]) {
      return res.status(400).json({ message: "camera not found" });
    }

    const diffMs = new Date(exit_time) - new Date(entry_time) ;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const parkingDuration = `${hours}h ${minutes}m`.toString();

    const result = await omcticketModel.createTicket({
      parkonic_token,
      access_point_id,
      number: number || null,
      code: code || null,
      city: city || null,
      status,
      entry_time: entry_time || null,
      exit_time: exit_time || null,
      parking_duration: parkingDuration || null,
      spot_number: spot_number || null,
      camera_ip,
      camera_id:camera_id[0].id,
      zone_name: zone_name || null,
      zone_region: zone_region || null,
      entry_video_url: entry_video_url || null,
      exit_video_url: exit_video_url || null,
      entry_image: entry_image,
      crop_image: crop_image,
      exit_image: exit_image,
    });

    logger.success("create omc ticket successfully", { admin: req.user, result });
    res.json({
      message: 'Ticket created successfully',
      data: result,
    });

  } catch (err) {
    logger.error('create omc ticket failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// update ticket
router.put('/update-omc-ticket/:id', upload.none(), verifyToken, requirePermission("edit_omcticket"), async (req, res) => {
  try {
    logger.info("update omc ticket:", { admin: req.user, body: req.body });
    const id = req.params.id;

    const {
      number,
      code,
      city,
      confidence,
      exit_time,
      entry_time,
    } = req.body;

    const diffMs = new Date(exit_time) - new Date(entry_time) ;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const parkingDuration = `${hours}h ${minutes}m`.toString();

    const result = await omcticketModel.updateTicket(id, {
      number: number || null,
      code: code || null,
      city: city || null,
      confidence: confidence || null,
      exit_time: exit_time || null,
      parking_duration: parkingDuration || null,
    });

    if (!result) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    logger.success("update omc ticket successfully", { admin: req.user, result });
    res.json({
      message: 'Ticket updated successfully',
      data: result
    });

  } catch (err) {
    logger.error('update omc ticket failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// delete ticket
router.delete('/delete-omc-ticket/:id', verifyToken, requirePermission("delete_omcticket"), async (req, res) => {
  try {
    logger.info("delete omc ticket:", { admin: req.user, ticket_id: req.params.id });
    const ticket_id = parseInt(req.params.id, 10); // convert to number
    if (!ticket_id) {
      return res.status(400).json({ message: 'Ticket ID is required and must be a number' });
    }

    const result = await omcticketModel.deleteTicket(ticket_id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    logger.success("delete omc ticket successfully", { admin: req.user, result });
    res.json({ message: 'Ticket deleted successfully', id: ticket_id, data: result });

  } catch (err) {
    logger.error('delete omc ticket failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// get tickets by camera_id with pagination
router.get(
  '/omc-tickets/by-camera/:camera_id',
  verifyToken,
  requirePermission("view_omcticket"),
  async (req, res) => {
    try {
      logger.info("get omc tickets by camera:", {
        admin: req.user,
        camera_id: req.params.camera_id
      });

      const camera_id = Number(req.params.camera_id);
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 9;
      const offset = (page - 1) * perPage;
      const pageUri = `/omc-tickets/by-camera/${camera_id}`;

      if (!camera_id) {
        return res.status(400).json({ message: "camera_id is required" });
      }

      // total count BY CAMERA
      const totalCountResult = await omcticketModel.getTicketsTotalCountByCamera(camera_id);
      const totalCount = totalCountResult[0]?.total || 0;

      // paginated tickets BY CAMERA
      const ticketsPaginate = await omcticketModel.getTicketsPaginateByCamera(
        camera_id,
        perPage,
        offset
      );

      const Paginate = new Pagination(totalCount, page, pageUri, perPage);

      logger.success("get omc tickets by camera successfully", {
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
      logger.error('get omc tickets by camera paginate failed', {
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
  '/omc-tickets/by-location/:location_id',
  verifyToken,
  requirePermission("view_omcticket"),
  async (req, res) => {
    try {
      const location_id = Number(req.params.location_id);
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 9;
      const offset = (page - 1) * perPage;
      const pageUri = `/omc-tickets/by-location/${location_id}`;

      logger.info("get omc tickets by location:", {
        admin: req.user,
        location_id
      });

      if (!location_id) {
        return res.status(400).json({ message: "location_id is required" });
      }

      // total count by location
      const totalCountResult =
        await omcticketModel.getTicketsTotalCountByLocation(location_id);
      const totalCount = totalCountResult[0]?.total || 0;

      // paginated tickets by location
      const tickets =
        await omcticketModel.getTicketsPaginateByLocation(
          location_id,
          perPage,
          offset
        );

      const Paginate = new Pagination(totalCount, page, pageUri, perPage);

      logger.success("get omc tickets by location successfully", {
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
      logger.error('get omc tickets by location paginate failed', {
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
router.post('/cancel-omc-ticket/:id', verifyToken, requirePermission("cancel_ticket"), async (req, res) => {
  try {
    logger.info("cancel omc ticket:", { admin: req.user, ticket_id: req.params.id });
    const ticket_id = parseInt(req.params.id, 10); // convert to number
    
    if (!ticket_id) {
      return res.status(400).json({ message: 'Ticket ID is required and must be a number' });
    }

    const old_ticket = await omcticketModel.getTicketById(ticket_id);
    if (!old_ticket[0]) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    delete old_ticket[0].id;
    old_ticket[0].type = 'OMC';

    const cancel_result = await cancelledTicketsModel.createTicket(old_ticket[0]);

    if (cancel_result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not cancelled !!!' });
    }

    const result = await omcticketModel.deleteTicket(ticket_id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not found!' });
    }

    logger.success("OMC Ticket cancelled successfully", { admin: req.user, result });
    res.json({ message: 'Ticket cancelled successfully', id: ticket_id, data: result });

  } catch (err) {
    logger.error('OMC Ticket cancelled failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});


// submit ticket
router.post('/submit-omc-ticket/:id', verifyToken, requirePermission("submit_ticket"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    logger.info("submit omc ticket:", { admin: req.user, ticket_id: req.params.id });
    const ticket_id = parseInt(req.params.id, 10); // convert to number
    
    if (!ticket_id) {
      return res.status(400).json({ message: 'Ticket ID is required and must be a number' });
    }

    const old_ticket = await omcticketModel.getTicketById(ticket_id);
    if (!old_ticket[0]) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const entry = old_ticket[0].entry_image || "";
    const exit = old_ticket[0].exit_image || "";
    const entry_base64 = imageToBase64(entry);
    const exit_base64 = imageToBase64(exit);

    const images = [entry_base64, exit_base64];

    // park in
    const payload = {
      token: old_ticket[0].parkonic_token,
      parkin_time: old_ticket[0].entry_time,
      plate_code: old_ticket[0].plate_code,
      plate_number: old_ticket[0].plate_number,
      emirates: old_ticket[0].plate_city,
      conf: old_ticket[0].confidence,
      spot_number: old_ticket[0].spot_number,
      pole_id: old_ticket[0].access_point_id,// here is access pont id
      images: images
    };

    try {
      logger.info("try park-in OMC ticket:", { admin: req.user, ticket_id: req.params.id });
      const response = await axios.post(
        'https://dev.parkonic.com/api/street-parking/v2/park-in',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      old_ticket[0].parkonic_trip_id = response.data.trip_id;
      const updated_ticket = omcticketModel.addTripId(ticket_id,response.data.trip_id);
      console.log('API response:', response.data);
      logger.success("OMC ticket parked-in successfully", { admin: req.user,trip_id: response.data.trip_id });
    } catch (error) {
      logger.error('OMC Ticket park-in failed', { admin: req.user, error: error.response?.data || error.message });
      console.error(
        'API error:',
        error.response?.data || error.message
      );
      res.json({err:error.response?.data || error.message});
    }

    // park out 
    const payload_out = {
      token: old_ticket[0].parkonic_token,
      parkout_time: old_ticket[0].exit_time,
      plate_code: old_ticket[0].plate_code,
      plate_number: old_ticket[0].plate_number,
      emirates: old_ticket[0].plate_city,
      spot_number: old_ticket[0].spot_number,
      pole_id: old_ticket[0].access_point_id,// here is access pont id
      images: images
    };
    try {
      logger.info("try park-out OMC ticket:", { admin: req.user, ticket_id: req.params.id });
      const response_out = await axios.post(
      'https://dev.parkonic.com/api/street-parking/v2/park-out',
      payload_out,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    // res.json({
    //   status: response_out.status,
    //   data: response_out.data
    // });
    logger.success("OMC Ticket parked-out successfully", { admin: req.user, response:response_out.data });
    } catch (error) {
      logger.error('OMC Ticket park-out failed', { admin: req.user, error: error.response?.data || error.message });
      console.error(
        'API out error:',
        error.response?.data || error.message
      );
      res.json({err:error.response?.data || error.message});
    }


    delete old_ticket[0].id;
    const cancel_result = await submittedTicketsModel.createTicket(old_ticket[0]);

    if (cancel_result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not submitted !!!' });
    }

    const result = await omcticketModel.deleteTicket(ticket_id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not found!' });
    }

    logger.success("OMC Ticket submitted successfully", { admin: req.user, result });
    await conn.commit();
    res.json({ message: 'Ticket submitted successfully', id: ticket_id, data: result });
  } catch (err) {
    await conn.rollback();
    logger.error('OMC Ticket submitted failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  } finally {
    conn.release();
  }
});




module.exports = router;