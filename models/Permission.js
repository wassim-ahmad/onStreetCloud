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

exports.getPermissionsPaginate = (offset) => {
  const query = `
    SELECT
      p.id AS id,
      p.permission_name AS permission_name,
      p.permission_key AS permission_key,
      p.description AS description,
      p.note AS note,
      p.isRead AS isRead,
      DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM permissions p
    ORDER BY p.id DESC
    LIMIT 20 OFFSET ${offset};
  `;

  return mainQuery(query);
};

exports.getUserPermissionsWithStatus = (userId) => {
  const query = `
    SELECT 
      p.id, 
      p.name, 
      p.\`key\`, 
      p.description,
      CASE 
        WHEN up.user_id IS NOT NULL THEN TRUE 
        ELSE FALSE 
      END AS status
    FROM permissions p
    LEFT JOIN user_permissions up 
      ON up.permission_id = p.id 
      AND up.user_id = ${userId};
  `;

  return mainQuery(query);
};

exports.updateUserPermissions = async (user_id, permissions) => {
  if (!user_id) return null;

  // Start by deleting old permissions
  await mainQuery(`DELETE FROM user_permissions WHERE user_id = ${Number(user_id)}`);

  // If there are no permissions, stop here
  if (!permissions || permissions.length === 0) {
    return { user_id, permissions: [] };
  }

  // Build bulk insert query
  const values = permissions.map(pid => `(${Number(user_id)}, ${Number(pid)})`).join(', ');
  const query = `INSERT INTO user_permissions (user_id, permission_id) VALUES ${values}`;

  await mainQuery(query);

  return { user_id, permissions };
};



