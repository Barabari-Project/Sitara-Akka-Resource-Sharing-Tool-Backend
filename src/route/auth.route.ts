// routes/auth.ts
import { Router, Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import jwt from 'jsonwebtoken';
import expressAsyncHandler from 'express-async-handler';
import createHttpError from 'http-errors';
import { UserRoles } from '../middleware/auth.middleware';

export const authRouter = Router();

// POST /register
authRouter.post('/register', expressAsyncHandler(async (req: Request, res: Response) => {

    const { phoneNumber, firstName, lastName, age, gender, std } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '' || phoneNumber.trim().length !== 10) {
        throw createHttpError(400, 'Phone number is required');
    }

    const existingUser = await UserModel.findOne({ phoneNumber });
    if (existingUser) {
        throw createHttpError(409, 'User with this phone number already exists');
    }

    const user = new UserModel({
        phoneNumber: phoneNumber.trim(),
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        age,
        role: UserRoles.USER,
        gender: gender?.trim(),
        std: std?.trim()
    });

    await user.save();
    res.status(201).json({ message: 'User registered', user });

}));

// POST /login
authRouter.post('/login', expressAsyncHandler(async (req: Request, res: Response) => {

    const { phoneNumber } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw createHttpError(400, 'Phone number is required');
    }

    const user = await UserModel.findOne({ phoneNumber });
    if (!user) {
        throw createHttpError(404, 'User not found');
    }

    const token = jwt.sign({ phoneNumber: user.phoneNumber, role: user.role }, process.env.JWT_SECRET!, {
        expiresIn: '7d'
    });

    res.status(200).json({ message: 'Login successful', token });

}));