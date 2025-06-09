import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/database';
import { createRouter } from './route/create.route';
import { getRouter } from './route/get.route';
import { authRouter } from './route/auth.route';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();


app.use(express.json());
app.use(cors());
connectToDatabase();

app.use('/api', createRouter);
app.use('/api', getRouter);
app.use('/api', authRouter);

app.use(errorHandler);

app.listen(3001, () => {
    console.log('Server is running on port 3001');
});

