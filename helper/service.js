const connection = require('../config/dbConnection');

function getSetting(key) {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT value FROM settings WHERE `key` = ? LIMIT 1',
      [key],
      (err, results) => {2
        if (err) return reject(err);
        if (!results.length) return resolve(null);
        resolve(JSON.parse(results[0].value));
      }
    );
  });
}

module.exports = { getSetting };
