const all_devices = [];

// Join device to pole
function deviceOn(id, device, pole) {
  const devices = { id, device, pole };

  all_devices.push(devices);

  return devices;
}

// Get current poles
function getCurrentDevice(id) {
  return all_devices.find(devices => devices.id === id);
}

// device leaves pole
function deviceOff(id) {
  const index = all_devices.findIndex(devices => devices.camera_ip === id);

  if (index !== -1) {
    return all_devices.splice(index, 1)[0];
  }
}

// Get pole devices
function getPoleDevices(pole_code) {
  return all_devices.filter(devices => devices.pole_code === pole_code);
}

module.exports = {
  deviceOn,
  getCurrentDevice,
  deviceOff,
  getPoleDevices
};
