import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

const loggingWinston = new LoggingWinston({ redirectToStdout: true });

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'http' : 'debug',
    transports: [loggingWinston],
});
