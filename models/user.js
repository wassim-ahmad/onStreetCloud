const pool = require('../config/dbConnection');
var bcrypt = require('bcrypt');

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


exports.findByUsername = async (username) => {
  const query = `
    SELECT 
      *
    FROM users
    WHERE username = '${username}'
    AND deleted_at IS NULL
    LIMIT 1;
  `;
  const result = await mainQuery(query);
  return result[0] || null;
};

exports.getActiveUsersWithViewNotificationPermission = async () => {
  const query = `
    SELECT 
      u.id AS user_id,
      u.username,
      u.designation,
      u.active,
      p.key,
      p.name
    FROM users u
    JOIN user_permissions up ON up.user_id = u.id
    JOIN permissions p ON p.id = up.permission_id
    WHERE 
      u.active = 1
      AND p.key = 'view_notification';
  `;
  return await mainQuery(query);
};

exports.getUserPermissionsWithStatus = async (userId) => {
  const query = `
    SELECT 
      p.id,
      p.name,
      p.key,
      p.description,
      CASE 
        WHEN up.permission_id IS NOT NULL THEN TRUE 
        ELSE FALSE 
      END AS status
    FROM permissions p
    LEFT JOIN user_permissions up 
      ON up.permission_id = p.id 
      AND up.user_id = ${Number(userId)}
    ORDER BY p.id ASC;
  `;
  const result = await mainQuery(query);
  return result;
};

exports.getUsersTotalCount = async () => {
  const query = 'SELECT COUNT(*) AS totalCount FROM users WHERE deleted_at IS NULL';
  const result = await mainQuery(query);
  return result[0]?.totalCount || 0;
};

exports.getUsersPaginate = (perPage, offset) => {
  const query = `
    SELECT
      u.id AS id,
      u.username AS username,
      u.designation AS designation,
      DATE_FORMAT(u.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(u.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM users u
    WHERE u.deleted_at IS NULL
    ORDER BY u.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
  return mainQuery(query);
};

exports.getUserById = (userId) => {
  const query = `
    SELECT 
      u.id,
      u.username,
      u.designation,
      DATE_FORMAT(u.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(u.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM users u
    WHERE u.id = ${Number(userId)} AND u.deleted_at IS NULL
    LIMIT 1;
  `;
  return mainQuery(query);
};

exports.createUser = async (data) => {
  const { username, password, designation } = data;
  const pass = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO users (username, password, designation)
    VALUES (
      '${username}',
      '${pass}',
      '${designation ? designation : 'user'}'
    );
  `;

  return mainQuery(query);
};

exports.updateUser = async (id, data) => {
  const { username, password, designation } = data;

  const updates = [];

  if (username) updates.push(`username='${username}'`);
  if (password && password.trim() !== "") {
    const pass = await bcrypt.hash(password, 10);
    updates.push(`password='${pass}'`);
  }
  if (designation) updates.push(`designation='${designation}'`);

  // nothing to update
  if (updates.length === 0) return null;

  const query = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = ${Number(id)} AND deleted_at IS NULL
  `;

  return mainQuery(query);
};

exports.softDeleteUser = async (id) => {
  if (!id) return null;

  const now = `NOW()`;

  // Optionally: handle related data, e.g., user_permissions
  const userPermissions = await mainQuery(`
    SELECT id FROM user_permissions
    WHERE user_id = ${Number(id)}
  `);
  const permissionIds = userPermissions.map(p => p.id);

  // Soft delete the user
  await mainQuery(`
    UPDATE users
    SET deleted_at = ${now}
    WHERE id = ${Number(id)} AND deleted_at IS NULL
  `);

  // Soft delete related user_permissions if any
  if (permissionIds.length > 0) {
    await mainQuery(`
      UPDATE user_permissions
      SET deleted_at = ${now}
      WHERE id IN (${permissionIds.join(',')})
    `);
  }

  return {
    user: Number(id),
    permissions: permissionIds
  };
};

exports.restoreUser = async (id) => {
  if (!id) return null;

  const updates = [`deleted_at = NULL`];

  const query = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = ${Number(id)} AND deleted_at IS NOT NULL
  `;

  return mainQuery(query);
};










// exports.getAllUsers = async () => {

// }

// exports.create = async (data,done) => {
//   console.log(data.username)
//   // var con = connectDB;
//   // var check_user_exsit = con.execute('SELECT * FROM users WHERE username = ?',[data.username],(err,rows) =>{
//   //   if(err)
//   //     return done(err);
//   //   if(rows.length){
//   //     console.log('length',rows.length);
//   //   }
//   //   console.log(err , rows)
//   // });
//   const insertQuery = `
//     INSERT INTO users (username, password, active, designation) 
//     VALUES (?, ?, ?, ?)
//   `;
//   const hashed = await bcrypt.hash(data.password, 10);
//   var user = await mainQuery(insertQuery, [
//     data.username,
//     hashed,
//     data.active,
//     data.designation,
//   ]);
//   return result.insertId;
// };


// module.exports = {
//   async findByUsername(username) {
//     const db = await connectDB();
//     const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
//     await db.end();
//     return rows[0];
//   },

//   async create(data){
//     console.log('****************************',
//       data.password
//       ,
//       '****************************');
//     // var con = connectDB;
//     // var check_user_exsit = con.execute('SELECT * FROM users WHERE username = ?',[data.username],(err,rows) =>{
//     //   if(err)
//     //     return done(err);
//     //   if(rows.length){
//     //     console.log('length',rows.length);
//     //   }
//     //   console.log(err , rows)
//     // });
//     const insertQuery = `
//       INSERT INTO users (username, password, active, designation) 
//       VALUES (?, ?, ?, ?)
//     `;
//     const hashed = await bcrypt.hash(data.password, 10);
//     var user = await mainQuery(insertQuery, [
//       data.username,
//       hashed,
//       data.active,
//       data.designation,
//     ]);
//     return user.insertId;
//   }

//   // async createUser(username, password) {
//   //   const db = await connectDB();
//   //   const hashed = await bcrypt.hash(password, 10);
//   //   const [result] = await db.execute(
//   //     'INSERT INTO users (username, password) VALUES (?, ?)',
//   //     [username, hashed]
//   //   );
//   //   await db.end();
//   //   return result.insertId;
//   // }
// };