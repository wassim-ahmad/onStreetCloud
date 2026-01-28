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
  const [rows] = await pool.query(query);
  return rows;
}

exports.getCamerasTotalCount = async () => {
  const query = 'SELECT COUNT(*) AS totalCount FROM camera_execute';
  const result = await mainQuery(query);
  return result[0]?.totalCount || 0;
};

exports.getCamerasCountPerPole = async () => {
  const query = `
    SELECT pole_id, COUNT(*) AS cameraCount
    FROM camera_execute
    GROUP BY pole_id
  `;
  const result = await mainQuery(query);
  return result; // [{ pole_id: 1, cameraCount: 3 }, { pole_id: 2, cameraCount: 5 }, ...]
};

exports.getCamerasPaginate = (perPage, offset) => {
  const query = `
    SELECT
      c.id,
      c.camera_ip,
      c.pole_id,
      c.old_camera_id,
      c.type,
      c.number_of_parking,
      p.code AS pole_code,
      p.router_ip AS pole_router_ip,
      p.router_vpn_ip AS pole_router_vpn_ip,
      p.lat AS pole_lat,
      p.lng AS pole_lng,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM camera_execute c
    JOIN poles p ON c.pole_id = p.id
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
      c.pole_id,
      c.old_camera_id,
      c.type,
      p.code AS pole_code,
      p.router_ip AS pole_router_ip,
      p.router_vpn_ip AS pole_router_vpn_ip,
      p.lat AS pole_lat,
      p.lng AS pole_lng,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM camera_execute c
    JOIN poles p ON c.pole_id = p.id
    WHERE c.id = ${Number(camera_id)}
    LIMIT 1;
  `;
  return mainQuery(query);
};

exports.createCamera = async (data) => {
  const { pole_id, camera_ip, old_camera_id, type, number_of_parking } = data;

  const query = `
    INSERT INTO camera_execute (pole_id, camera_ip, old_camera_id, type, number_of_parking)
    VALUES (
      ${Number(pole_id)},
      ${camera_ip ? `'${camera_ip}'` : 'NULL'},
      ${old_camera_id ? `'${old_camera_id}'` : 'NULL'},
      ${type ? `'${type}'` : 'NULL'},
      ${typeof number_of_parking === 'number' ? number_of_parking : 'NULL'}
    );
  `;

  return mainQuery(query);
};


exports.deleteCamera = async (id) => {
  const query = `
    DELETE FROM camera_execute
    WHERE id = ${Number(id)}
  `;
  return mainQuery(query);
};


exports.getCamerasByPole = (pole_id, perPage = 9, offset = 0) => {
  const query = `
    SELECT
      c.id,
      c.camera_ip,
      c.pole_id,
      c.old_camera_id,
      c.type,
      c.number_of_parking,
      p.code AS pole_code,
      p.router_ip AS pole_router_ip,
      p.router_vpn_ip AS pole_router_vpn_ip,
      p.lat AS pole_lat,
      p.lng AS pole_lng,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM camera_execute c
    JOIN poles p ON c.pole_id = p.id
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
      c.pole_id,
      c.old_camera_id,
      c.type,
      c.number_of_parking,
      p.code AS pole_code,
      p.router_ip AS pole_router_ip,
      p.router_vpn_ip AS pole_router_vpn_ip,
      p.lat AS pole_lat,
      p.lng AS pole_lng,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM camera_execute c
    JOIN poles p ON c.pole_id = p.id
      AND p.code = '${pole_code}'
    ORDER BY c.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;

  return mainQuery(query);
};

exports.getCamerasCountByPole = (poleId) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM camera_execute c
    JOIN poles p ON c.pole_id = p.id
      AND c.pole_id = ${Number(poleId)};
  `;
  return mainQuery(query).then(result => result[0].total);
};


