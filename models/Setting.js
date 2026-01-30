
var pool = require('../config/dbConnection');

async function mainQuery(query) {
  const [rows] = await pool.query(query);
  return rows;
}

exports.getSetting = async (name) => {
  const query = `
    SELECT 
      s.id,
      s.name,
      s.value,
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

exports.getDuplicateTicketGroupsAllSources = async () => {
  const query = `
    SELECT
      u.plate_number,
      u.location_id,
      l.name AS location_name,

      MIN(u.entry_time) AS first_entry_time,
      MAX(u.entry_time) AS last_entry_time,
      COUNT(*) AS duplicate_count
    FROM (
      -- OCR tickets
      SELECT
        t.id,
        t.plate_number,
        t.entry_time,
        z.location_id,
        'ocr' AS ticket_type
      FROM tickets t
      INNER JOIN cameras c ON c.id = t.camera_id
      INNER JOIN poles p ON p.id = c.pole_id
      INNER JOIN zones z ON z.id = p.zone_id

      UNION ALL

      -- OMC tickets
      SELECT
        o.id,
        o.plate_number,
        o.entry_time,
        z.location_id,
        'omc' AS ticket_type
      FROM omctickets o
      INNER JOIN cameras c ON c.id = o.camera_id
      INNER JOIN poles p ON p.id = c.pole_id
      INNER JOIN zones z ON z.id = p.zone_id

      UNION ALL

      -- HOLD tickets
      SELECT
        h.id,
        h.plate_number,
        h.entry_time,
        z.location_id,
        'hold' AS ticket_type
      FROM holdtickets h
      INNER JOIN cameras c ON c.id = h.camera_id
      INNER JOIN poles p ON p.id = c.pole_id
      INNER JOIN zones z ON z.id = p.zone_id
    ) u
    INNER JOIN locations l ON l.id = u.location_id

    GROUP BY
      u.plate_number,
      u.location_id,
      FLOOR(UNIX_TIMESTAMP(u.entry_time) / (15 * 60))

    HAVING COUNT(*) > 1
    ORDER BY last_entry_time DESC;
  `;

  const [rows] = await pool.query(query);
  return rows;
};

exports.getDuplicateTicketsGroupDetailsAllSources = async (
  plateNumber,
  locationId,
  first_entry_time
) => {
  console.log(first_entry_time , '========================');
  const query = `
    SELECT
      u.id,
      u.ticket_type,
      u.plate_number,
      u.entry_time,
      l.name AS location_name
    FROM (
      SELECT t.id, t.plate_number, t.entry_time, z.location_id, 'ocr' AS ticket_type
      FROM tickets t
      INNER JOIN cameras c ON c.id = t.camera_id
      INNER JOIN poles p ON p.id = c.pole_id
      INNER JOIN zones z ON z.id = p.zone_id

      UNION ALL

      SELECT o.id, o.plate_number, o.entry_time, z.location_id, 'omc' AS ticket_type
      FROM omctickets o
      INNER JOIN cameras c ON c.id = o.camera_id
      INNER JOIN poles p ON p.id = c.pole_id
      INNER JOIN zones z ON z.id = p.zone_id

      UNION ALL

      SELECT h.id, h.plate_number, h.entry_time, z.location_id, 'hold' AS ticket_type
      FROM holdtickets h
      INNER JOIN cameras c ON c.id = h.camera_id
      INNER JOIN poles p ON p.id = c.pole_id
      INNER JOIN zones z ON z.id = p.zone_id
    ) u
    INNER JOIN locations l ON l.id = u.location_id

    WHERE
      u.plate_number = ?
      AND u.location_id = ?
      AND u.entry_time BETWEEN
          ?
          AND DATE_ADD(?, INTERVAL 15 MINUTE)

    ORDER BY u.entry_time ASC;
  `;

  const [rows] = await pool.query(query, [
    plateNumber,
    locationId,
    first_entry_time,
    first_entry_time
  ]);

  return rows;
};







