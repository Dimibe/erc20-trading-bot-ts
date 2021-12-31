import winston, { format, Logger } from 'winston';

const defaultLogConfig = {
  levels: {
    error: 0,
    transaction: 1,
    info: 2,
    debug: 3,
  },
};

const logFormat = format.combine(
  winston.format.splat(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf((info) => {
    return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
  }),
);

export const logger: any = winston.createLogger({
  levels: defaultLogConfig.levels,
  format: logFormat,
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

export const orderBook: any = winston.createLogger({
  levels: { order: 1 },
  level: 'order',
  format: logFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/orderBook.log' }),
  ],
});
