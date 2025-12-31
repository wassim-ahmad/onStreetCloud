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
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");
const { allOnlineCameras } = require("../utils/cameras");

router.get('/statistics', verifyToken, async (req, res) => {
//   try {
    logger.info("view statistics: ",{ admin: req.user });

    const totalCamerasCount = await cameraModel.getCamerasTotalCount();
    const onlineCamerasCount = await allOnlineCameras().length;
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