import winston, { format } from 'winston';

const winstonConfig = {
  levels: {
    error: 0,
    transaction: 1,
    info: 2,
    debug: 3,
  },
  colors: {
    error: 'red',
    transaction: 'yellow',
    info: 'yellow',
    debug: 'grey',
  },
};

export const logger: any = winston.createLogger({
  levels: winstonConfig.levels,
  format: format.combine(
    winston.format.splat(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf((info) => {
      return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
    }),
    //   format.colorize({ all: true, colors: winstonConfig.colors }),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/server.log' }),
    new winston.transports.File({
      level: 'transaction',
      filename: 'logs/transaction.log',
    }),
    new winston.transports.File({
      level: 'error',
      filename: 'logs/error.log',
    }),
  ],
});
