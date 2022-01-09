import winston, { format, transports } from 'winston';
import options from './config/options.json';

namespace LogFactory {
  const defaultLogConfig = {
    levels: {
      error: 0,
      transaction: 1,
      warn: 2,
      info: 3,
      debug: 4,
    },
    colors: {
      error: 'red',
      transaction: 'green',
      warn: 'yellow',
      info: 'black',
      debug: 'grey',
      order: 'cyan',
      balance: 'cyan',
    },
  };

  const logFormat = format.combine(
    format.splat(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf((info) => {
      return `${info.timestamp} ${info.level.toUpperCase()} [${info.name}]: ${info.message}`;
    }),
  );

  const consoleFormat = format.combine(logFormat, format.colorize({ all: true, colors: defaultLogConfig.colors }));

  const logger = winston.createLogger({
    levels: defaultLogConfig.levels,
    level: options.logLevel,
    format: logFormat,
    transports: [
      new transports.Console({ format: consoleFormat }),
      new transports.File({ filename: 'logs/server.log' }),
      new transports.File({
        level: 'transaction',
        filename: 'logs/transaction.log',
      }),
      new transports.File({
        level: 'error',
        filename: 'logs/error.log',
      }),
    ],
  });

  export function createLogger(moduleName: string) {
    return logger.child({ name: moduleName });
  }

  export const orderBookLog = winston.createLogger({
    levels: { info: 1 },
    level: 'info',
    format: logFormat,
    transports: [
      new transports.Console({ format: consoleFormat }),
      new transports.File({ filename: 'logs/orderBook.log' }),
    ],
    defaultMeta: { name: 'ORDER' },
  });

  export const balanceLog = winston.createLogger({
    levels: { info: 1 },
    level: 'info',
    format: logFormat,
    transports: [
      new transports.Console({ format: consoleFormat }),
      new transports.File({ filename: 'logs/balance.log' }),
    ],
    defaultMeta: { name: 'BALANCE' },
  });
}

export default LogFactory;
