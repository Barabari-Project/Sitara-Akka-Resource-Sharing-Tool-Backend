// routes/auth.ts
import { Router, Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import jwt from 'jsonwebtoken';
import expressAsyncHandler from 'express-async-handler';
import createHttpError from 'http-errors';
import { UserRoles } from '../middleware/auth.middleware';
import { WhatsappTemplateModel } from '../models/whatsappTemplate.model';
import { sendTextTemplateMsg } from '../utility/wp';

export const authRouter = Router();

// POST /register
authRouter.post('/register', expressAsyncHandler(async (req: Request, res: Response) => {

  const { phoneNumber, firstName, lastName, age, gender, std } = req.body;

  if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '' || phoneNumber.trim().length !== 10) {
    throw createHttpError(400, 'Phone number is required');
  }

  const user = await UserModel.create({
    phoneNumber: phoneNumber.trim(),
    firstName: firstName?.trim(),
    lastName: lastName?.trim(),
    age: age,
    gender: gender?.trim(),
    std: std?.trim(),
    role: UserRoles.USER
  });

  const token = jwt.sign({ phoneNumber: user.phoneNumber, role: user?.role }, process.env.JWT_SECRET!, {
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
    // user = await UserModel.create({ phoneNumber });
    isAlreadyPresent = false;
  }
  if (user) {
    const token = jwt.sign({ phoneNumber: user.phoneNumber, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: '7d'
    });
    res.status(200).json({ message: 'Login successful', token, user, isAlreadyPresent });
  }

  res.status(200).json({isAlreadyPresent });

}));


// POST /login
authRouter.post('/admin/login', expressAsyncHandler(async (req: Request, res: Response) => {

  const { phoneNumber, password } = req.body;

  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw createHttpError(400, 'Phone number is required');
  }

  let user = await UserModel.findOne({ phoneNumber, role: UserRoles.ADMIN, password: password });

  if (!user) {
    throw createHttpError(404, 'Invalid Credentials');
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
    questionAnswers
  } = req.body;

  //  Validations
  if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length !== 10) {
    throw createHttpError(400, 'Valid 10-digit phone number is required');
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

  // ✅ Check if questionAnswers is provided and valid
  let validQA: { question: number; ans: string }[] | undefined = undefined;
  if (Array.isArray(questionAnswers) && questionAnswers.length === 3) {
    for (const qa of questionAnswers) {
      if (
        typeof qa !== 'object' ||
        typeof qa.question !== 'number' ||
        typeof qa.ans !== 'string' ||
        qa.ans.trim() === ''
      ) {
        throw createHttpError(400, 'Each question answer must have a question number and a non-empty answer!');
      }
    }
    validQA = questionAnswers;
  }

  // ✅ Save or update user
  const user = await UserModel.findOneAndUpdate(
    { phoneNumber },
    {
      phoneNumber: phoneNumber.trim(),
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      gender: gender?.trim(),
      std: std?.trim(),
      schoolName: schoolName.trim(),
      district: district.trim(),
      medium: medium.trim(),
      role: UserRoles.USER,
      ...(validQA ? { questionAnswers: validQA } : {}) // only include if valid
    },
    { new: true, upsert: true }
  );

  // TODO: JASH: verify this are we getting std as string? if not then change this if condition accordingly
  if (std == "10") {
    console.log(std);
    sendTextTemplateMsg("91"+phoneNumber,"welcome_message_2025");
  }

  // ✅ Generate token
  const token = jwt.sign(
    { phoneNumber: user?.phoneNumber, role: user?.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.status(201).json({ message: 'User registered', user, token });
}));



export const getTemplatesByType = async (type: string): Promise<string | null> => {
  try {
    const template = await WhatsappTemplateModel.findOne({ type }).select('templateName -_id');
    return template?.templateName || null;
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
};


export const createTemplate = async () => {
  try {
    const newTemplate = await WhatsappTemplateModel.create({
      type: 'Other Std', // or 'sms', etc.
      templateName: 'WelcomeTemplate'
    });

    console.log('Template created successfully:', newTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
  }
};

// GET /me
authRouter.get('/get_user', expressAsyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createHttpError(401, 'Authorization token missing or invalid');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { phoneNumber: string, role: string };

    const user = await UserModel.findOne({ phoneNumber: decoded.phoneNumber }).select('-password');

    if (!user) {
      throw createHttpError(404, 'User not found');
    }

    res.status(200).json({ user });

  } catch (error) {
    console.error(error);
    throw createHttpError(401, 'Invalid or expired token');
  }
}));
