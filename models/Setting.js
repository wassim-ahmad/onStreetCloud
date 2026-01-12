
var pool = require('../config/dbConnection');

async function mainQuery(query) {
  const [rows] = await pool.execute(query);
  return rows;
}

exports.getSetting = async (name) => {
  const query = `
    SELECT 
      s.id,
      s.name,
      // s.value,
      JSON_VALID(s.value)
      FROM settings s
      WHERE s.name = '${name}'
      LIMIT 1;
      `;
      // DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      // DATE_FORMAT(s.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
  const result = await mainQuery(query);
  return result;
};
exports.getAllSetting = async () => {
  const query = `
    SELECT 
      s.id,
      s.name,
      s.value,
      DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(s.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
      FROM settings s;
      `;
     
  const result = await mainQuery(query);
  return result;
};

exports.updateIPs = async (value) => {

  if (!Array.isArray(value)) {
    throw new Error('IPs must be an array');
  }
  
  const updates = [];
  if (value) updates.push(`value='${[JSON.stringify(value)]}'`);

  if (updates.length === 0) return null; // nothing to update

  const query = `
    UPDATE settings
    SET ${updates.join(', ')}
    WHERE name = 'ticket_allowed_ips'
  `;
  return mainQuery(query);
};

exports.updateCameraIssueTime = async (value) => {

  if (!Array.isArray(value)) {
    throw new Error('time must be an array');
  }
  
  const updates = [];
  if (value) updates.push(`value='${[JSON.stringify(value)]}'`);

  if (updates.length === 0) return null; // nothing to update

  const query = `
    UPDATE settings
    SET ${updates.join(', ')}
    WHERE name = 'camera_issue_time'
  `;
  return mainQuery(query);
};


