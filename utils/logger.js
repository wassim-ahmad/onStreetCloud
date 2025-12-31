// const { createLogger, transports, format } = require('winston');

// const logger = createLogger({
//   level: 'info',
//   format: format.combine(
//     format.timestamp(),
//     format.json(),               // logs as JSON (best for production)
//   ),
//   transports: [
//     new transports.File({ filename: 'logs/error.log', level: 'error' }),  
//     new transports.File({ filename: 'logs/combined.log' })               
//   ],
// });

// // Also log to console in dev mode
// if (process.env.NODE_ENV !== 'production') {
//   logger.add(
//     new transports.Console({
//       format: format.simple(),
//     })
//   );
// }

// module.exports = logger;


const { createLogger, transports, format } = require('winston');

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    success: 2,
    info: 3,
    http: 4,
    debug: 5,
  },
  // colors: {
  //   error: 'red',
  //   warn: 'yellow',
  //   success: 'green',
  //   info: 'blue',
  //   http: 'magenta',
  //   debug: 'white',
  // },
};

const logger = createLogger({
  levels: customLevels.levels,
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Console colors (dev mode)
// require('winston').addColors(customLevels.colors);

// if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(format.simple())
    })
  );
// }

module.exports = logger;

// users
// logger.success("User created successfully");
// logger.warn("Camera disconnected");
// logger.error("Login failed");
// logger.info("Server started");
// logger.debug("Payload received");
