// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';
import expressAsyncHandler from 'express-async-handler';

export enum UserRoles {
    ADMIN = 'ADMIN',
    USER = 'USER'
}

export const authMiddleware = (allowedRoles: UserRoles[]) => expressAsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    if (!token) throw createHttpError(401, 'Token required');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { phoneNumber: string, role: UserRoles };
        if (!allowedRoles.includes(decoded.role)) {
            throw createHttpError(403, 'Unauthorized');
        }
        (req as any).phoneNumber = decoded.phoneNumber; // attach user info
        (req as any).role = decoded.role;
        next();
    } catch (err) {
        throw createHttpError(401, 'Invalid token');
    }
});

