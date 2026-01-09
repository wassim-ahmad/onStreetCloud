const settingsModel = require('../models/Setting');

function normalizeIp(ip) {
  if (!ip) return '';
  // convert ::ffff:192.168.1.10 → 192.168.1.10
  return ip.replace('::ffff:', '');
}

async function ticketIpGuard(req, res, next) {
  try {
    const rows = await settingsModel.getSetting('ticket_allowed_ips');

    if (!rows.length) {
      return res.status(403).json({ message: 'IP protection not configured' });
    }

    let allowedIps = rows[0].value;

    // If stored as string, convert to array
    if (typeof allowedIps === 'string') {
      try {
        allowedIps = JSON.parse(allowedIps);
      } catch {
        return res.status(500).json({ message: 'Invalid IP configuration' });
      }
    }

    if (!Array.isArray(allowedIps)) {
      return res.status(500).json({ message: 'Invalid IP configuration' });
    }

    // Get real client IP
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.socket.remoteAddress;

    const ip = normalizeIp(clientIp);

    if (!allowedIps.includes(ip)) {
      return res.status(403).json({
        message: 'Access denied from this IP',
        ip
      });
    }

    next();
  } catch (err) {
    console.error('IP Guard Error:', err);
    res.status(500).json({ message: 'IP verification failed' });
  }
}

module.exports = ticketIpGuard;
