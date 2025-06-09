import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(
        `Error occurred during ${req.method} request to ${req.url} | Status: ${err.statusCode ?? 500} | Message: ${err.message ?? 'No error message'} | Stack: ${err.stack ?? 'No stack trace'}`
    );

    let statusCode = err.statusCode ?? 500;
    let message = err.statusCode ? err.message : 'Internal Server Error. Please try again later.'

    res.status(statusCode).json({ message });

};
