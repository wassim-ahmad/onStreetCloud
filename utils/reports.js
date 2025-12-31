const moment = require('moment');

function formatLog(device, text) {
  return {
    device,
    text,
    time: moment().format('h:mm a')
  };
}

module.exports = formatLog;
