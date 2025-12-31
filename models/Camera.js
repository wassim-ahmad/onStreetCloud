var pool = require('../config/dbConnection');

// async function mainQuery(query) {
//   const db = await connectDB();
//   try{
//     const [rows] = await db.execute(query);
//     // console.log(rows);
//     return rows;
//   } finally {
//     await db.end();
//   }
// }

async function mainQuery(query) {
  const [rows] = await pool.execute(query);
  return rows;
}


exports.getCamerasTotalCount = async () => {
  const query = 'SELECT COUNT(*) AS totalCount FROM cameras WHERE deleted_at IS NULL';
  const result = await mainQuery(query);
  return result[0]?.totalCount || 0;
};

exports.getCamerasCountByPoleCode = async (poleCode) => {
  const query = `
    SELECT COUNT(c.id) AS totalCount
    FROM cameras c
    JOIN poles p ON c.pole_id = p.id
    WHERE c.deleted_at IS NULL AND p.code = '${poleCode}'
    `;
  
  const result = await mainQuery(query);
  return result[0]?.totalCount || 0;
};

exports.getCamerasCountPerPole = async () => {
  const query = `
    SELECT pole_id, COUNT(*) AS cameraCount
    FROM cameras
    WHERE deleted_at IS NULL
    GROUP BY pole_id
  `;
  const result = await mainQuery(query);
  return result; // [{ pole_id: 1, cameraCount: 3 }, { pole_id: 2, cameraCount: 5 }, ...]
};

exports.getCameras = () => {
  const query = `
    SELECT
      c.id,
      c.camera_ip,
      c.pole_id,
      c.number_of_parking,
      c.access_point_id,
      p.code AS pole_code,
      p.router_ip AS pole_router_ip,
      p.router_vpn_ip AS pole_router_vpn_ip,
      p.lat AS pole_lat,
      p.lng AS pole_lng,
      p.zone_id AS pole_zone_id,
      z.name AS zone_name,
      l.name AS location_name,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM cameras c
    JOIN poles p ON c.pole_id = p.id AND p.deleted_at IS NULL
    JOIN zones z ON p.zone_id = z.id AND z.deleted_at IS NULL
    JOIN locations l ON z.location_id = l.id AND l.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
    ORDER BY c.id DESC;
  `;
  return mainQuery(query);
};

exports.getCamerasPaginate = (perPage, offset) => {
  const query = `
    SELECT
      c.id,
      c.camera_ip,
      c.pole_id,
      c.number_of_parking,
      c.access_point_id,
      p.code AS pole_code,
      p.router_ip AS pole_router_ip,
      p.router_vpn_ip AS pole_router_vpn_ip,
      p.lat AS pole_lat,
      p.lng AS pole_lng,
      p.zone_id AS pole_zone_id,
      z.name AS zone_name,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM cameras c
    JOIN poles p ON c.pole_id = p.id AND p.deleted_at IS NULL
    JOIN zones z ON p.zone_id = z.id AND z.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
    ORDER BY c.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
  return mainQuery(query);
};



exports.getCameraById = (camera_id) => {
  const query = `
    SELECT 
      c.id,
      c.camera_ip,
      c.number_of_parking,
      c.access_point_id,
      c.pole_id,
      p.code AS pole_code,
      p.router_ip AS pole_router_ip,
      p.router_vpn_ip AS pole_router_vpn_ip,
      p.lat AS pole_lat,
      p.lng AS pole_lng,
      p.zone_id AS pole_zone_id,
      z.name AS zone_name,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM cameras c
    JOIN poles p ON c.pole_id = p.id
    JOIN zones z ON p.zone_id = z.id
    WHERE c.id = ${Number(camera_id)} AND c.deleted_at IS NULL
    LIMIT 1;
  `;
  return mainQuery(query);
};

exports.getDeletedCameraById = (camera_id) => {
  const query = `
    SELECT 
      c.id,
      c.camera_ip,
      c.number_of_parking,
      c.access_point_id,
      c.pole_id,
      p.code AS pole_code,
      p.router_ip AS pole_router_ip,
      p.router_vpn_ip AS pole_router_vpn_ip,
      p.lat AS pole_lat,
      p.lng AS pole_lng,
      p.zone_id AS pole_zone_id,
      z.name AS zone_name,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM cameras c
    JOIN poles p ON c.pole_id = p.id
    JOIN zones z ON p.zone_id = z.id
    WHERE c.id = ${Number(camera_id)}
    LIMIT 1;
  `;
  return mainQuery(query);
};

exports.createCamera = async (data) => {
  const { pole_id, camera_ip, access_point_id, number_of_parking } = data;

  const query = `
    INSERT INTO cameras (pole_id, camera_ip, access_point_id, number_of_parking)
    VALUES (
      ${Number(pole_id)},
      ${camera_ip ? `'${camera_ip}'` : 'NULL'},
      ${access_point_id ? `'${access_point_id}'` : 'NULL'},
      ${typeof number_of_parking === 'number' ? number_of_parking : 'NULL'}
    );
  `;

  return mainQuery(query);
};

exports.updateCamera = async (id, data) => {
  const { pole_id, camera_ip, access_point_id, number_of_parking } = data;

  const updates = [];

  if (pole_id !== undefined) {
    updates.push(`pole_id = ${Number(pole_id)}`);
  }
  if (camera_ip !== undefined) {
    updates.push(`camera_ip = ${camera_ip ? `'${camera_ip}'` : 'NULL'}`);
  }
  if (access_point_id !== undefined) {
    updates.push(`access_point_id = ${access_point_id ? `'${access_point_id}'` : 'NULL'}`);
  }
  if (number_of_parking !== undefined) {
    updates.push(`number_of_parking = ${typeof Number(number_of_parking) === 'number' ? number_of_parking : 'NULL'}`);
  }

  // nothing to update
  if (updates.length === 0) return null;

  const query = `
    UPDATE cameras
    SET ${updates.join(', ')}
    WHERE id = ${Number(id)} AND deleted_at IS NULL;
  `;

  return mainQuery(query);
};


exports.softDeleteCamera = async (id) => {
  const query = `
    UPDATE cameras
    SET deleted_at = NOW()
    WHERE id = ${Number(id)} AND deleted_at IS NULL
  `;
  return mainQuery(query);
};

exports.restoreCamera = async (id) => {
  if (!id) return null;

  const query = `
    UPDATE cameras
    SET deleted_at = NULL
    WHERE id = ${Number(id)} AND deleted_at IS NOT NULL
  `;
  return mainQuery(query);
};

exports.getCamerasByPole = (pole_id, perPage = 9, offset = 0) => {
  const query = `
    SELECT
      c.id,
      c.camera_ip,
      c.access_point_id,
      c.pole_id,
      c.number_of_parking,
      p.code AS pole_code,
      p.router_ip AS pole_router_ip,
      p.router_vpn_ip AS pole_router_vpn_ip,
      p.lat AS pole_lat,
      p.lng AS pole_lng,
      p.zone_id AS pole_zone_id,
      z.name AS zone_name,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM cameras c
    JOIN poles p ON c.pole_id = p.id AND p.deleted_at IS NULL
    JOIN zones z ON p.zone_id = z.id AND z.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
      AND c.pole_id = ${Number(pole_id)}
    ORDER BY c.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
  return mainQuery(query);
};

exports.getCamerasByPoleCode = (pole_code, perPage = 9, offset = 0) => {
  const query = `
    SELECT
      c.id,
      c.camera_ip,
      c.access_point_id,
      c.pole_id,
      c.number_of_parking,
      p.code AS pole_code,
      p.router_ip AS pole_router_ip,
      p.router_vpn_ip AS pole_router_vpn_ip,
      p.lat AS pole_lat,
      p.lng AS pole_lng,
      p.zone_id AS pole_zone_id,
      z.name AS zone_name,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM cameras c
    JOIN poles p ON c.pole_id = p.id AND p.deleted_at IS NULL
    JOIN zones z ON p.zone_id = z.id AND z.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
      AND p.code = '${pole_code}'
    ORDER BY c.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;

  return mainQuery(query);
};


exports.getCamerasByZone = (zoneId, perPage = 9, offset = 0) => {
  const query = `
    SELECT
      c.id,
      c.camera_ip,
      c.number_of_parking,
      c.access_point_id,
      c.pole_id,
      p.code AS pole_code,
      p.router_ip AS pole_router_ip,
      p.router_vpn_ip AS pole_router_vpn_ip,
      p.lat AS pole_lat,
      p.lng AS pole_lng,
      p.zone_id AS pole_zone_id,
      z.name AS zone_name,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM cameras c
    JOIN poles p ON c.pole_id = p.id AND p.deleted_at IS NULL
    JOIN zones z ON p.zone_id = z.id AND z.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
      AND p.zone_id = ${Number(zoneId)}
    ORDER BY c.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
  return mainQuery(query);
};

exports.getCamerasCountByPole = (poleId) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM cameras c
    JOIN poles p ON c.pole_id = p.id AND p.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
      AND c.pole_id = ${Number(poleId)};
  `;
  return mainQuery(query).then(result => result[0].total);
};

exports.getCamerasCountByZone = (zoneId) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM cameras c
    JOIN poles p ON c.pole_id = p.id AND p.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
      AND p.zone_id = ${Number(zoneId)};
  `;
  return mainQuery(query).then(result => result[0].total);
};

