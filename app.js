require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require("fs");
const morgan = require("morgan");
const app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
  // morgan.format('myFormat', ':method :url | status :status | :response-time ms');
  // app.use(morgan('dev')); 
  app.use(
    morgan(':method :url :status :res[content-length] - :response-time ms - :remote-addr')
  );

  app.set('trust proxy', true);

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' } // append mode
);

app.use(morgan('combined', { stream: accessLogStream }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const cameraExecuteModel = require('./models/CameraExecute');
const port = process.env.PORT;
const moment = require('moment');
const formatLog = require("./utils/reports");
const {
  deviceOn,
  deviceOff,
  getOnlineDevices,
  getDeviceBySocketId
} = require("./utils/devices");
const {
  cameraOn,
  cameraOff,
  getPoleCameras,
  getOnlinePoleCameras,
  getOfflinePoleCameras,
  printStatus,
  allOnlineCameras
} = require("./utils/cameras")
const notificationModel = require('./models/Notification');
const userModel = require('./models/user');
const poleModel = require('./models/Pole');
const cameraModel = require('./models/Camera');
let fetchPoles = [];
async function fetchAllDevicesFromDB() {
  try {
    fetchPoles = await poleModel.getPoles();
  } catch (err) {
    console.error(err);
    fetchPoles = [];
  }
}
fetchAllDevicesFromDB()

function getDevicesWithStatus() {
  const allDevicesFromDB = fetchPoles;
  const onlineDevices = getOnlineDevices();

  return allDevicesFromDB.map(dev => {
    const isOnline = onlineDevices.some(
      d => d.code === dev.code || d.pole === dev.code
    );
    dev.status = isOnline ? 1 : 0;
    return dev;
  });
}

async function getCamerasWithStatus(pole_code) {
  const allCamerasFromDB = await cameraModel.getCamerasByPoleCode(pole_code);
  const onlineCameras = getOnlinePoleCameras(pole_code);

  return allCamerasFromDB.map(dev => {
    const isOnline = onlineCameras.some(
      d => d.device.camera_ip === dev.camera_ip
    );
    dev.status = isOnline ? 1 : 0;
    return dev;
  });
}

async function getAllCamerasWithStatus() {
  const allCamerasFromDB = await cameraModel.getCameras();
  const onlineCameras = await allOnlineCameras();

  return allCamerasFromDB.map(dev => {
    const isOnline = onlineCameras.some(
      d => d.device.camera_ip === dev.camera_ip
    );
    dev.status = isOnline ? 1 : 0;
    return dev;
  });
}
// async function excecuteCameraBySocket(integration_data) {
//   io.to(integration_data.data.pole_code).emit('execute_camera',integration_data);
// }

async function excecuteCameraBySocket(integration_data) {
  io.emit("showStatisticsCameras", await getStatisticsCameras() );
  io.to(integration_data.data.pole_code)
    .timeout(5000)
    .emit("execute_camera", integration_data, async (err, response) => {
      if(response[0] != true){
        const { pole_id, camera_ip, number_of_parking} = integration_data.data;
        const old_camera_id = integration_data.old_camera_id;
        const type = integration_data.type;
        if(integration_data.type == 'edit'){
          const execute_camera = await cameraExecuteModel.createCamera({
            pole_id:pole_id,
            camera_ip:camera_ip,
            old_camera_id:old_camera_id,
            type:type,
            number_of_parking:number_of_parking,
          });
        }else{
          const execute_camera = await cameraExecuteModel.createCamera({
            pole_id:pole_id,
            camera_ip:camera_ip,
            type:type,
            number_of_parking:number_of_parking,
          });
        }
      }
    });
}

// async function syncCameraBySocket(integration_data) {
//   io.to(integration_data.data.pole_code)
//     .timeout(5000)
//     .emit("execute_camera", integration_data, async (err, response) => {
//       if(response[0] == true){
//         const execute_camera = await cameraExecuteModel.deleteCamera(integration_data.data.id);
//       }else{
//         return false;
//       }
//     });
// }

async function syncCameraBySocket(integration_data) {
  return new Promise((resolve) => {
    io.to(integration_data.data.pole_code)
      .timeout(5000)
      .emit("execute_camera", integration_data, async (err, response) => {

        if (err) {
          console.log("Timeout:", err);
          return resolve(false);
        }

        if (response[0] === true) {
          await cameraExecuteModel.deleteCamera(integration_data.data.id);
          return resolve(true);
        }

        resolve(false);
      });
  });
}

async function alertCameraDisconnected(alert) {
  try {
    const users = await userModel.getActiveUsersWithViewNotificationPermission();
    const user_ids = users.map(u => u.user_id);
    await notificationModel.createNotificationsForUsers([
      {
        user_id: user_ids,
        pole_router_ip: alert.router_ip,
        pole_code: alert.pole_code,
        description: 'camera disconnected',
        note: 'file_server_id: '+alert.file_server_id+' camera ip: '+alert.camera_ip
      }
    ]);
    io.emit('notification', {
      title: 'camera disconnected',
      message: `file_server_id: ${alert.file_server_id}`
    });

  } catch (err) {
    // add log here
    console.error('❌ Error creating notifications:', err);
  } 
}

async function getStatisticsCameras(){
  const totalCamerasCount = await cameraModel.getCamerasTotalCount();
  const onlineCamerasCount = await allOnlineCameras().length;
  return {
    cameras: {
      totalCount: totalCamerasCount,
      onlineCount: onlineCamerasCount
    }
  }
}

module.exports = { getDevicesWithStatus,getCamerasWithStatus, excecuteCameraBySocket, syncCameraBySocket,getAllCamerasWithStatus, fetchAllDevicesFromDB };

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// // socket start code
// // ==========================================================
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  // io.emit("showAllCameras", getAllCamerasWithStatus() );
  console.log("Server B connected:", socket.id);
  socket.emit('returnSocketId',socket.id);

  socket.on("onlineDevice", async (device) => {
    const devices = deviceOn(socket.id, device);
    // console.log(device.router_ip);
    socket.join(device.code);
    // data to send front poles
    const totalCount = await poleModel.getPolesTotalCount();
    const poles = getDevicesWithStatus();
    const onlinePolesCount = await getOnlineDevices().length;
    const offlinePolesCount = parseInt(totalCount) - parseInt(onlinePolesCount);
    // // pagiantion on array not from the model
    // const page = parseInt(req.query.page) || 1;
    // const limit = parseInt(req.query.limit) || 15;

    // const startIndex = (page - 1) * limit;
    // const endIndex = page * limit;
    // const paginatedItems = poles.slice(startIndex, endIndex);

    // const totalPages = Math.ceil(totalCount / limit);
    // const data = {
    //     total: totalCount,
    //     online: onlinePolesCount,
    //     offline: offlinePolesCount,
    //     data: poles,
    // }
    // console.log(data);

    io.emit("sendCloudFront", {
      total: totalCount,
      online: onlinePolesCount,
      offline: offlinePolesCount,
      data: poles,
      // links: {
      //   page,
      //   limit,
      //   totalCount,
      //   totalPages,
      // }
    });
  });

  socket.on("frontJoinToPoleCode", (pole_code) => {
    socket.join(pole_code);
    console.log(`Client ${socket.id} joined room ${pole_code}`);
  });

  socket.on("cameraOnline", async (cam) => {
    // console.log(cam , 'camera online');
    socket.join(cam.pole_code);
    time =  moment().format('h:mm a');
    cameraOn(socket.id, cam , cam.pole_code);

    // data to send front camers by pole
    const camerasCount = await cameraModel.getCamerasCountByPoleCode(cam.pole_code);
    const onlineCamerasCount = await getOnlinePoleCameras(cam.pole_code).length;
    const offlineCamerasCount = parseInt(camerasCount) - parseInt(onlineCamerasCount);
    const cameras = await getCamerasWithStatus(cam.pole_code);

    // // pagiantion on array not from the model
    // const page = parseInt(req.query.page) || 1;
    // const limit = parseInt(req.query.limit) || 15;

    // const startIndex = (page - 1) * limit;
    // const endIndex = page * limit;

    // const paginatedItems = cameras.slice(startIndex, endIndex);

    // const totalPages = Math.ceil(camerasCount / limit);

    io.to(cam.pole_code).emit("showCameras",{
      total: camerasCount,
      online: onlineCamerasCount,
      offline: offlineCamerasCount,
      data: cameras,
      // links: {
      //   page,
      //   limit,
      //   camerasCount,
      //   totalPages,
      // }
    });

    // res.json({
    //   message: 'All Cameras by pole_code with status',
    //   total: camerasCount,
    //   online: onlineCamerasCount,

    //   offline: offlineCamerasCount,
    //   data: paginatedItems,
    //   links: {
    //     page,
    //     limit,
    //     camerasCount,
    //     totalPages,
    //   }
    // });

    // io.to(cam.pole_code).emit("showCameras", getPoleCameras(cam.pole_code) );

    // data to send front all camers
    const all_camerasCount = await cameraModel.getCamerasTotalCount();
    const all_onlineCamerasCount = await allOnlineCameras().length;
    const all_offlineCamerasCount = parseInt(all_camerasCount) - parseInt(all_onlineCamerasCount);
    const all_cameras = await getAllCamerasWithStatus();

    io.emit("showAllCameras", {
      total: all_camerasCount,
      online: all_onlineCamerasCount,
      offline: all_offlineCamerasCount,
      data: all_cameras,
      // links: {
      //   page,
      //   limit,
      //   camerasCount,
      //   totalPages,
      // }
    });
    io.emit("showStatisticsCameras", getStatisticsCameras() );
  });
  
  socket.on("cameraOffline", async (cam) => {
    const onlineCams = getOnlinePoleCameras(cam.pole_code);
    const camExists = onlineCams.some(c =>
      c.device.camera_ip === cam.camera_ip &&
      c.pole_code === cam.pole_code
    );
    if (camExists) {
      alertCameraDisconnected(cam);
    }
    socket.join(cam.pole_code);
    time =  moment().format('h:mm a');   
    
    cameraOff(socket.id,cam,cam.pole_code);

    // data to send front camers by pole
    const camerasCount = await cameraModel.getCamerasCountByPoleCode(cam.pole_code);
    const onlineCamerasCount = await getOnlinePoleCameras(cam.pole_code).length;
    const offlineCamerasCount = parseInt(camerasCount) - parseInt(onlineCamerasCount);
    const cameras = await getCamerasWithStatus(cam.pole_code);

    // // pagiantion on array not from the model
    // const page = parseInt(req.query.page) || 1;
    // const limit = parseInt(req.query.limit) || 15;

    // const startIndex = (page - 1) * limit;
    // const endIndex = page * limit;

    // const paginatedItems = cameras.slice(startIndex, endIndex);

    // const totalPages = Math.ceil(camerasCount / limit);

    io.to(cam.pole_code).emit("showCameras",{
      total: camerasCount,
      online: onlineCamerasCount,
      offline: offlineCamerasCount,
      data: cameras,
      // links: {
      //   page,
      //   limit,
      //   camerasCount,
      //   totalPages,
      // }
    });
    
    // io.to(cam.pole_code).emit("showCameras", getPoleCameras(cam.pole_code) );

    // data to send front all camers
    const all_camerasCount = await cameraModel.getCamerasTotalCount();
    const all_onlineCamerasCount = await allOnlineCameras().length;
    const all_offlineCamerasCount = parseInt(all_camerasCount) - parseInt(all_onlineCamerasCount);
    const all_cameras = await getAllCamerasWithStatus();

    io.emit("showAllCameras", {
      total: all_camerasCount,
      online: all_onlineCamerasCount,
      offline: all_offlineCamerasCount,
      data: all_cameras,
      // links: {
      //   page,
      //   limit,
      //   camerasCount,
      //   totalPages,
      // }
    });
    io.emit("showStatisticsCameras", await getStatisticsCameras() );
  });

  socket.on("disconnect", async () => {
    const alert = await getDeviceBySocketId(socket.id);
    deviceOff(socket.id);

      // data to send front poles
    const totalCount = await poleModel.getPolesTotalCount();
    const poles = getDevicesWithStatus();
    const onlinePolesCount = await getOnlineDevices().length;
    const offlinePolesCount = parseInt(totalCount) - parseInt(onlinePolesCount);
    // // pagiantion on array not from the model
    // const page = parseInt(req.query.page) || 1;
    // const limit = parseInt(req.query.limit) || 15;

    // const startIndex = (page - 1) * limit;
    // const endIndex = page * limit;
    // const paginatedItems = poles.slice(startIndex, endIndex);

    // const totalPages = Math.ceil(totalCount / limit);

    io.emit("sendCloudFront", {
      total: totalCount,
      online: onlinePolesCount,
      offline: offlinePolesCount,
      data: poles,
      // links: {
      //   page,
      //   limit,
      //   totalCount,
      //   totalPages,
      // }
    });

    try {
      const users = await userModel.getActiveUsersWithViewNotificationPermission();
      const user_ids = users.map(u => u.user_id);
      if(alert){
        await notificationModel.createNotificationsForUsers([
          {
            user_id: user_ids,
            pole_router_ip: alert.router_ip,
            pole_code: alert.code,
            description: 'device disconnected',
            note: 'file_server_id: '+alert.file_server_id
          }
        ]);
        // console.log('✅ Notifications saved for alert:', alert);
        io.emit('notification', {
          title: 'device disconnected',
          message: `file_server_id: ${alert.file_server_id}`
        });
      }

    } catch (err) {
      // add log here
      console.error('❌ Error creating notifications:', err);
    }
    // clearInterval(cmdInterval);
  });

  // app.get('/file-server-resources/:pole_code', async (req, res) => {
  //   try {
  //     io.to(req.params.pole_code).emit("getServerResources");
  //     // res.json(res.data);
  //   } catch (error) {
  //     res.status(500).json({ error: 'Cannot fetch Server B resources' });
  //   }
  // });

  socket.on("orderResources", (pole_code , socketId) => {
    console.log(pole_code , socketId);
    io.to(pole_code).emit("getServerResources",socketId);
  });

  // Listen for response from server B
  socket.on("serverResources", (data) => {
    console.log(`Resources from Server B (${socket.id}): (${data.pole_code})`);
    // io.emit("showServerBResources", data);
    io.to(data.socketId).emit("showServerResources",data);
    // io.to(data.pole_code).emit("showServerBResources",data);
  });

  socket.on("restartOrder", (pole_code) => {
    console.log('restart order',pole_code)
    io.to(pole_code).emit("restart");
  });

  socket.on('alert', async (alert) => {
    try {
      // console.log('userModel:', Object.keys(userModel));
      const users = await userModel.getActiveUsersWithViewNotificationPermission();
      const user_ids = users.map(u => u.user_id);
      // console.log(user_ids);
      await notificationModel.createNotificationsForUsers([
        {
          user_id: user_ids,
          pole_router_ip: alert.pole_router_ip,
          pole_code: alert.pole_code,
          description: alert.title,
          note: alert.file_server_id +' >> '+ alert.message
        }
      ]);

      // console.log('✅ Notifications saved for alert:', alert);
      io.emit('notification', alert);

    } catch (err) {
      // add log here
      console.error('❌ Error creating notifications:', err);
    }
  });


  // socket.on('sendToCloudLog',(data) => {
  //   // add log here
  //   console.log('data here ',data)
  // });

});
// // ==========================================================
// // socket end code


// app.get("/showCameras/:pole_code", async (req, res) => {
//   printStatus(req.params.pole_code);
//   try {
//     cams = getPoleCameras(req.params.pole_code)
//     res.json(cams);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching poles");
//   }
// });

// app.get("/showDevices", async (req, res) => {
//   try {
//     devices = getDevicesWithStatus()
//     res.json(devices);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching poles");
//   }
// });

app.get("/index", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// app.get("/create-zone/:location_id", (req, res) => {
//   res.sendFile(__dirname + "/public/createZone.html");
// });
// app.get("/location/:location_id", (req, res) => {
//   res.sendFile(__dirname + "/public/showLocation.html");
// });
// app.get("/create_location", (req, res) => {
//   res.sendFile(__dirname + "/public/createLocation.html");
// });

app.get("/show/:pole_code", (req, res) => {
  res.sendFile(__dirname + "/public/show.html");
});

app.get("/show-all", (req, res) => {
  res.sendFile(__dirname + "/public/showAll.html");
});

app.get("/statistics", (req, res) => {
  res.sendFile(__dirname + "/public/statistics.html");
});


// end test section 

app.get('/', (req, res) => {
  console.log('test main server route');
  res.send('test_route');
});

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});