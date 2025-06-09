// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    if (!token) throw createHttpError(401, 'Token required');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { phoneNumber: string };
        (req as any).user = decoded; // attach user info
        next();
    } catch (err) {
        throw createHttpError(401, 'Invalid token');
    }
};
