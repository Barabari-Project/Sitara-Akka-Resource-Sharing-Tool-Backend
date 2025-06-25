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

    const user = await UserModel.findOneAndUpdate({ phoneNumber }, {
        phoneNumber: phoneNumber.trim(),
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        age: age,
        gender: gender?.trim(),
        std: std?.trim(),
        role: UserRoles.USER
    }, { new: true });

    const token = jwt.sign({ phoneNumber: user?.phoneNumber, role: user?.role }, process.env.JWT_SECRET!, {
        expiresIn: '7d'
    });
    res.status(201).json({ message: 'User registered', user, token });

}));

// POST /login
authRouter.post('/login', expressAsyncHandler(async (req: Request, res: Response) => {

    const { phoneNumber } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw createHttpError(400, 'Phone number is required');
    }

    let user = await UserModel.findOne({ phoneNumber });
    let isAlreadyPresent = true;

    if (!user) {
        user = await UserModel.create({ phoneNumber });
        isAlreadyPresent = false;
    }

    const token = jwt.sign({ phoneNumber: user.phoneNumber, role: user.role }, process.env.JWT_SECRET!, {
        expiresIn: '7d'
    });

    res.status(200).json({ message: 'Login successful', token, user, isAlreadyPresent });

}));