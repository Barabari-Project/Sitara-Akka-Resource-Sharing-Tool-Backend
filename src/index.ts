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
app.use(cors({
    origin: '*',
}));
connectToDatabase();
app.get('/gh', (req, res) => {
    res.send('Hello World');
});
app.use('/api', getRouter);
app.use('/api', authRouter);
app.use('/api', authMiddleware([UserRoles.ADMIN]), createRouter);

app.use(errorHandler);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});

