
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
  dbTime
) => {
  console.log(dbTime , '========================');
    const query = `
    SELECT
      u.id,
      u.camera_id,
      u.parkonic_token,
      u.spot_number,
      u.camera_ip,
      u.plate_number,
      u.plate_code,
      u.plate_city,
      u.status,
      u.zone_name,
      u.zone_region,
      u.confidence,
      DATE_FORMAT(u.entry_time, '%Y-%m-%d %H:%i:%s') AS entry_time,
      DATE_FORMAT(u.exit_time, '%Y-%m-%d %H:%i:%s') AS exit_time,
      u.parking_duration,
      u.parkonic_trip_id,
      u.entry_image_path,
      u.exit_clip_path,
      u.entry_image,
      u.crop_image,
      u.exit_image,
      CASE
        WHEN TIMESTAMPDIFF(HOUR, u.created_at, NOW()) > 24
        THEN 'EXPIRED'
        ELSE u.entry_video_url
      END AS entry_video_url,

      CASE
        WHEN TIMESTAMPDIFF(HOUR, u.created_at, NOW()) > 24
        THEN 'EXPIRED'
        ELSE u.exit_video_url
      END AS exit_video_url,

      u.created_at,
      u.updated_at,

      u.ticket_type,
      l.name AS location_name
    FROM (
      SELECT 
        t.id,
        t.camera_id,
        t.parkonic_token,
        t.spot_number,
        t.camera_ip,
        t.plate_number,
        t.plate_code,
        t.plate_city,
        t.status,
        t.zone_name,
        t.zone_region,
        t.confidence,
        DATE_FORMAT(t.entry_time, '%Y-%m-%d %H:%i:%s') AS entry_time,
        DATE_FORMAT(t.exit_time, '%Y-%m-%d %H:%i:%s') AS exit_time,
        t.parking_duration,
        t.parkonic_trip_id,
        t.entry_image_path,
        t.exit_clip_path,
        t.entry_image,
        t.crop_image,
        t.exit_image,
        CASE
          WHEN TIMESTAMPDIFF(HOUR, t.created_at, NOW()) > 24
          THEN 'EXPIRED'
          ELSE t.entry_video_url
        END AS entry_video_url,

        CASE
          WHEN TIMESTAMPDIFF(HOUR, t.created_at, NOW()) > 24
          THEN 'EXPIRED'
          ELSE t.exit_video_url
        END AS exit_video_url,

        t.created_at,
        t.updated_at,

        z.location_id, 
        'ocr' AS ticket_type
      FROM tickets t
      INNER JOIN cameras c ON c.id = t.camera_id
      INNER JOIN poles p ON p.id = c.pole_id
      INNER JOIN zones z ON z.id = p.zone_id

      UNION ALL

      SELECT 
        o.id,
        o.camera_id,
        o.parkonic_token,
        o.spot_number,
        o.camera_ip,
        o.plate_number,
        o.plate_code,
        o.plate_city,
        o.status,
        o.zone_name,
        o.zone_region,
        o.confidence,
        DATE_FORMAT(o.entry_time, '%Y-%m-%d %H:%i:%s') AS entry_time,
        DATE_FORMAT(o.exit_time, '%Y-%m-%d %H:%i:%s') AS exit_time,
        o.parking_duration,
        o.parkonic_trip_id,
        o.entry_image_path,
        o.exit_clip_path,
        o.entry_image,
        o.crop_image,
        o.exit_image,
        CASE
          WHEN TIMESTAMPDIFF(HOUR, o.created_at, NOW()) > 24
          THEN 'EXPIRED'
          ELSE o.entry_video_url
        END AS entry_video_url,

        CASE
          WHEN TIMESTAMPDIFF(HOUR, o.created_at, NOW()) > 24
          THEN 'EXPIRED'
          ELSE o.exit_video_url
        END AS exit_video_url,

        o.created_at,
        o.updated_at,

        z.location_id, 
        'omc' AS ticket_type
      FROM omctickets o
      INNER JOIN cameras c ON c.id = o.camera_id
      INNER JOIN poles p ON p.id = c.pole_id
      INNER JOIN zones z ON z.id = p.zone_id

      UNION ALL

      SELECT 
        h.id,
        h.camera_id,
        h.parkonic_token,
        h.spot_number,
        h.camera_ip,
        h.plate_number,
        h.plate_code,
        h.plate_city,
        h.status,
        h.zone_name,
        h.zone_region,
        h.confidence,
        DATE_FORMAT(h.entry_time, '%Y-%m-%d %H:%i:%s') AS entry_time,
        DATE_FORMAT(h.exit_time, '%Y-%m-%d %H:%i:%s') AS exit_time,
        h.parking_duration,
        h.parkonic_trip_id,
        h.entry_image_path,
        h.exit_clip_path,
        h.entry_image,
        h.crop_image,
        h.exit_image,
        CASE
          WHEN TIMESTAMPDIFF(HOUR, h.created_at, NOW()) > 24
          THEN 'EXPIRED'
          ELSE h.entry_video_url
        END AS entry_video_url,

        CASE
          WHEN TIMESTAMPDIFF(HOUR, h.created_at, NOW()) > 24
          THEN 'EXPIRED'
          ELSE h.exit_video_url
        END AS exit_video_url,

        h.created_at,
        h.updated_at,
        z.location_id, 
        'hold' AS ticket_type
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
    dbTime,
    dbTime
  ]);

  return rows;
};


exports.deleteTicketByType = async (id, type) => {
  const tableMap = {
    ocr: 'tickets',
    omc: 'omctickets',
    hold: 'holdtickets'
  };

  const table = tableMap[type];

  if (!table) {
    throw new Error('Invalid ticket type');
  }

  const query = `
    DELETE FROM ${table}
    WHERE id = ?
  `;

  const [result] = await pool.query(query, [id]);
  return result;
};

exports.getTicketByIdAndType = async (id, type) => {
  const tableMap = {
    ocr: 'tickets',
    omc: 'omctickets',
    hold: 'holdtickets'
  };

  const table = tableMap[type];

  if (!table) {
    throw new Error('Invalid ticket type');
  }

  const query = `
    SELECT *
    FROM ${table}
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query(query, [id]);
  return rows;
};






