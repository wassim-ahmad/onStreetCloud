const pool = require('../config/dbConnection');

// async function mainQuery(query, params = []) {
//   const db = await connectDB();
//   const [rows] = await db.execute(query, params);
//   return rows;
// }

async function mainQuery(query, params = []) {
  const [rows] = await pool.query(query, params);
  return rows;
}


exports.userHasPermission = async (user_id, permission_key) => {
  const query = `
    SELECT p.key 
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = ? AND p.key = ?
    LIMIT 1;
  `;

  const result = await mainQuery(query, [user_id, permission_key]);
  return result.length > 0;
};
