const { removeCamerasByDevice } = require("./cameras")

const online_devices = [];

function deviceOn(id, device, code) {
  const deviceObj = device;
  deviceObj.socket_id = id;

  // Find pole by unique combination
  const match = c =>
    c.id === id &&
    c.code === code;

  // Find existing indexes
  const online_index = online_devices.findIndex(match);

  if (online_index !== -1) {
    online_devices[online_index] = deviceObj;
  } else {
    online_devices.push(deviceObj);
  }
  return deviceObj;
}

function getDeviceBySocketId(id){
    const device = online_devices.find(device => device.socket_id === id);
    return device;
}

function deviceOff(id) {
  const match = c =>
    c.file_server_id === id;

  const code = online_devices.find(device => device.socket_id === id);
  if(code){
    removeCamerasByDevice(code.code)
  }
  const index = online_devices.findIndex(match);
  const deviceObj = { id };
  if (index !== -1) {
    online_devices.splice(index, 1);
  }
  return deviceObj;
}

// Return only online poles
function getOnlineDevices() {
  return online_devices
}

module.exports = {
  deviceOn,
  deviceOff,
  getOnlineDevices,
  getDeviceBySocketId,
};
