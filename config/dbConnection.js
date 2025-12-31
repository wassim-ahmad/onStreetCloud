const mysql = require('mysql2/promise');
const config = require('./db_config');

let pool;

if (!global.pool) {
  global.pool = mysql.createPool({
    host: config.connection.host,
    user: config.connection.user,
    password: config.connection.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

pool = global.pool;

module.exports = pool;





// work
// var connection = require('./db_config');
// const mysql = require('mysql2/promise');
// async function connectDB() {
//   return await mysql.createConnection({
//     host: connection.connection.host,
//     user: connection.connection.user,
//     password: connection.connection.password,
//     database: connection.database,
//   });
// }

// module.exports = connectDB;
//  work


// exports.connectDB = () =>{
//   console.log(connection.connection);
//   return mysql.createConnection(connection.connection);
// };


// basic connection
// const mysql = require('mysql2');

// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'OnStreetOSPCloud'
// });

// // Connect
// connection.connect((err) => {
//   if (err) {
//     console.error('Error connecting: ' + err.stack);
//     return;
//   }
//   console.log('Connected as ID ' + connection.threadId);
// });

// module.exports = connection;