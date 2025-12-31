const mysql = require("mysql2");
var config = require('./db_config');

// Create connection
const basicConnection = mysql.createConnection({
  host: config.connection.host,
  user: config.connection.user,
  password: config.connection.password,
  database: config.database,
});

basicConnection.connect((err) => {
  if (err) {
    console.error("Error connecting: " + err.stack);
    return;
  }
  console.log("Connected as ID " + basicConnection.threadId);
});

module.exports = {
  basicConnection,
};
