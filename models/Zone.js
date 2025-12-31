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

exports.getZonesTotalCount = async () => {
  const query = 'SELECT COUNT(*) AS totalCount FROM zones WHERE deleted_at IS NULL';
  const result = await mainQuery(query);
  return result[0]?.totalCount || 0;
};

exports.getZones = () => {
  const insertQuery = `
      SELECT 
        z.id, 
        z.location_id, 
        l.name AS location_name, 
        z.name, 
        z.coordinates, 
        z.border_color,
        z.fill_color,
        DATE_FORMAT(z.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(z.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM zones z
    JOIN locations l ON z.location_id = l.id
    WHERE z.deleted_at IS NULL;
  `;
  return mainQuery(insertQuery);
};

exports.getZonesPaginate = (perPage, offset) => {
  const insertQuery = `
        SELECT 
        z.id AS id,
        z.name AS name,
        z.coordinates AS coordinates,
        z.border_color,
        z.fill_color,
        l.id AS location_id,
        l.name AS location_name,
        COUNT(p.id) AS poles_count,
        DATE_FORMAT(z.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(z.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM zones z
    JOIN locations l ON z.location_id = l.id
    LEFT JOIN poles p ON p.zone_id = z.id
    WHERE z.deleted_at IS NULL
    GROUP BY l.id, z.id
    ORDER BY l.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
  return mainQuery(insertQuery);
};

exports.getZoneById = (zone_id) => {
  const query = `
    SELECT 
      z.id,
      z.name,
      z.coordinates,
      z.location_id,
      z.border_color,
      z.fill_color,
      l.name AS location_name,
      DATE_FORMAT(z.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(z.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
      COUNT(p.id) AS poles_count
    FROM zones z
    JOIN locations l ON z.location_id = l.id
    LEFT JOIN poles p ON p.zone_id = z.id
    WHERE z.id = ${Number(zone_id)} AND z.deleted_at IS NULL
    GROUP BY z.id
    LIMIT 1;
  `;
  return mainQuery(query);
};

exports.createZone = async (data) => {
  const { name, coordinates, location_id, border_color, fill_color } = data;

  const query = `
    INSERT INTO zones (name, coordinates, location_id, border_color, fill_color)
    VALUES ('${name}', '${coordinates}', ${Number(location_id)}, '${border_color}', '${fill_color}');
  `;
  
  return mainQuery(query);
};

exports.updateZone = async (id, data) => {
  const { name, coordinates, location_id, border_color, fill_color } = data;

  const updates = [];

  if (name) updates.push(`name='${name}'`);
  if (coordinates) updates.push(`coordinates='${coordinates}'`);
  if (location_id) updates.push(`location_id=${Number(location_id)}`);
  if (border_color) updates.push(`border_color='${border_color}'`);
  if (fill_color) updates.push(`fill_color='${fill_color}'`);

  // nothing to update
  if (updates.length === 0) return null;

  const query = `
    UPDATE zones
    SET ${updates.join(', ')}
    WHERE id = ${Number(id)} AND deleted_at IS NULL
  `;

  return mainQuery(query);
};

exports.softDeleteZone = async (id) => {
  if (!id) return null;

  const now = `NOW()`;

  // Soft delete the zone itself
  await mainQuery(`
    UPDATE zones
    SET deleted_at = ${now}
    WHERE id = ${Number(id)} AND deleted_at IS NULL
  `);

  // Get poles under this zone
  const poles = await mainQuery(`
    SELECT id FROM poles
    WHERE zone_id = ${Number(id)} AND deleted_at IS NULL
  `);
  const poleIds = poles.map(p => p.id);

  let cameraIds = [];

  if (poleIds.length > 0) {
    // Soft delete poles
    await mainQuery(`
      UPDATE poles
      SET deleted_at = ${now}
      WHERE id IN (${poleIds.join(',')})
    `);

    // Get cameras under these poles
    const cameras = await mainQuery(`
      SELECT id FROM cameras
      WHERE pole_id IN (${poleIds.join(',')}) AND deleted_at IS NULL
    `);
    cameraIds = cameras.map(c => c.id);

    if (cameraIds.length > 0) {
      // Soft delete cameras
      await mainQuery(`
        UPDATE cameras
        SET deleted_at = ${now}
        WHERE id IN (${cameraIds.join(',')})
      `);
    }
  }

  return {
    zone: Number(id),
    poles: poleIds,
    cameras: cameraIds,
  };
};



exports.restoreZone = async (id) => {
  if (!id) return null;

  const updates = [`deleted_at=NULL`];

  const query = `
    UPDATE zones
    SET ${updates.join(', ')}
    WHERE id = ${Number(id)} AND deleted_at IS NOT NULL
  `;

  return mainQuery(query);
};

exports.getZonesByLocation = (locationId, perPage, offset) => {
  const query = `
    SELECT 
        z.id AS id,
        z.name AS name,
        z.coordinates AS coordinates,
        z.border_color AS border_color,
        z.fill_color AS fill_color,
        l.id AS location_id,
        l.name AS location_name,
        COUNT(p.id) AS poles_count,
        DATE_FORMAT(z.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(z.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM zones z
    JOIN locations l ON z.location_id = l.id
    LEFT JOIN poles p ON p.zone_id = z.id
    WHERE z.deleted_at IS NULL
      AND z.location_id = ${locationId}
    GROUP BY l.id, z.id
    ORDER BY l.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
  return mainQuery(query);
};

exports.getZonesCountByLocation = (locationId) => {
  const query = `
    SELECT COUNT(*) AS total 
    FROM zones 
    WHERE deleted_at IS NULL AND location_id = ${locationId};
  `;
  return mainQuery(query).then(result => result[0].total);
};
