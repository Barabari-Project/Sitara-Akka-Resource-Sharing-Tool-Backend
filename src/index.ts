import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/database';
import { createRouter } from './route/create.route';
import { getRouter } from './route/get.route';
import { authRouter } from './route/auth.route';
import { errorHandler } from './middleware/error.middleware';
import { authMiddleware, UserRoles } from './middleware/auth.middleware';

dotenv.config();

const app = express();


app.use(express.json());
const allowedOrigins = '*';

//   process.env.NODE_ENV === 'production'
//     ? '*' // PROD ENV
//     : '*'; // Allow all origins in DEV ENV

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
//   credentials: true // Allow cookies and Authorization headers, if any.
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

