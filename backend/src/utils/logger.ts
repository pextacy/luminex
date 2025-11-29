import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.monitoring.logLevel,
  transport: config.env === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  base: {
    service: 'luminex-backend',
    env: config.env,
  },
});

// Create child loggers for different modules
export const createLogger = (module: string) => {
  return logger.child({ module });
};

// Specialized loggers
export const sdsLogger = createLogger('sds');
export const blockchainLogger = createLogger('blockchain');
export const apiLogger = createLogger('api');
export const reconciliationLogger = createLogger('reconciliation');
