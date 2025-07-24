import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectToDatabase } from './config/database';
import { authMiddleware, UserRoles } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import { authRouter } from './route/auth.route';
import { createRouter } from './route/create.route';
import { getRouter } from './route/get.route';

dotenv.config();

const app = express();


app.use(express.json());
const allowedOrigins = '*';

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
    if (!origin || allowedOrigins === '*') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Allow cookies and Authorization headers, if any.
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

connectToDatabase();

app.use('/sitara/api', getRouter);
app.use('/sitara/api', authRouter);
app.use('/sitara/api', authMiddleware([UserRoles.ADMIN]), createRouter);

app.use(errorHandler);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});