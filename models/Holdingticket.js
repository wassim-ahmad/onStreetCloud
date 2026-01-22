const fs_promise = require('fs/promises');
const path = require('path');

var pool = require('../config/dbConnection');

async function deleteImage(filePath) {
  if (!filePath) return;

  const fullPath = path.resolve(filePath);

  try {
    await fs_promise.unlink(fullPath);
    console.log("Deleted file:", fullPath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Failed to delete file:", fullPath, err);
    }
  }
}

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
  const query = 'SELECT COUNT(*) AS totalCount FROM holdtickets';
  const result = await mainQuery(query);
  return result[0]?.totalCount || 0;
};

exports.getTicketsTotalCountByCamera = (camera_id) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM holdtickets
    WHERE camera_id = ${Number(camera_id)}
  `;
  return mainQuery(query);
};

exports.getTicketsTotalCountByLocation = (location_id) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM holdtickets t
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
      t.updated_at
    FROM holdtickets t
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
      t.updated_at
    FROM holdtickets t
    INNER JOIN cameras c ON c.id = t.camera_id
    ORDER BY t.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;

  
  return mainQuery(query);
};

exports.getTicketById = (ticket_id) => {
  const query = `
    SELECT *
    FROM (
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

        -- 🔢 pagination logic
        LAG(t.id)  OVER (ORDER BY t.id) AS prev_ticket_id,
        LEAD(t.id) OVER (ORDER BY t.id) AS next_ticket_id,
        COUNT(*)   OVER ()              AS total_tickets,
        ROW_NUMBER() OVER (ORDER BY t.id) AS rank_position

      FROM holdtickets t
      INNER JOIN cameras c ON c.id = t.camera_id
    ) ranked
    WHERE ranked.id = ${Number(ticket_id)}
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
    confidence,
    entry_time,
    exit_time,
    parking_duration,
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
    INSERT INTO holdtickets (
      camera_id,
      parkonic_token,
      plate_number,
      plate_code,
      plate_city,
      status,
      confidence,
      entry_time,
      exit_time,
      parking_duration,
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
      '${confidence}',
      ${entry_time ? `'${entry_time}'` : 'NULL'},
      ${exit_time ? `'${exit_time}'` : 'NULL'},
      ${parking_duration ? `'${parking_duration}'` : 'NULL'},
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
    plate_number,
    plate_code,
    plate_city,
    confidence,
    exit_time,
    parking_duration,
  } = data;

  const confidenceInt = confidence !== undefined && confidence !== null ? Number(confidence) : 'NULL';

  const updates = [];

  if (plate_number) updates.push(`plate_number='${plate_number}'`);
  if (plate_code) updates.push(`plate_code='${plate_code}'`);
  if (plate_city) updates.push(`plate_city='${plate_city}'`);
  if (confidenceInt !== undefined) updates.push(`confidence='${Number(confidenceInt)}'`);
  if (exit_time) updates.push(`exit_time='${exit_time}'`);
  if (parking_duration) updates.push(`parking_duration='${parking_duration}'`);

  if (updates.length === 0) return null; // nothing to update

  const query = `
    UPDATE holdtickets
    SET ${updates.join(', ')}
    WHERE id = ${id}
  `;

  return mainQuery(query);
};

exports.addTripId = async (id, trip_id) => {
  const updates = [];
  if (trip_id) updates.push(`parkonic_trip_id='${trip_id}'`);
  if (updates.length === 0) return null; // nothing to update

  const query = `
    UPDATE holdtickets
    SET ${updates.join(', ')}
    WHERE id = ${id}
  `;

  return mainQuery(query);
};

exports.deleteTicket = async (id) => {
  const query = `
    DELETE FROM holdtickets
    WHERE id = ${Number(id)}
  `;

  return mainQuery(query);
};

exports.countTicketsByLocationAndRangeDate = async ({ location_id, start, end }) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM holdtickets t
    JOIN cameras c ON t.camera_id = c.id
    JOIN poles p ON c.pole_id = p.id
    JOIN zones z ON p.zone_id = z.id
    WHERE z.location_id = ${Number(location_id)}
      AND t.created_at BETWEEN '${start}' AND '${end}'
  `;
  return mainQuery(query);
};

exports.deleteTicketRange = async ({ location_id , start, end }) => {
  const selectQuery = `
    SELECT t.entry_image, t.crop_image, t.exit_image
    FROM holdtickets t
    JOIN cameras c ON t.camera_id = c.id
    JOIN poles p ON c.pole_id = p.id
    JOIN zones z ON p.zone_id = z.id
    WHERE z.location_id = ${Number(location_id)}
      AND t.created_at BETWEEN '${start}' AND '${end}'
  `;

  const rows = await mainQuery(selectQuery);

  for (const row of rows) {
    await deleteImage(row.entry_image);
    await deleteImage(row.crop_image);
    await deleteImage(row.exit_image);
  }

  const query = `
    DELETE t
    FROM holdtickets t
    INNER JOIN cameras c ON t.camera_id = c.id
    INNER JOIN poles p ON c.pole_id = p.id
    INNER JOIN zones z ON p.zone_id = z.id
    WHERE z.location_id = ${Number(location_id)}
      AND t.created_at BETWEEN '${start}' AND '${end}'
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
      t.updated_at

    FROM holdtickets t
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
      t.updated_at
    FROM holdtickets t
    INNER JOIN cameras c ON c.id = t.camera_id
    INNER JOIN poles p ON p.id = c.pole_id
    INNER JOIN zones z ON z.id = p.zone_id
    WHERE z.location_id = ${Number(location_id)}
    ORDER BY t.id DESC
    LIMIT ${Number(perPage)} OFFSET ${Number(offset)};
  `;
  return mainQuery(query);
};



