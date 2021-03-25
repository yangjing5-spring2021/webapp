const winston = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    // defaultMeta: { service: 'user-service' },
    transports: [
      // - Write all logs with level `debug` and below to `error.log`
      // - Write all logs with level `info` and below to `combined.log`
      //new winston.transports.File({ filename: './debug.log', level: 'debug' }),
      new winston.transports.File({ filename: '/home/ubuntu/webapp/logs/app.log' }),
    ],
  });

  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple(),
    }));
  }  

  module.exports = logger;