var pool = require('../config/dbConnection');
const bcrypt = require('bcrypt');

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

exports.getLocationsTotalCount = async () => {
  const query = 'SELECT COUNT(*) AS totalCount FROM locations WHERE deleted_at IS NULL';
  const result = await mainQuery(query);
  return result[0]?.totalCount || 0;
};


exports.getLocations = () => {
  const insertQuery = `SELECT id, name, direct_transfer, border_color, fill_color
                  FROM locations
                  WHERE deleted_at IS NULL`;
  return  mainQuery(insertQuery);
}

exports.getLocationsPaginate = (perPage, offset) => {
  const insertQuery = `
    SELECT 
      l.id, 
      l.name, 
      l.description, 
      l.boundary, 
      l.direct_transfer, 
      l.border_color, 
      l.fill_color, 
      DATE_FORMAT(l.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(l.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
      COUNT(z.id) AS zones_count
    FROM locations l
    LEFT JOIN zones z ON z.location_id = l.id
    WHERE l.deleted_at IS NULL
    GROUP BY l.id
    ORDER BY l.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
  return mainQuery(insertQuery);
};

exports.getLocationById = (location_id) => {
  const query = `
    SELECT 
      l.id, 
      l.name, 
      l.description, 
      l.boundary, 
      l.direct_transfer, 
      l.border_color, 
      l.fill_color, 
      DATE_FORMAT(l.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(l.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
      COUNT(z.id) AS zones_count
    FROM locations l
    LEFT JOIN zones z ON z.location_id = l.id
    WHERE l.id = ${Number(location_id)} AND l.deleted_at IS NULL
    GROUP BY l.id
    LIMIT 1;
  `;
  return mainQuery(query);
};

exports.createLocation = async (data) => {
  const { name, description, boundary, camera_user, camera_pass, direct_transfer, border_color, fill_color } = data;
  const pass = await bcrypt.hash(camera_pass, 10);
  const query = `
    INSERT INTO locations (name, description, boundary, camera_user, camera_pass, direct_transfer, border_color, fill_color)
    VALUES ('${name}', '${description}', '${boundary}', '${camera_user}', '${pass}','${direct_transfer}','${border_color}', '${fill_color}')
  `;
  return mainQuery(query);
};

exports.updateLocation = async (id, data) => {
  const { name, description, boundary, camera_user, camera_pass, direct_transfer, border_color, fill_color} = data;

  const updates = [];
  if (name) updates.push(`name='${name}'`);
  if (description) updates.push(`description='${description}'`);
  if (boundary) updates.push(`boundary='${boundary}'`);
  if (direct_transfer) updates.push(`direct_transfer='${direct_transfer}'`);
  if (camera_user) updates.push(`camera_user='${camera_user}'`);
  if (camera_pass) updates.push(`camera_pass='${camera_pass}'`);
  if (border_color) updates.push(`border_color='${border_color}'`);
  if (fill_color) updates.push(`fill_color='${fill_color}'`);

  if (updates.length === 0) return null; // nothing to update

  const query = `
    UPDATE locations
    SET ${updates.join(', ')}
    WHERE id = ${id}
  `;
  return mainQuery(query);
};

exports.softDeleteLocation = async (id) => {
  if (!id) return null;
  
  const now = `NOW()`;

  // 1. Soft delete location
  await mainQuery(`
    UPDATE locations
    SET deleted_at = ${now}
    WHERE id = ${Number(id)} AND deleted_at IS NULL
  `);

  // 2. Get all zones under location
  const zones = await mainQuery(`
    SELECT id FROM zones WHERE location_id = ${Number(id)} AND deleted_at IS NULL
  `);

  if (zones.length === 0) {
    return { location: id, zones: [], poles: [], cameras: [] };
  }

  const zoneIds = zones.map(z => z.id);

  // 3. Soft delete zones
  await mainQuery(`
    UPDATE zones
    SET deleted_at = ${now}
    WHERE id IN (${zoneIds.join(',')})
  `);

  // 4. Get poles for these zones
  const poles = await mainQuery(`
    SELECT id FROM poles WHERE zone_id IN (${zoneIds.join(',')}) AND deleted_at IS NULL
  `);

  const poleIds = poles.map(p => p.id);

  if (poleIds.length > 0) {

    // 5. Soft delete poles
    await mainQuery(`
      UPDATE poles
      SET deleted_at = ${now}
      WHERE id IN (${poleIds.join(',')})
    `);

    // 6. Soft delete cameras under these poles
    await mainQuery(`
      UPDATE cameras
      SET deleted_at = ${now}
      WHERE pole_id IN (${poleIds.join(',')})
    `);
  }

  return {
    zones: zoneIds,
    poles: poleIds,
  };
};


exports.restoreLocation = async (id) => {
  if (!id) return null;

  const updates = [`deleted_at=NULL`];

  const query = `
    UPDATE locations
    SET ${updates.join(', ')}
    WHERE id = ${id} AND deleted_at IS NOT NULL
  `;

  return mainQuery(query);
};




