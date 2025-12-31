var pool = require('../config/dbConnection');
// var { basicConnection } = require("../config/basicConnection");

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

// exports.getPoles =  () => {
//   const insertQuery = `SELECT * FROM poles`;
//   return  mainQuery(insertQuery);
// }

// exports.getBasicPole = (callback) => {
//   basicConnection.query("SELECT * FROM poles", (err, results) => {
//     if (err) {
//       console.error("Error running query:", err);
//       return callback(err, null);
//     }
//     callback(null, results);
//   });
// };

exports.getPolesTotalCount = async () => {
  const query = 'SELECT COUNT(*) AS totalCount FROM poles WHERE deleted_at IS NULL';
  const result = await mainQuery(query);
  return result[0]?.totalCount || 0;
};

exports.getPoles = () => {
  const query = `
      SELECT 
        p.id,
        p.zone_id,
        z.name AS zone_name,
        p.code,
        p.router_ip,
        p.router_vpn_ip,
        p.lat,
        p.lng,
        COUNT(c.id) AS camera_count,
        DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
      FROM poles p
      JOIN zones z ON p.zone_id = z.id
      LEFT JOIN cameras c ON c.pole_id = p.id
      WHERE p.deleted_at IS NULL
      GROUP BY p.id;
  `;
  return mainQuery(query);
};

exports.getPolesPaginate = (perPage, offset) => {
  const query = `
      SELECT
        p.id AS id,
        p.code AS code,
        p.router_ip,
        p.router_vpn_ip,
        p.lat,
        p.lng,
        p.zone_id,
        z.name AS zone_name,
        COUNT(c.id) AS camera_count,
        DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
      FROM poles p
      JOIN zones z ON p.zone_id = z.id
      LEFT JOIN cameras c ON c.pole_id = p.id
      WHERE p.deleted_at IS NULL
      GROUP BY p.id, z.id
      ORDER BY p.id DESC
      LIMIT ${perPage} OFFSET ${offset};
  `;
  return mainQuery(query);
};

exports.getPoleById = (pole_id) => {
  const query = `
    SELECT 
      p.id,
      p.code,
      p.router_ip,
      p.router_vpn_ip,
      p.lat,
      p.lng,
      p.zone_id,
      z.name AS zone_name,
      DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
      COUNT(c.id) AS camera_count
    FROM poles p
    JOIN zones z ON p.zone_id = z.id
    LEFT JOIN cameras c ON c.pole_id = p.id
    WHERE p.id = ${Number(pole_id)} AND p.deleted_at IS NULL
    GROUP BY p.id, z.id
    LIMIT 1;
  `;
  return mainQuery(query);
};

exports.createPole = async (data) => {
  const { zone_id, code, router_ip, router_vpn_ip, lat, lng } = data;

  const query = `
    INSERT INTO poles (zone_id, code, router_ip, router_vpn_ip, lat, lng)
    VALUES (
      ${Number(zone_id)},
      '${code}',
      ${router_ip ? `'${router_ip}'` : 'NULL'},
      ${router_vpn_ip ? `'${router_vpn_ip}'` : 'NULL'},
      ${lat ? lat : 'NULL'},
      ${lng ? lng : 'NULL'}
    );
  `;

  return mainQuery(query);
};

exports.updatePole = async (id, data) => {
  const { zone_id, code, router_ip, router_vpn_ip, lat, lng } = data;

  const updates = [];

  if (zone_id) updates.push(`zone_id=${Number(zone_id)}`);
  if (code) updates.push(`code='${code}'`);
  if (router_ip) updates.push(`router_ip='${router_ip}'`);
  if (router_vpn_ip) updates.push(`router_vpn_ip='${router_vpn_ip}'`);
  if (lat !== undefined) updates.push(`lat=${lat}`);
  if (lng !== undefined) updates.push(`lng=${lng}`);

  // nothing to update
  if (updates.length === 0) return null;

  const query = `
    UPDATE poles
    SET ${updates.join(', ')}
    WHERE id = ${Number(id)} AND deleted_at IS NULL
  `;

  return mainQuery(query);
};

exports.softDeletePole = async (id) => {
  if (!id) return null;

  const now = `NOW()`;

  // Get cameras under this pole before deleting
  const cameras = await mainQuery(`
    SELECT id FROM cameras
    WHERE pole_id = ${Number(id)} AND deleted_at IS NULL
  `);
  const cameraIds = cameras.map(c => c.id);

  // Soft delete the pole
  await mainQuery(`
    UPDATE poles
    SET deleted_at = ${now}
    WHERE id = ${Number(id)} AND deleted_at IS NULL
  `);

  // Soft delete cameras if any exist
  if (cameraIds.length > 0) {
    await mainQuery(`
      UPDATE cameras
      SET deleted_at = ${now}
      WHERE id IN (${cameraIds.join(',')})
    `);
  }

  return {
    pole: Number(id),
    cameras: cameraIds,
  };
};


exports.restorePole = async (id) => {
  if (!id) return null;

  const updates = [`deleted_at=NULL`];

  const query = `
    UPDATE poles
    SET ${updates.join(', ')}
    WHERE id = ${Number(id)} AND deleted_at IS NOT NULL
  `;

  return mainQuery(query);
};

exports.getPolesByZone = (zoneId, perPage, offset) => {
  const query = `
    SELECT
      p.id AS id,
      p.code AS code,
      p.router_ip AS router_ip,
      p.router_vpn_ip AS router_vpn_ip,
      p.lat AS lat,
      p.lng AS lng,
      p.zone_id AS zone_id,
      z.name AS zone_name,
      COUNT(c.id) AS camera_count,
      DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM poles p
    JOIN zones z ON p.zone_id = z.id
    LEFT JOIN cameras c ON c.pole_id = p.id
    WHERE p.deleted_at IS NULL
      AND p.zone_id = ${zoneId}
    GROUP BY p.id, z.id
    ORDER BY p.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
  return mainQuery(query);
};

exports.getPolesCountByZone = (zoneId) => {
  const query = `
    SELECT COUNT(*) AS total 
    FROM poles 
    WHERE deleted_at IS NULL AND zone_id = ${zoneId};
  `;
  return mainQuery(query).then(result => result[0].total);
};

