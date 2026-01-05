var pool = require('../config/dbConnection');

// async function mainQuery(query) {
//   const db = await connectDB();
//   try{
//     const [rows] = await db.execute(query);
//     return rows;
//   } finally {
//     await db.end();
//   }
// }

async function mainQuery(query) {
  const [rows] = await pool.execute(query);
  return rows;
}

exports.getTicketsTotalCount = async () => {
  const query = 'SELECT COUNT(*) AS totalCount FROM tickets';
  const result = await mainQuery(query);
  return result[0]?.totalCount || 0;
};

exports.getTicketsTotalCountByCamera = (camera_id) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM tickets
    WHERE camera_id = ${Number(camera_id)}
  `;
  return mainQuery(query);
};

exports.getTicketsTotalCountByLocation = (location_id) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM tickets t
    INNER JOIN cameras c ON c.id = t.camera_id
    INNER JOIN poles p ON p.id = c.pole_id
    INNER JOIN zones z ON z.id = p.zone_id
    WHERE z.location_id = ${Number(location_id)}
  `;
  return mainQuery(query);
};


exports.getTickets = () => {
  const query = `
    SELECT 
      t.id,
      t.camera_id,
      t.parkonic_token,
      c.access_point_id,
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
      t.updated_at
    FROM tickets t
    INNER JOIN cameras c ON c.id = t.camera_id
    ORDER BY t.id DESC
  `;
  
  return mainQuery(query);
};

exports.getTicketsPaginate = (perPage, offset) => {
  const query = `
    SELECT
      t.id,
      t.camera_id,
      t.parkonic_token,
      c.access_point_id,
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
      t.updated_at
    FROM tickets t
    INNER JOIN cameras c ON c.id = t.camera_id
    ORDER BY t.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;

  
  return mainQuery(query);
};

exports.getTicketById = (ticket_id) => {
  const query = `
    SELECT 
      t.id,
      t.camera_id,
      t.parkonic_token,
      c.access_point_id,
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
      t.updated_at
    FROM tickets t
    INNER JOIN cameras c ON c.id = t.camera_id
    WHERE t.id = ${Number(ticket_id)}
    LIMIT 1;
  `;


  return mainQuery(query);
};

exports.createTicket = async (data) => {
  const {
    camera_id,
    parkonic_token,
    number,
    code,
    city,
    status,
    entry_time,
    exit_time,
    spot_number,
    camera_ip,
    zone_name,
    zone_region,
    entry_video_url,
    exit_video_url,
    entry_image,
    crop_image,
    exit_image
  } = data;

  const query = `
    INSERT INTO tickets (
      camera_id,
      parkonic_token,
      plate_number,
      plate_code,
      plate_city,
      status,
      entry_time,
      exit_time,
      spot_number,
      camera_ip,
      zone_name,
      zone_region,
      entry_video_url,
      exit_video_url,
      entry_image,
      crop_image,
      exit_image
    ) VALUES (
      '${camera_id}',
      '${parkonic_token}',
      ${number ? `'${number}'` : 'NULL'},
      ${code ? `'${code}'` : 'NULL'},
      ${city ? `'${city}'` : 'NULL'},
      '${status}',
      ${entry_time ? `'${entry_time}'` : 'NULL'},
      ${exit_time ? `'${exit_time}'` : 'NULL'},
      ${spot_number ? `'${spot_number}'` : 'NULL'},
      '${camera_ip}',
      ${zone_name ? `'${zone_name}'` : 'NULL'},
      ${zone_region ? `'${zone_region}'` : 'NULL'},
      ${entry_video_url ? `'${entry_video_url}'` : 'NULL'},
      ${exit_video_url ? `'${exit_video_url}'` : 'NULL'},
      ${entry_image ? `'${entry_image}'` : 'NULL'},
      ${crop_image ? `'${crop_image}'` : 'NULL'},
      ${exit_image ? `'${exit_image}'` : 'NULL'}
    )
  `;
  return mainQuery(query);
};

exports.updateTicket = async (id, data) => {
  const {
    camera_id,
    spot_number,
    plate_number,
    plate_code,
    plate_city,
    confidence,
    entry_time,
    exit_time,
    parkonic_trip_id,
    entry_image,
    crop_image,
    exit_image,
    entry_image_path,
    exit_clip_path
  } = data;

  const updates = [];

  if (camera_id) updates.push(`camera_id='${camera_id}'`);
  if (spot_number) updates.push(`spot_number='${spot_number}'`);
  if (plate_number) updates.push(`plate_number='${plate_number}'`);
  if (plate_code) updates.push(`plate_code='${plate_code}'`);
  if (plate_city) updates.push(`plate_city='${plate_city}'`);
  if (confidence !== undefined) updates.push(`confidence='${confidence}'`);
  if (entry_time) updates.push(`entry_time='${entry_time}'`);
  if (exit_time) updates.push(`exit_time='${exit_time}'`);
  if (parkonic_trip_id) updates.push(`parkonic_trip_id='${parkonic_trip_id}'`);
  if (entry_image) updates.push(`entry_image='${entry_image}'`);
  if (crop_image) updates.push(`crop_image='${crop_image}'`);
  if (exit_image) updates.push(`exit_image='${exit_image}'`);
  if (entry_image_path) updates.push(`entry_image_path='${entry_image_path}'`);
  if (exit_clip_path) updates.push(`exit_clip_path='${exit_clip_path}'`);

  if (updates.length === 0) return null; // nothing to update

  const query = `
    UPDATE tickets
    SET ${updates.join(', ')}
    WHERE id = ${id}
  `;

  return mainQuery(query);
};


exports.deleteTicket = async (id) => {
  const query = `
    DELETE FROM tickets
    WHERE id = ${Number(id)}
  `;

  return mainQuery(query);
};

exports.getTicketsPaginateByCamera = (camera_id, perPage, offset) => {
  const query = `
    SELECT
      t.id,
      t.camera_id,
      t.parkonic_token,
      c.access_point_id,
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
      t.updated_at
    FROM tickets t
    INNER JOIN cameras c ON c.id = t.camera_id
    WHERE t.camera_id = ${Number(camera_id)}
    ORDER BY t.id DESC
    LIMIT ${Number(perPage)} OFFSET ${Number(offset)};
  `;

  return mainQuery(query);
};

exports.getTicketsPaginateByLocation = (location_id, perPage, offset) => {
  const query = `
    SELECT
      t.id,
      t.camera_id,
      t.parkonic_token,
      c.access_point_id,
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
      t.updated_at
    FROM tickets t
    INNER JOIN cameras c ON c.id = t.camera_id
    INNER JOIN poles p ON p.id = c.pole_id
    INNER JOIN zones z ON z.id = p.zone_id
    WHERE z.location_id = ${Number(location_id)}
    ORDER BY t.id DESC
    LIMIT ${Number(perPage)} OFFSET ${Number(offset)};
  `;
  return mainQuery(query);
};


