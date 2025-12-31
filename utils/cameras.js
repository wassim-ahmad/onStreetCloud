const online_cameras = [];
const offline_cameras = [];
const all_cameras = [];

// Add or update camera info when it comes online
function cameraOn(id, device, pole_code) {
  const camera = { id, device, pole_code };

  // Find camera by unique combination
  const match = c =>
    c.id === id &&
    c.device.camera_ip === device.camera_ip &&
    c.pole_code === pole_code;

  // Find existing indexes
  const online_index = online_cameras.findIndex(match);
  const all_index = all_cameras.findIndex(match);
  const offline_index = offline_cameras.findIndex(match);

  // ✅ Update if already online, otherwise add it
  if (online_index !== -1) {
    online_cameras[online_index] = camera; // update
    // online_cameras.splice(online_index, 1);
    // online_cameras.push(camera);
  } else {
    online_cameras.push(camera);
  }

  // ✅ Add to all_cameras if not already exists
  if (all_index === -1) {
    all_cameras.push(camera);
  }else{
    all_cameras[all_index] = camera; // update
    // all_cameras.splice(all_index, 1);
    // all_cameras.push(camera);
  }

  // ✅ Remove from offline if found
  if (offline_index !== -1) {
    offline_cameras.splice(offline_index, 1);
    // important note form wassim
    // here should be add alert becauese the cameras was offline and change to online
  }

  console.log(`[ONLINE] Camera ${device.camera_ip} at pole ${pole_code}`);
  return camera;
}

// camera leaves pole
async function cameraOff(id, device, pole_code) {
  const match = c =>
    c.id === id &&
    c.device.camera_ip === device.camera_ip &&
    c.pole_code === pole_code;

  const online_index = online_cameras.findIndex(match);
  const offline_index = offline_cameras.findIndex(match);
  const all_index = all_cameras.findIndex(match);

  // 1️⃣ If camera is online → move it to offline
  const camera = { id, device, pole_code };
  if (online_index !== -1) {
    online_cameras.splice(online_index, 1);
    // important note from wassim
    // here should add alert because the camera was online an turned into offline

  }
    if (offline_index === -1) {
      offline_cameras.push(camera);
    }else{
      // offline_cameras.splice(offline_index, 1);
      // offline_cameras.push(camera);
      offline_cameras[offline_index] = camera; // update
    }

    console.log(`[OFFLINE] Camera ${device.camera_ip} at pole ${pole_code} moved from online → offline`);

    // Add to all_cameras if missing
    if (all_index === -1) {
      all_cameras.push(camera);
    }else{
      // all_cameras.splice(all_index, 1);
      // all_cameras.push(camera);
      all_cameras[all_index] = camera;
    }
    return camera;
}

// Get pole cameras
function getPoleCameras(pole_code) {
  return all_cameras.filter(camera => camera.pole_code === pole_code);
  // const all = all_cameras.filter(c => c.pole_code === pole_code);
  // return all: all.map(c => c);
}

// Return only online cameras for a specific pole
function getOnlinePoleCameras(pole_code) {
  return online_cameras.filter(camera => camera.pole_code === pole_code);
}

// Return only offline cameras for a specific pole
function getOfflinePoleCameras(pole_code) {
  return offline_cameras.filter(camera => camera.pole_code === pole_code);
}

function printStatus(pole_code) {
  // Filter cameras by pole_code
  const online = online_cameras.filter(c => c.pole_code === pole_code);
  const all = all_cameras.filter(c => c.pole_code === pole_code);
  const offline = offline_cameras.filter(c => c.pole_code === pole_code);

  console.log(`\n=== CAMERA STATUS for Pole ${pole_code} ===`);
  console.log("Online:", online.map(c => c.device.camera_ip));
  console.log("All Cameras:", all.map(c => c.device.camera_ip));
  console.log("Offline:", offline.map(c => c.device.camera_ip));
  console.log("=====================\n");
}

function removeCamerasByDevice(pole_code){
  [online_cameras, offline_cameras, all_cameras].forEach(arr => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].pole_code === pole_code) {
        arr.splice(i, 1); // remove camera in place
      }
    }
  });
}

function allOnlineCameras(){
  return online_cameras;
}

module.exports = {
  cameraOn,
  cameraOff,
  getPoleCameras,
  getOnlinePoleCameras,
  getOfflinePoleCameras,
  printStatus,
  removeCamerasByDevice,
  allOnlineCameras
};
