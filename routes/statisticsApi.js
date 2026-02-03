const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const { getDevicesWithStatus } = require('../app');
const locationModel = require('../models/Location');
const zoneModel = require('../models/Zone');
const poleModel = require('../models/Pole');
const cameraModel = require('../models/Camera');
const ticketModel = require('../models/Ticket');
const omcticketModel = require('../models/Omcticket');
const cancelledTicketsModel = require('../models/Cancelledticket');
const submittedTicketsModel = require('../models/Submittedticket');
const holdticketModel = require('../models/Holdingticket');
const settingsModel = require('../models/Setting');
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");
const { allOnlineCameras } = require("../utils/cameras");
const allowedTicketIPs = require("../middleware/allowTicketIps");
const { omcticket_table } = require('../config/db_config');

router.get('/statistics', verifyToken, allowedTicketIPs, async (req, res) => {
//   try {
    logger.info("view statistics: ",{ admin: req.user });

    const totalCamerasCount = await cameraModel.getCamerasTotalCount();
    const onlineCamerasCount = await allOnlineCameras().length;
    const OcrTicketsCount = await ticketModel.getTicketsTotalCount();
    const OmcTicketsCount = await omcticketModel.getTicketsTotalCount();
    const HoldTicketsCount = await holdticketModel.getTicketsTotalCount();
    const cancelledTicketsCount = await cancelledTicketsModel.getTicketsTotalCount();
    const submittedTicketsCount = await submittedTicketsModel.getTicketsTotalCount();
    const duplicated = await settingsModel.getDuplicateTicketGroupsAllSources();

    const totalLocationsCount = await locationModel.getLocationsTotalCount();
    const totalZonesCount = await zoneModel.getZonesTotalCount();
    const totalPolesCount = await poleModel.getPolesTotalCount();

    logger.success("view statistics successfully", {admin: req.user});
    res.json({
        // locations:{
        //     totalCount: totalLocationsCount,
        //     // onlineCount: onlineCAmerasCount
        // },
        // zones:{
        //     totalCount: totalZonesCount,
        //     // onlineCount: onlineCAmerasCount
        // },
        // poles:{
        //     totalCount: totalPolesCount,
        //     // onlineCount: onlineCAmerasCount
        // },
        cameras:{
            totalCount: totalCamerasCount,
            onlineCount: onlineCamerasCount
        },
        tickets:{
            ocr: OcrTicketsCount,
            omc: OmcTicketsCount,
            Hold: HoldTicketsCount,
            cancelled: cancelledTicketsCount, 
            submitted: submittedTicketsCount,
            duplicated: duplicated.length,
        }
    }
);
//   } catch (err) {
//     logger.error('view statistics failed', { admin: req.user, error: err.message });
//     console.error(err);
//     res.status(500).json({ message: 'Database error', error: err });
//   }
});





module.exports = router;