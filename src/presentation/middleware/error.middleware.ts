import { NextFunction, Request, Response } from 'express';
import { logger } from '../../shared/logger.js';

export const globalErrorMiddleware = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    logger.error('Unhandled server error', {
        message: err.message,
        stack: err.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
};
