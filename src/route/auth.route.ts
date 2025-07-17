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


// POST /login
authRouter.post('/admin/login', expressAsyncHandler(async (req: Request, res: Response) => {

    const { phoneNumber } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw createHttpError(400, 'Phone number is required !');
    }

    let user = await UserModel.findOne({ phoneNumber, role: UserRoles.ADMIN });
    let isAlreadyPresent = true;

    if (!user) {
        throw createHttpError(404, 'User not found');
    }

    const token = jwt.sign({ phoneNumber: user.phoneNumber, role: user.role }, process.env.JWT_SECRET!, {
        expiresIn: '7d'
    });

    res.status(200).json({ message: 'Login successful', token, user });

}));

authRouter.post("/new_form", expressAsyncHandler(async (req: Request, res: Response) => {
  const {
    firstName,
    lastName,
    schoolName,
    district,
    medium,
    gender,
    phoneNumber,
    std,
    is10th,
    questionAnswers 
  } = req.body;

  //Validation
  if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '' || phoneNumber.trim().length !== 10) {
    throw createHttpError(400, 'Phone number is required');
  }

  if (!schoolName || typeof schoolName !== 'string' || schoolName.trim() === '') {
    throw createHttpError(400, 'School Name is required');
  }

  if (!district || typeof district !== 'string' || district.trim() === '') {
    throw createHttpError(400, 'District is required');
  }

  if (!medium || typeof medium !== 'string' || medium.trim() === '') {
    throw createHttpError(400, 'Medium is required');
  }

  // Not in 10th then Question and Answer included
  if (!is10th) {
    if (!Array.isArray(questionAnswers) || questionAnswers.length !== 3) {
      throw createHttpError(400, 'Three question answers are required if not 10th standard');
    }

    for (const qa of questionAnswers) {
      if (
        typeof qa !== 'object' ||
        typeof qa.question !== 'number' ||
        typeof qa.ans !== 'string' ||
        qa.ans.trim() === ''
      ) {
        throw createHttpError(400, 'Each question answer must have a question number and a non-empty answer !');
      }
    }
  }

  const user = await UserModel.findOneAndUpdate(
    { phoneNumber },
    {
      phoneNumber: phoneNumber.trim(),
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      gender: gender?.trim(),
      std: std?.trim(),
      schoolName: schoolName?.trim(),
      district: district?.trim(),
      medium: medium?.trim(),
      role: UserRoles.USER,
      ...(is10th ? {} : { questionAnswers }) 
    },
    { new: true, upsert: true }
  );

  const token = jwt.sign(
    { phoneNumber: user?.phoneNumber, role: user?.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.status(201).json({ message: 'User registered', user, token });
}));
